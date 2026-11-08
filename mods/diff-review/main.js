// Review dialog: a flat, read-only side-by-side diff. Opened with openOverlay by Better
// Changes and the Git Graph. Props: { kind: "working", root, on, path, scope: "staged" | "unstaged" | "untracked" }
// { kind: "commit", root, on, hash, path } or { kind: "range", root, on, base, path }.
import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState } from "gpui-base";
import { exec, props, readTextFile, settings, theme } from "herdr";
import { READ_ONLY, readWorkingChange, readCommitFiles, readCommitFile, readRangeFile } from "./diff/reads.js";
import { filterFiles, stepPath } from "./diff/list.js";
import { statusOf } from "./diff/status.js";
import { Header, CommitHeader, Message } from "./views/chrome.js";
import { fileList } from "./views/file-list.js";
import { diffBody, widthOf } from "./views/side-by-side.js";

// The overlay may not hold the keyboard on its first frame, so focus is asked again.
const FOCUS_RETRY_MS = 400;
// Sideways scrolling stops while this much of the longest line is still in view.
const MIN_VISIBLE_PX = 240;

export default class ReviewDialog extends View {
  init(_props, cx) {
    const p = props();
    this.kind = ["commit", "range"].includes(p?.kind) ? p.kind : "working";
    this.path = p?.path ?? "";
    this.scope = p?.scope;
    this.hash = p?.hash ?? "";
    this.subject = "";
    this.files = [];
    this.state = { type: "loading" };
    this.offset = 0;
    this.width = 300;
    this.token = 0;
    this.handle = cx.focus_handle();
    this.query = "";
    if (this.kind === "commit") {
      this.input = InputState.new({ placeholder: "Search files" });
      this.input.on("change", (_e, cx) => {
        this.query = this.input.value();
        cx.notify();
      });
      this.input.focus();
      cx.timer.after(FOCUS_RETRY_MS, () => this.input.focus());
    }
    if (!p?.root) return;
    const git = (args) => exec("git", [...READ_ONLY, ...args], { cwd: p.root, on: p.on });
    if (this.kind === "commit") return this.openCommit(cx, git);
    if (this.kind === "range") return this.load(cx, () => readRangeFile(git, p.base, p.path));
    this.load(cx, () => readWorkingChange({
      git,
      readText: (rel) => readTextFile(`${p.root}/${rel}`, { on: p.on }),
      path: p.path,
      scope: p.scope,
    }));
  }

  load(cx, read) {
    const token = ++this.token;
    this.state = { type: "loading" };
    cx.spawn(async (cx) => {
      let next;
      try {
        next = await read();
      } catch (error) {
        next = { type: "error", message: error.message };
      }
      if (token !== this.token) return;
      this.width = widthOf(next);
      this.offset = 0;
      this.state = next;
      cx.notify();
    });
  }

  openCommit(cx, git) {
    cx.spawn(async (cx) => {
      try {
        const { subject, files } = await readCommitFiles(git, this.hash);
        this.subject = subject;
        this.files = files;
      } catch (error) {
        this.state = { type: "error", message: error.message };
        cx.notify();
        return;
      }
      this.git = git;
      cx.notify();
      this.select(this.path || files[0]?.path, cx, git);
    });
  }

  select(path, cx, git = this.git) {
    if (!path) return;
    this.git = git;
    this.path = path;
    this.load(cx, () => readCommitFile(git, this.hash, path));
    cx.notify();
  }

  onKey(e, cx) {
    if (this.kind !== "commit") return;
    const delta = e.key === "down" ? 1 : e.key === "up" ? -1 : 0;
    if (!delta) return;
    const next = stepPath(filterFiles(this.files, this.query), this.path, delta);
    cx.stop_propagation();
    if (next && next !== this.path) this.select(next, cx);
  }

  scrollSideways(e, cx) {
    const delta = e.delta.x || (e.modifiers?.shift ? e.delta.y : 0);
    if (!delta) return;
    const furthest = Math.max(0, this.width - MIN_VISIBLE_PX);
    this.offset = Math.max(0, Math.min(furthest, this.offset - delta));
    cx.stop_propagation();
    cx.notify();
  }

  render() {
    const t = theme();
    const font = settings().font_family ?? "JetBrains Mono";
    return v_flex()
      .id("review-dialog")
      .track_focus(this.handle)
      .on_key_down((e, cx) => this.onKey(e, cx))
      .size_full()
      .overflow_hidden()
      .bg(t.background)
      .border(1)
      .border_color(t.border)
      .text_color(t.foreground)
      .text_size(12)
      .child(this.kind === "commit" ? CommitHeader(this.hash, this.subject, this.files.length) : Header(this.path, statusOf(this.state, this.scope)))
      .child(this.kind === "commit" ? this.commitBody(font) : this.body(font));
  }

  commitBody(font) {
    if (!this.files.length) return this.body(font);
    return h_flex()
      .flex_1()
      .min_h(0)
      .child(fileList({
        files: filterFiles(this.files, this.query),
        selected: this.path,
        input: this.input,
        onPick: (path, cx) => {
          this.select(path, cx);
          this.input.focus();
        },
      }))
      .child(v_flex().flex_1().min_w(0).min_h(0).h_full().child(this.body(font)));
  }

  body(font) {
    const s = this.state;
    if (s.type === "loading") return Message("Loading diff…");
    if (s.type === "error") return Message(s.message, true);
    if (s.type === "binary") return Message("Binary file");
    if (s.type === "mode") return Message(s.note);
    if (s.type === "empty") return Message("No changes to show");
    return diffBody({
      rows: s.rows,
      truncated: s.truncated,
      offset: this.offset,
      width: this.width,
      font,
      onScroll: (e, cx) => this.scrollSideways(e, cx),
    });
  }
}
