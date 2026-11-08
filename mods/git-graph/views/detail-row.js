// The rows under an expanded commit: subject, author and date, hash with a copy
// icon, then the changed files. The lanes of the graph keep running through them.
import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme } from "herdr";
import { TEXT, Icon } from "./ui.js";
import { laneColumn } from "./graph-row.js";
import { ITEM } from "../graph/detail.js";
import { fileKind } from "./file-kind.js";

// The same status colours as the Changes panel's StatusLetter.
const statusColor = (t, status) => (status === "A" ? t.ansi2 : status === "D" ? t.ansi1 : t.ansi3);

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
      .py(ITEM.pad / 2)
      .whitespace_normal()
      .text_size(TEXT.small)
      .line_height(`${ITEM.line}px`)
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
  return h_flex()
    .flex_1()
    .min_w(0)
    .gap(6)
    .items_center()
    .child(image(`mods/git-graph/icons/material/${fileKind(name, false)}.svg`).size(16).flex_none())
    .child(div().flex_shrink_1().min_w(0).max_w(150).truncate().text_color(file.status === "D" ? t.dim : t.foreground).child(name))
    .child(div().flex_1().min_w(0).truncate().text_size(TEXT.caption).text_color(t.dim).child(folder))
    .when(file.binary, (el) => el.child(div().flex_none().text_size(TEXT.caption).text_color(t.dim).child("binary")))
    .when(!file.binary, (el) =>
      el
        .child(div().flex_none().text_size(TEXT.caption).text_color(t.ansi2).child(`+${file.add}`))
        .child(div().flex_none().text_size(TEXT.caption).text_color(t.ansi1).child(`−${file.del}`)),
    )
    .child(div().w(12).flex_none().text_center().text_size(TEXT.caption).text_color(statusColor(t, file.status)).child(file.status));
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
    .when(clickable, (el) => el.cursor_pointer().hover((s) => s.bg(t.selected)))
    .child(laneColumn(item.lanes, laneCount, item.height))
    .child(body(item, t, selected));
}
