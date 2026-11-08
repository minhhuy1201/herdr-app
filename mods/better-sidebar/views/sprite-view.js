import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { SPRITES, NAMES, runs } from "./sprites.js";

const INK = { o: "#ffffff", k: "#17181c" };

// The sprite as GPUI rectangles, `px` screen pixels per sprite pixel.
export function Sprite(name, fill, px = 2) {
  const rows = SPRITES[name] ?? SPRITES[NAMES[0]];
  return v_flex()
    .flex_none()
    .w(px * 8)
    .h(px * 8)
    .children(
      rows.map((row) =>
        h_flex()
          .flex_none()
          .h(px)
          .children(
            runs(row).map(([c, n]) => {
              const cell = div().flex_none().w(px * n).h(px);
              return c === "." ? cell : cell.bg(c === "x" ? fill : INK[c]);
            }),
          ),
      ),
    );
}
