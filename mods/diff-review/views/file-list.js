// Rows hold no handlers (a virtual list's renderer drops them); the click is read on the list.
import { div, image } from "gpui-kit";
import { h_flex, v_flex, Input, Scrollbar, v_virtual_list } from "gpui-base";
import { theme } from "herdr";
import { statusColor } from "./chrome.js";
import { fileKind } from "./file-kind.js";

const ROW = 28;
const LIST_ID = "review-files";

function splitPath(path) {
  const parts = path.split("/");
  const name = parts.pop();
  return { name, folder: parts.join("/") };
}

function row(file, selected) {
  const t = theme();
  const { name, folder } = splitPath(file.path);
  return h_flex()
    .id(`row:${file.path}`)
    .w_full()
    .h(ROW)
    .flex_none()
    .px(10)
    .gap(6)
    .items_center()
    .text_size(12)
    .cursor_pointer()
    .bg(selected ? t.selected : t.background)
    .hover((s) => s.bg(selected ? t.selected : t.hover))
    .child(image(`mods/diff-review/icons/material/${fileKind(name, false)}.svg`).size(16).flex_none())
    .child(div().flex_shrink_1().min_w(0).max_w(130).truncate().text_color(file.status === "D" ? t.dim : t.foreground).child(name))
    .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).child(folder))
    .when(file.binary, (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child("binary")))
    .when(!file.binary, (el) =>
      el
        .child(div().flex_none().text_size(11).text_color(t.ansi2).child(`+${file.add}`))
        .child(div().flex_none().text_size(11).text_color(t.ansi1).child(`−${file.del}`)),
    )
    .child(div().w(12).flex_none().text_center().text_size(11).text_color(statusColor(t, file.status)).child(file.status));
}

function searchBar(input) {
  const t = theme();
  return h_flex()
    .h(32)
    .flex_none()
    .px(10)
    .items_center()
    .border_b(1)
    .border_color(t.border)
    .child(Input.new(input).flex_1().h_full().text_size(12).text_color(t.foreground));
}

export function fileList({ files, selected, input, onPick }) {
  const t = theme();
  const list = files.length
    ? div()
        .flex_1()
        .min_h(0)
        .relative()
        .child(
          v_virtual_list(
            LIST_ID,
            files.length,
            ROW,
            (i) => `file:${files[i].path}`,
            (range) => files.slice(range.start, range.end).map((f) => row(f, f.path === selected)),
          )
            .size_full()
            .on_item_click((key, cx) => onPick(key.slice("file:".length), cx)),
        )
        .child(Scrollbar.vertical(LIST_ID).viewport_from_layout().absolute().inset_0())
    : div().px(14).py(12).text_size(12).text_color(t.dim).child("No matching files");
  return v_flex().w(300).flex_none().h_full().border_r(1).border_color(t.border).child(searchBar(input)).child(list);
}
