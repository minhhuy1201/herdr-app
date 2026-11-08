import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme } from "herdr";

export const statusColor = (t, status) => (status === "A" ? t.ansi2 : status === "D" ? t.ansi1 : t.ansi3);

export function Header(path, status) {
  const t = theme();
  return h_flex()
    .h(42)
    .flex_none()
    .px(14)
    .gap(10)
    .items_center()
    .bg(t.chrome)
    .border_b(1)
    .border_color(t.border)
    .child(div().flex_1().min_w(0).truncate().text_size(13).child(path))
    .child(div().flex_none().text_size(12).text_color(statusColor(t, status)).child(status));
}

export function Message(text, error = false) {
  return div()
    .px(14)
    .py(12)
    .text_size(12)
    .text_color(error ? theme().ansi1 : theme().dim)
    .child(text);
}

export function CommitHeader(hash, subject, count) {
  const t = theme();
  return h_flex()
    .h(42)
    .flex_none()
    .px(14)
    .gap(10)
    .items_center()
    .bg(t.chrome)
    .border_b(1)
    .border_color(t.border)
    .child(div().flex_none().text_size(12).text_color(t.dim).child(hash.slice(0, 7)))
    .child(div().flex_1().min_w(0).truncate().text_size(13).child(subject))
    .child(div().flex_none().text_size(12).text_color(t.dim).child(`${count} ${count === 1 ? "file" : "files"}`));
}
