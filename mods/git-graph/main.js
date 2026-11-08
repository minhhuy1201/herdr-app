// Git Graph: the history of the focused terminal's repository as coloured lanes.
// Read only. graph/model.js builds the lanes, graph/reads.js runs Git, views/ draws.
import { View, div } from "gpui-kit";
import { v_flex, Scrollbar, v_virtual_list } from "gpui-base";
import { exec, spaces, panes, focused, layout, watchFolder, shared, appHome, readTextFile, openOverlay } from "herdr";
import { READ_ONLY, PAGE_SIZE, readRoot, readGitDirs, readGraph, joinPages, refsChanged, readCommitDetail, readRepoName } from "./graph/reads.js";
import { flatten } from "./graph/detail.js";
import { pickLocation, modVisible } from "./graph/location.js";
import { Panel, PanelHeader, IconButton, Message, Icon } from "./views/ui.js";
import { commitRow } from "./views/graph-row.js";
import { detailRow } from "./views/detail-row.js";

const CONTEXT_POLL_MS = 300; // in-memory comparison only, runs no Git
const REMOTE_POLL_MS = 10000; // a remote repository can't be watched
const LOAD_AHEAD = 8; // rows from the end of the list that trigger the next page
const SCOPE_KEY = "scope";
const CHAR_WIDTH = 7.5; // px per character of the wrapped message: a 12px monospace cell is 7.2
const GUTTER = 70; // lanes and padding left of the message
const EMPTY = { rows: [], laneCount: 0, state: null, done: false };

function savedScope() {
  try {
    return localStorage.getItem(SCOPE_KEY) === "head" ? "head" : "all";
  } catch {
    return "all";
  }
}

const LIST_ID = "git-graph-rows";

// The focused terminal's folder and machine (or the repository behind a diff tab).
function activeLocation() {
  return pickLocation({
    space: spaces().find((s) => s.active),
    panes: panes(),
    focusedCwd: focused()?.cwd,
    diffTabs: shared("better-changes.diff-tabs"),
  });
}

const onScreen = () => modVisible(layout(), "git-graph");

export default class GitGraph extends View {
  init(_props, cx) {
    this.context = null;
    this.scope = savedScope();
    this.graph = EMPTY;
    this.error = null;
    this.moreError = null; // a later page failed: the rows stay, the message shows below
    this.loading = false;
    this.again = false; // a reload was asked for while one ran
    this.loaded = false;
    this.root = null;
    this.repoName = null;
    this.watchId = 0;
    this.watching = null;
    this.expanded = null; // hash of the one expanded commit
    this.detail = null; // { hash, state, meta, files, error } for it
    this.detailToken = 0;
    this.selectedFile = null; // { hash, index }
    this.items = new Map();
    this.width = 320;
    this.hasReview = false;
    cx.spawn(async () => {
      try {
        this.hasReview = (await readTextFile(`${appHome()}/mods/diff-review/mod.json`)) !== null;
      } catch {}
    });
    this.visible = onScreen();
    this.stale = false; // something changed while the panel was hidden
    cx.timer.every(CONTEXT_POLL_MS, (cx) => {
      const visible = onScreen();
      const wasHidden = !this.visible;
      this.visible = visible;
      if (!visible) return;
      if (wasHidden && this.stale) return this.refresh(cx);
      if (JSON.stringify(activeLocation()) !== this.context) this.refresh(cx);
    });
    // Local repositories are watched; only a remote one needs polling.
    cx.timer.every(REMOTE_POLL_MS, (cx) => {
      if (this.root && activeLocation().on) this.refresh(cx);
    });
    this.refresh(cx);
  }

  // Reload what is shown (at least one page), keeping the rows on screen until the new ones arrive.
  refresh(cx) {
    if (!onScreen()) {
      this.visible = false;
      this.stale = true;
      return;
    }
    this.stale = false;
    this.visible = true;
    if (this.loading) {
      this.again = true;
      return;
    }
    const location = activeLocation();
    const context = JSON.stringify(location);
    if (context !== this.context) {
      this.context = context;
      this.graph = EMPTY;
      this.error = null;
      this.loaded = false;
      this.root = null;
      this.repoName = null;
      this.moreError = null;
      // Loops watching the old repository end at their next event.
      this.watchId++;
      this.watching = null;
      this.collapse();
    }
    if (!location.cwd) return;

    this.run(cx, context, async (git, taskCx) => {
      const root = await readRoot(git);
      if (!root) {
        this.root = null;
        this.repoName = null;
        this.error = "Not a Git repository";
        this.graph = EMPTY;
        return;
      }
      this.root = root;
      const rootGit = (args) => git(args, root);
      // The name only changes with the root, and a context change resets it.
      this.repoName ??= await readRepoName(rootGit, root);
      this.watch(taskCx, rootGit, location.on);
      this.graph = await readGraph(rootGit, {
        count: Math.max(PAGE_SIZE, this.graph.rows.length),
        scope: this.scope,
      });
      this.error = null;
      this.moreError = null;
      this.loaded = true;
    });
  }

  collapse() {
    this.expanded = null;
    this.detail = null;
    this.selectedFile = null;
    this.detailToken++;
  }

  // A click on a commit row expands it; a second click collapses it. One at a time.
  toggleCommit(hash, cx) {
    if (this.expanded === hash) {
      this.collapse();
      cx.notify();
      return;
    }
    this.collapse();
    this.expanded = hash;
    this.detail = { hash, state: "loading" };
    const token = this.detailToken;
    const context = this.context;
    const root = this.root;
    cx.notify();
    if (!root || !context) return;
    const location = JSON.parse(context);
    cx.spawn(async (cx) => {
      let next;
      try {
        const git = (args) => exec("git", [...READ_ONLY, ...args], { cwd: root, on: location.on });
        next = { hash, state: "ready", ...(await readCommitDetail(git, hash)) };
      } catch (error) {
        next = { hash, state: "error", error: error.message };
      }
      // Dropped when another commit was expanded, the commit collapsed, or the repository changed.
      if (token !== this.detailToken || context !== this.context) return;
      this.detail = next;
      cx.notify();
    });
  }

  openDiff(hash, index, cx) {
    const file = this.detail?.hash === hash ? this.detail.files?.[index] : null;
    this.selectedFile = { hash, index };
    cx.notify();
    if (!file || !this.root || !this.hasReview) return;
    openOverlay({
      mod: "diff-review",
      kind: "dialog",
      width: 0.88,
      height: 0.86,
      frame: "none",
      props: { kind: "commit", root: this.root, on: JSON.parse(this.context).on, hash, path: file.path },
    });
  }

  onItem(key, cx) {
    const item = this.items.get(key);
    if (!item) return;
    if (item.kind === "commit") return this.toggleCommit(key, cx);
    if (item.kind === "hash") return cx.write_to_clipboard(item.hash);
    if (item.kind === "file") return this.openDiff(item.hash, Number(key.split(":").pop()), cx);
  }

  loadMore(cx) {
    if (this.loading || this.moreError || this.graph.done || !this.root || !this.graph.rows.length) return;
    const context = this.context;
    const prior = this.graph;
    this.run(cx, context, async (git) => {
      try {
        const page = await readGraph((args) => git(args, this.root), {
          skip: prior.rows.length,
          scope: this.scope,
          prior,
        });
        this.graph = joinPages(prior, page);
      } catch (error) {
        this.moreError = error.message;
      }
    });
  }

  // One Git job at a time; a result for a repository the person has left is dropped.
  run(cx, context, job) {
    this.loading = true;
    cx.notify();
    const location = JSON.parse(context);
    cx.spawn(async (cx) => {
      try {
        const git = (args, cwd = location.cwd) =>
          exec("git", [...READ_ONLY, ...args], { cwd, on: location.on });
        const before = this.graph;
        await job(git, cx);
        if (context !== JSON.stringify(activeLocation())) this.graph = before;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
        cx.notify();
        const moved = JSON.stringify(activeLocation()) !== this.context;
        if (this.again || moved) {
          this.again = false;
          this.refresh(cx);
        }
      }
    });
  }

  // Reload when a ref or HEAD moves in this repository, from any terminal.
  watch(cx, git, machine) {
    if (machine) return;
    cx.spawn(async (cx) => {
      const dirs = await readGitDirs(git);
      if (!dirs) return;
      const key = `${dirs.gitDir}|${dirs.commonDir}`;
      if (key === this.watching) return;
      this.watching = key;
      const id = ++this.watchId;
      for (const dir of new Set([dirs.gitDir, dirs.commonDir])) {
        cx.spawn(async (cx) => {
          try {
            for (;;) {
              const paths = await watchFolder(dir);
              if (id !== this.watchId) return;
              if (refsChanged(dir, paths)) this.refresh(cx);
            }
          } catch {
            // Too many folders to watch: the context change or the refresh button still reload.
          }
        });
      }
    });
  }

  toggleScope(cx) {
    this.scope = this.scope === "all" ? "head" : "all";
    try {
      localStorage.setItem(SCOPE_KEY, this.scope);
    } catch {}
    this.graph = EMPTY;
    this.loaded = false;
    this.refresh(cx);
  }

  header() {
    const all = this.scope === "all";
    return PanelHeader()
      .child(Icon("git-branch", 15))
      .child(div().flex_1().min_w(0).truncate().font_semibold().child(this.repoName ?? "Git Graph"))
      .child(
        IconButton({
          id: "git-graph-scope",
          icon: all ? "layers" : "git-commit",
          label: all ? "Showing all branches - click for the current branch only" : "Showing the current branch only - click for all branches",
          active: !all,
          onClick: (cx) => this.toggleScope(cx),
        }),
      )
      .child(
        IconButton({
          id: "git-graph-refresh",
          icon: "refresh",
          label: "Refresh",
          spinning: this.loading,
          onClick: (cx) => this.refresh(cx),
        }),
      );
  }

  body() {
    if (this.error) return Message(this.error, this.error !== "Not a Git repository");
    const { rows, laneCount } = this.graph;
    if (!rows.length) return Message(this.loaded ? "No commits yet" : "Loading history…");
    const chars = Math.floor((this.width - GUTTER - laneCount * 14) / CHAR_WIDTH);
    const items = flatten(rows, this.expanded, this.detail, chars);
    this.items = new Map(items.map((item) => [item.key, item]));
    const sel = this.selectedFile;
    const list = div()
      .id("git-graph-body")
      .flex_1()
      .min_h(0)
      .relative()
      .on_size_change((size, cx) => {
        if (Math.abs(size.width - this.width) < 1) return;
        this.width = size.width;
        cx.notify();
      })
      .child(
        v_virtual_list(
          LIST_ID,
          items.length,
          items.map((item) => item.height),
          (i) => items[i].key,
          (range, cx) => {
            if (range.end >= items.length - LOAD_AHEAD) this.loadMore(cx);
            return items.slice(range.start, range.end).map((item) =>
              item.kind === "commit"
                ? commitRow(item.row, laneCount, `item-${item.key}`, item.key === this.expanded)
                : detailRow(
                    item,
                    laneCount,
                    `item-${item.key}`,
                    item.kind === "file" && sel?.hash === item.hash && `file:${sel.hash}:${sel.index}` === item.key,
                  ),
            );
          },
        )
          .size_full()
          .on_item_click((key, cx) => this.onItem(key, cx)),
      )
      .child(Scrollbar.vertical(LIST_ID).viewport_from_layout().absolute().inset_0());
    if (!this.moreError) return list;
    return v_flex().flex_1().min_h(0).child(list).child(Message(`Could not load more: ${this.moreError}`, true));
  }

  render() {
    return Panel({ id: "git-graph" }).child(this.header()).child(v_flex().flex_1().min_h(0).child(this.body()));
  }
}
