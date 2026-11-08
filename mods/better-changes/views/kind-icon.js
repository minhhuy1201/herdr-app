import { image } from "gpui-kit";
import { fileKind } from "./file-kind.js";

export function KindIcon(name, dir, open = false) {
  return image(`mods/better-changes/icons/material/${fileKind(name, dir, open)}.svg`).size(16).flex_none();
}
