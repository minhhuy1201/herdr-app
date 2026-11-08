// Read-only Markdown viewer: Preview mode with prose via TextView and fenced code via Editor.
import { View, div } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState, TextView } from "gpui-base";
import { props, readTextFile, theme, settings, nextCommand, watchFolder, exec, run, spaces, panes, machines, shared, setShared, window } from "herdr";
import { splitFences } from "./split.js";
import { resolveLink, opener } from "./links.js";
import { viewerTabs, prune, decide, bind } from "./viewer-tabs.js";

const LIMIT = 400000;

function syntax(t) {
  return { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6 };
}

export default class MdViewer extends View {
  init(_props, cx) {
    this.parts = [];
    this.message = "Loading file…";
    this.note = null;
    this.mode = "preview";
    this.text = "";
    this.source = null;
    this.closed = false;
    this.signature = null;
    this.load(cx);
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        if (command === "toggle") { this.setMode(this.mode === "preview" ? "source" : "preview"); cx.notify(); }
      }
    });
  }

  async close() {
    this.closed = true;
    this.releaseAll();
  }

  follow(url, cx) {
    const { file, on } = props() ?? {};
    const link = resolveLink(url, file);
    if (!link) return;
    if (link.web) {
      const { cmd, args } = opener(window().platform, link.web);
      exec(cmd, args).catch(() => {});
      return;
    }
    const target = { file: link.markdown, on: on ?? null };
    const choice = decide(shared("md-viewer.tabs"), target, spaces(), panes());
    if (choice.select) { run("tab.select", { id: choice.select }); return; }
    this.before = viewerTabs(spaces(), panes());
    this.openPending = target;
    run("tab.new", { name: link.markdown.split("/").pop(), mod: "md-viewer", props: target });
    // After tab.new this copy may stop rendering, so it polls until the new tab is bound.
    cx.spawn(async (cx) => {
      for (let i = 0; i < 40 && this.openPending && !this.closed; i++) {
        await cx.sleep(250);
        this.syncTabs();
      }
      this.openPending = null;
    });
  }

  // run() returns no tab id, so a new viewer tab is bound on a later render. Until every machine's
  // layout is ready, spaces() lacks its tabs and pruning would forget live viewers.
  syncTabs() {
    if (machines().some((m) => m.layout !== "ready")) return;
    const stored = shared("md-viewer.tabs") ?? {};
    const bound = bind(prune(stored, spaces(), panes()), this.openPending, this.before ?? [], spaces(), panes());
    this.openPending = bound.pending;
    if (JSON.stringify(bound.registry) !== JSON.stringify(stored)) setShared("md-viewer.tabs", bound.registry);
  }

  releaseAll() {
    for (const p of this.parts) p.state?.release();
    this.parts = [];
    this.source?.release();
    this.source = null;
  }

  setMode(mode) {
    if (this.message) return;
    this.mode = mode;
    if (mode === "source" && !this.source) {
      this.source = EditorState.new({
        language: "markdown", readonly: true, value: this.text, line_numbers: true, folding: false, soft_wrap: true,
        font_family: settings().font_family, font_size: 13, syntax: syntax(theme()),
      });
    }
  }

  load(cx) {
    const { file, on } = props() ?? {};
    if (!file) { this.message = "No file given"; return; }
    this.read(cx);
    this.watch(cx, file, on ?? null);
  }

  read(cx) {
    const { file, on } = props() ?? {};
    cx.spawn(async (cx) => {
      let text, signature;
      try {
        text = await readTextFile(file, { on: on ?? null });
        signature = text === null ? "\0missing" : text;
      } catch {
        signature = "\0unreadable";
      }
      if (this.closed || signature === this.signature) return;
      this.signature = signature;
      if (signature === "\0unreadable") this.fail("Cannot read this file (binary, too large, or unreadable)");
      else if (text === null) this.fail("This file is no longer available");
      else if (text.includes("\0")) this.fail("Binary file · no text preview");
      else {
        const cut = text.length > LIMIT;
        this.note = cut ? "File truncated at 400,000 characters" : null;
        this.build(cut ? text.slice(0, LIMIT) : text);
        this.message = null;
        if (this.mode === "source") this.setMode("source");
      }
      cx.notify();
    });
  }

  fail(message) {
    this.releaseAll();
    this.message = message;
  }

  // Local files follow the folder watch; remote files and rejected watches poll every 10 seconds.
  watch(cx, file, on) {
    const poll = (cx) => cx.timer.every(10000, (cx) => { if (!this.closed) this.read(cx); });
    if (on) return poll(cx);
    const dir = file.replace(/[\\/][^\\/]*$/, "") || "/";
    cx.spawn(async (cx) => {
      try {
        while (!this.closed) {
          const changed = await watchFolder(dir);
          if (this.closed) return;
          if (changed.some((p) => p === file || p === dir)) this.read(cx);
        }
      } catch {
        if (!this.closed) poll(cx);
      }
    });
  }

  build(text) {
    this.releaseAll();
    this.text = text;
    const t = theme();
    this.parts = splitFences(text).map((seg) => {
      if (seg.md !== undefined) return { md: seg.md };
      return {
        lines: seg.code.split("\n").length,
        state: EditorState.new({
          language: seg.lang || "txt", readonly: true, value: seg.code, line_numbers: false, folding: false,
          font_family: settings().font_family, font_size: 13, syntax: syntax(t),
        }),
      };
    });
  }

  segment(label, mode, t) {
    const active = this.mode === mode;
    return div().id(`md-mode-${mode}`).px(10).h(24).flex().items_center().rounded(4).text_size(12)
      .cursor_pointer()
      .when(active, (el) => el.bg(t.selected)).text_color(active ? t.accent : t.muted)
      .hover((s) => s.bg(active ? t.selected : t.hover).text_color(active ? t.accent : t.foreground))
      .on_click((_e, cx) => { this.setMode(mode); cx.notify(); })
      .child(label);
  }

  render() {
    this.syncTabs();
    const t = theme(), file = props()?.file ?? "";
    const showSource = this.mode === "source" && this.source && !this.message;
    const body = showSource ? null : this.message
      ? div().p(24).text_color(t.dim).child(this.message)
      : v_flex().w_full().max_w(860).mx_auto().px(40).py(32).gap(12)
          .font_family("Inter").text_size(15).line_height(1.6)
          .children(this.parts.map((p, i) => p.state
            ? v_flex().flex_none().rounded(6).bg(t.surface).border(1).border_color(t.border).p(12)
                .h(p.lines * 22 + 28).child(Editor.new(p.state).size_full())
            : TextView.markdown(`md${i}`, p.md).selectable(true).on_link_click((url, cx) => this.follow(url, cx))))
          .when(Boolean(this.note), (el) => el.child(div().text_size(12).text_color(t.dim).child(this.note)));
    return v_flex().id("md-viewer").size_full().min_h(0).bg(t.background).text_color(t.foreground)
      .child(h_flex().h(36).flex_none().px(16).items_center().border_b(1).border_color(t.border)
        .child(div().font_semibold().truncate().flex_1().child(file.split(/[\\/]/).pop()))
        .child(h_flex().flex_none().gap(2).p(2).rounded(6).border(1).border_color(t.border)
          .child(this.segment("Preview", "preview", t)).child(this.segment("Source", "source", t))))
      .child(showSource
        ? v_flex().flex_1().min_h(0).p(8).child(Editor.new(this.source).size_full())
        : v_flex().id("md-scroll").flex_1().min_h(0).overflow_y_scrollbar().child(body));
  }
}
