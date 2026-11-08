// One commit row: the graph column drawn from absolutely-positioned divs, then
// the subject, the author and the age. Lines meet the node at right angles.
import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme } from "herdr";
import { SIZE, TEXT } from "./ui.js";

export const LANE_W = 14;
const PAD = 8;
const NODE = 9;
const MID = SIZE.row / 2;

export const graphWidth = (laneCount) => PAD * 2 + Math.max(1, laneCount) * LANE_W - (LANE_W - NODE);

const laneX = (lane) => PAD + lane * LANE_W + NODE / 2;

function laneColor(t, index) {
  const palette = [t.ansi4, t.ansi2, t.ansi5, t.ansi3, t.ansi6, t.ansi1];
  return palette[index % palette.length];
}

const vertical = (lane, from, to, color) =>
  div().absolute().left(laneX(lane) - 0.5).top(from).w(1).h(to - from).bg(color);

const horizontal = (a, b, color) =>
  div()
    .absolute()
    .left(laneX(Math.min(a, b)) - 0.5)
    .top(MID - 0.5)
    .w(Math.abs(laneX(a) - laneX(b)) + 1)
    .h(1)
    .bg(color);

export function graphColumn(row, laneCount) {
  const t = theme();
  const parts = [];
  for (const { lane, color } of row.pass) parts.push(vertical(lane, 0, SIZE.row, laneColor(t, color)));
  for (const { lane, color } of row.join) {
    const c = laneColor(t, color);
    parts.push(vertical(lane, 0, MID, c));
    if (lane !== row.lane) parts.push(horizontal(lane, row.lane, c));
  }
  for (const { lane, color } of row.branch) {
    const c = laneColor(t, color);
    parts.push(vertical(lane, MID, SIZE.row, c));
    if (lane !== row.lane) parts.push(horizontal(lane, row.lane, c));
  }
  const fill = row.merge ? t.muted : laneColor(t, row.color);
  const node = div()
    .absolute()
    .left(laneX(row.lane) - NODE / 2)
    .top(MID - NODE / 2)
    .size(NODE)
    .rounded_full();
  // HEAD is a ring: a hollow node with a thick outline in its lane colour.
  parts.push(
    row.head
      ? node.bg(t.background).border_2().border_color(laneColor(t, row.color))
      : node.bg(fill).border_1().border_color(t.background),
  );
  return div().relative().flex_none().h(SIZE.row).w(graphWidth(laneCount)).children(parts);
}

// The lanes that continue through an expanded commit's detail rows.
export function laneColumn(lanes, laneCount, height) {
  const t = theme();
  return div()
    .relative()
    .flex_none()
    .h(height)
    .w(graphWidth(laneCount))
    .children(lanes.map(({ lane, color }) => vertical(lane, 0, height, laneColor(t, color))));
}

export function age(unixSeconds, now = Date.now() / 1000) {
  const s = Math.max(0, now - unixSeconds);
  const units = [
    [31536000, "y"],
    [2592000, "mo"],
    [604800, "w"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  for (const [size, label] of units) if (s >= size) return `${Math.floor(s / size)}${label}`;
  return "now";
}

const MAX_LABELS = 3;

// "main | origin" for a branch that exists locally and on a remote, "origin/dev"
// for a remote-only branch.
export function labelText(label) {
  if (label.kind === "tag") return label.name;
  if (!label.local) return label.remotes.map((r) => `${r}/${label.name}`).join(" | ");
  return [label.name, ...label.remotes].join(" | ");
}

function refLabel(label, t) {
  const tag = label.kind === "tag";
  const color = tag ? t.ansi3 : label.local ? t.ansi4 : t.ansi5;
  return h_flex()
    .flex_shrink_1()
    .min_w(0)
    .max_w(150)
    .items_center()
    .gap(3)
    .px(5)
    .h(18)
    .border_1()
    .border_color(color)
    .when(!tag && withAlpha(color, "26"), (el) => el.bg(withAlpha(color, "26")))
    .text_size(TEXT.caption)
    .text_color(color)
    .when(tag, (el) => el.italic())
    .when(label.current, (el) => el.font_semibold())
    .child(div().truncate().min_w(0).child(labelText(label)))
    .when(label.current, (el) => el.child(div().flex_none().child("✓")));
}

// A #rrggbb or #rrggbbaa colour with the given alpha; null for any other form (a theme name).
function withAlpha(color, alpha) {
  if (typeof color !== "string" || !/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return null;
  return color.slice(0, 7) + alpha;
}

function refLabels(row, t) {
  const labels = row.commit.refs?.labels ?? [];
  if (!labels.length) return [];
  const shown = labels.slice(0, MAX_LABELS).map((l) => refLabel(l, t));
  const more = labels.length - MAX_LABELS;
  if (more > 0)
    shown.push(
      div()
        .flex_none()
        .text_size(TEXT.caption)
        .text_color(t.dim)
        .tooltip(labels.slice(MAX_LABELS).map(labelText).join(", "))
        .id(`more-${row.commit.hash}`)
        .child(`+${more}`),
    );
  return shown;
}

export function commitRow(row, laneCount, id, expanded = false) {
  const t = theme();
  return h_flex()
    .id(id)
    .w_full()
    .h(SIZE.row)
    .flex_none()
    .overflow_hidden()
    .items_center()
    .gap(6)
    .pr(10)
    .when(row.head && withAlpha(t.accent, "22"), (el) => el.bg(withAlpha(t.accent, "22")))
    .when(expanded, (el) => el.bg(t.selected))
    .cursor_pointer()
    .hover((s) => s.bg(t.hover))
    .child(graphColumn(row, laneCount))
    // Labels and subject share what author and age leave, so neither pushes those off.
    .child(
      h_flex()
        .flex_1()
        .min_w(0)
        .overflow_hidden()
        .gap(6)
        .items_center()
        .children(refLabels(row, t))
        .child(
          div()
            .flex_1()
            .min_w(0)
            .truncate()
            .text_color(row.merge ? t.muted : t.foreground)
            .child(row.commit.subject),
        ),
    )
    .child(
      div()
        .flex_none()
        .max_w(48)
        .truncate()
        .text_size(TEXT.caption)
        .text_color(t.dim)
        .child(row.commit.author),
    )
    .child(
      div()
        .flex_none()
        .w(28)
        .text_right()
        .text_size(TEXT.caption)
        .text_color(t.dim)
        .child(age(row.commit.time)),
    );
}
