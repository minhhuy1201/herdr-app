// Rows hold no handlers (a virtual list's renderer drops them); the wheel is read on the list.
import { div } from "gpui-kit";
import { h_flex, Scrollbar, v_virtual_list } from "gpui-base";
import { theme } from "herdr";
import { Message } from "./chrome.js";
import { MAX_LINES } from "../diff/rows.js";
import { cells } from "../diff/cells.js";

const ROW = 24;
const GUTTER = 48;
const CHAR = 8.4;
const LIST_ID = "review-diff";

export function widthOf(state) {
  if (state.type !== "rows") return 300;
  const longest = Math.max(
    0,
    ...state.rows.map((r) => (r.kind === "pair" ? Math.max(cells(r.left?.text ?? ""), cells(r.right?.text ?? "")) : 0)),
  );
  return Math.ceil(longest * CHAR + 24);
}

// Theme colours can already carry alpha (#rrggbbaa); only #rrggbb gets one.
const tint = (color, alpha) => (/^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color);

function half(cell, right, view) {
  const t = theme();
  const background = !cell
    ? tint(t.border, "40")
    : cell.kind === "-"
      ? tint(t.ansi1, "26")
      : cell.kind === "+"
        ? tint(t.ansi2, "26")
        : null;
  return h_flex()
    .flex_1()
    .min_w(0)
    .h_full()
    .overflow_hidden()
    .when(right, (el) => el.border_l(1).border_color(t.border))
    .when(Boolean(background), (el) => el.bg(background))
    .child(
      div().w(GUTTER).flex_none().pr(8).text_right().text_color(t.dim).child(cell ? String(cell.line) : ""),
    )
    .child(
      div()
        .flex_1()
        .min_w(0)
        .overflow_hidden()
        .child(div().w(view.width).flex_none().ml(-view.offset).whitespace_nowrap().child(cell?.text || " ")),
    );
}

function row(r, view) {
  const t = theme();
  if (r.kind === "hunk")
    return div().h(ROW).w_full().px(12).bg(t.surface).text_color(t.dim).whitespace_nowrap().child(r.text);
  return h_flex().h(ROW).w_full().child(half(r.left, false, view)).child(half(r.right, true, view));
}

export function diffBody({ rows, truncated, offset, width, font, onScroll }) {
  const view = { offset, width };
  const list = v_virtual_list(
    LIST_ID,
    rows.length,
    ROW,
    (i) => String(i),
    (range) => rows.slice(range.start, range.end).map((r) => row(r, view)),
  )
    .size_full();
  return div()
    .flex_1()
    .min_h(0)
    .flex()
    .flex_col()
    .font_family(font)
    .text_size(14)
    .child(
      div()
        .flex_1()
        .min_h(0)
        .relative()
        .on_scroll_wheel(onScroll)
        .child(list)
        .child(Scrollbar.vertical(LIST_ID).viewport_from_layout().absolute().inset_0()),
    )
    .when(truncated, (el) => el.child(Message(`Showing the first ${MAX_LINES} lines`)));
}
