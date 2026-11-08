// The rows under an expanded commit: message, author and date, hash with a copy
// icon, then the changed files. The lanes of the graph keep running through them.
import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme } from "herdr";
import { TEXT, Icon } from "./ui.js";
import { laneColumn } from "./graph-row.js";

const STATUS_COLOR = { A: "ansi2", D: "ansi1", M: "ansi3", R: "ansi5", C: "ansi5" };

export function splitPath(path) {
  const parts = path.split("/");
  const name = parts.pop();
  return { name, folder: parts.join("/") };
}

function body(item, t, selected) {
  if (item.kind === "message")
    return div()
      .flex_1()
      .min_w(0)
      .py(6)
      .whitespace_normal()
      .text_size(TEXT.small)
      .text_color(t.foreground)
      .child(item.message);
  if (item.kind === "meta")
    return div()
      .flex_1()
      .min_w(0)
      .truncate()
      .text_size(TEXT.caption)
      .text_color(t.dim)
      .child(`${item.meta.author} · ${new Date(item.meta.time * 1000).toLocaleString()}`);
  if (item.kind === "hash")
    return h_flex()
      .flex_1()
      .min_w(0)
      .gap(6)
      .items_center()
      .tooltip("Copy the full hash")
      .child(div().text_size(TEXT.small).text_color(t.muted).child(item.hash.slice(0, 8)))
      .child(Icon("copy", 13).text_color(t.dim));
  if (item.kind === "state")
    return div()
      .flex_1()
      .min_w(0)
      .text_size(TEXT.small)
      .text_color(item.error ? t.ansi1 : t.dim)
      .truncate()
      .child(item.text);
  const { file } = item;
  const { name, folder } = splitPath(file.path);
  const color = t[STATUS_COLOR[file.status] ?? "ansi3"];
  return h_flex()
    .flex_1()
    .min_w(0)
    .gap(6)
    .items_center()
    .child(Icon("file", 14).text_color(color))
    .child(div().flex_none().max_w(150).truncate().text_color(file.status === "D" ? t.dim : t.foreground).child(name))
    .child(div().flex_1().min_w(0).truncate().text_size(TEXT.caption).text_color(t.dim).child(folder))
    .when(file.binary, (el) => el.child(div().flex_none().text_size(TEXT.caption).text_color(t.dim).child("binary")))
    .when(!file.binary, (el) =>
      el
        .child(div().flex_none().text_size(TEXT.caption).text_color(t.ansi2).child(`+${file.add}`))
        .child(div().flex_none().text_size(TEXT.caption).text_color(t.ansi1).child(`−${file.del}`)),
    );
}

export function detailRow(item, laneCount, id, selected) {
  const t = theme();
  const clickable = item.kind === "hash" || item.kind === "file";
  return h_flex()
    .id(id)
    .w_full()
    .h(item.height)
    .flex_none()
    .overflow_hidden()
    .items_center()
    .gap(6)
    .pr(10)
    .bg(selected ? t.selected : t.hover)
    .when(clickable, (el) => el.hover((s) => s.bg(t.selected)))
    .child(laneColumn(item.lanes, laneCount, item.height))
    .child(body(item, t, selected));
}
