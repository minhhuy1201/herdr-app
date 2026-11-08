import { test } from "node:test";
import assert from "node:assert/strict";
import { viewerTabs, prune, decide, bind } from "../viewer-tabs.js";

const spaces = (...ids) => [{ id: "s1", tabs: ids.map(id => ({ id })) }];
const pane = (tab, mod) => ({ pane: `p-${tab}`, tab, mod });
const A = { file: "/r/README.md", on: null };

test("empty registry asks to open", () => {
  assert.deepEqual(decide({}, A, spaces("t1"), [pane("t1", "md-viewer")]), { open: true });
  assert.deepEqual(decide(undefined, A, [], []), { open: true });
});

test("live entry for the same file and machine is selected", () => {
  const reg = { t2: { file: "/r/README.md", on: null } };
  assert.deepEqual(decide(reg, { ...A, on: undefined }, spaces("t1", "t2"), [pane("t2", "md-viewer")]), { select: "t2" });
});

test("same file on another machine opens a new tab", () => {
  const reg = { t2: A };
  assert.deepEqual(decide(reg, { ...A, on: "vps" }, spaces("t2"), [pane("t2", "md-viewer")]), { open: true });
});

test("same name in a different folder opens a new tab", () => {
  const reg = { t2: A };
  assert.deepEqual(decide(reg, { file: "/other/README.md", on: null }, spaces("t2"), [pane("t2", "md-viewer")]), { open: true });
});

test("gone tab is pruned and not selected", () => {
  const reg = { t2: A, t3: { file: "/r/b.md", on: null } };
  assert.deepEqual(prune(reg, spaces("t3"), [pane("t3", "md-viewer")]), { t3: reg.t3 });
  assert.deepEqual(decide(reg, A, spaces("t3"), [pane("t3", "md-viewer")]), { open: true });
});

test("a tab that no longer holds a viewer pane is not live", () => {
  assert.deepEqual(prune({ t2: A }, spaces("t2"), [pane("t2", "my-files")]), {});
  assert.deepEqual(viewerTabs(spaces("t2"), [pane("t9", "md-viewer")]), []);
});

test("new viewer tab after a pending open is bound", () => {
  const out = bind({ t1: { file: "/r/a.md", on: null } }, A, ["t1"], spaces("t1", "t2"), [pane("t1", "md-viewer"), pane("t2", "md-viewer")]);
  assert.deepEqual(out, { registry: { t1: { file: "/r/a.md", on: null }, t2: A }, pending: null });
});

test("unrelated new tab is not bound", () => {
  const out = bind({}, A, [], spaces("t5"), [{ pane: "p5", tab: "t5", mod: undefined, terminal: "x" }]);
  assert.deepEqual(out, { registry: {}, pending: A });
});

test("no pending open binds nothing", () => {
  const out = bind({}, null, [], spaces("t5"), [pane("t5", "md-viewer")]);
  assert.deepEqual(out, { registry: {}, pending: null });
});
