// Read-only Markdown viewer: Preview mode with prose via TextView and fenced code via Editor.
import { View, div } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState, TextView } from "gpui-base";
import { props, readTextFile, theme, settings } from "herdr";
import { splitFences } from "./split.js";

const LIMIT = 400000;

function syntax(t) {
  return { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6 };
}

export default class MdViewer extends View {
  init(_props, cx) {
    this.parts = [];
    this.message = "Loading file…";
    this.note = null;
    this.load(cx);
  }

  load(cx) {
    const { file, on } = props() ?? {};
    if (!file) { this.message = "No file given"; return; }
    cx.spawn(async (cx) => {
      try {
        const text = await readTextFile(file, { on: on ?? null });
        if (text === null) this.message = "This file is no longer available";
        else if (text.includes("\0")) this.message = "Binary file · no text preview";
        else {
          const cut = text.length > LIMIT;
          this.note = cut ? "File truncated at 400,000 characters" : null;
          this.build(cut ? text.slice(0, LIMIT) : text);
          this.message = null;
        }
      } catch {
        this.message = "Cannot read this file (binary, too large, or unreadable)";
      }
      cx.notify();
    });
  }

  build(text) {
    for (const p of this.parts) p.state?.release();
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

  render() {
    const t = theme(), file = props()?.file ?? "";
    const body = this.message
      ? div().p(24).text_color(t.dim).child(this.message)
      : v_flex().w_full().max_w(860).mx_auto().px(40).py(32).gap(12)
          .font_family("Inter").text_size(15).line_height(1.6)
          .children(this.parts.map((p, i) => p.state
            ? v_flex().flex_none().rounded(6).bg(t.surface).border(1).border_color(t.border).p(12)
                .h(p.lines * 22 + 28).child(Editor.new(p.state).size_full())
            : TextView.markdown(`md${i}`, p.md).selectable(true)))
          .when(Boolean(this.note), (el) => el.child(div().text_size(12).text_color(t.dim).child(this.note)));
    return v_flex().id("md-viewer").size_full().min_h(0).bg(t.background).text_color(t.foreground)
      .child(h_flex().h(36).flex_none().px(16).items_center().border_b(1).border_color(t.border)
        .child(div().font_semibold().truncate().child(file.split(/[\\/]/).pop())))
      .child(v_flex().id("md-scroll").flex_1().min_h(0).overflow_y_scrollbar().child(body));
  }
}
