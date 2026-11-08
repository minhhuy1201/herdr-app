// The few pieces of Better Changes' design kit this panel needs, copied because
// a mod can't import from another mod's folder. Values: 42px header, 28px rows,
// radius 10, theme tokens.
import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme } from "herdr";

export const TEXT = { caption: 11, small: 12, body: 13 };
export const SIZE = { header: 42, row: 28, icon: 26 };
export const SPIN_MS = 900;

const ICONS = "mods/git-graph/icons";
export const Icon = (name, size = 14) => svg(`${ICONS}/${name}.svg`).size(size).flex_none();

export function Panel({ id }) {
  const t = theme();
  return v_flex()
    .id(id)
    .size_full()
    .min_h(0)
    .overflow_hidden()
    .bg(t.chrome)
    .text_color(t.foreground)
    .text_size(TEXT.body);
}

export function PanelHeader() {
  const t = theme();
  return h_flex()
    .h(SIZE.header)
    .flex_none()
    .px(14)
    .gap(8)
    .items_center();
}

export function IconButton({ id, icon, label, onClick, spinning = false, active = false }) {
  const t = theme();
  return div()
    .id(id)
    .size(SIZE.icon)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .text_color(active ? t.foreground : t.dim)
    .accessibility_label(label)
    .tooltip(label)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover).text_color(t.foreground))
    .on_click((_e, cx) => {
      cx.stop_propagation();
      onClick(cx);
    })
    .child(spinning ? Icon(icon, 15).spin(SPIN_MS) : Icon(icon, 15));
}

export function Message(text, error = false) {
  const t = theme();
  return div()
    .flex_none()
    .p(8)
    .text_size(TEXT.small)
    .whitespace_normal()
    .text_color(error ? t.ansi1 : t.dim)
    .child(text);
}
