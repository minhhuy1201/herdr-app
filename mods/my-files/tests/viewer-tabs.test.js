import { test } from "node:test";
import assert from "node:assert/strict";
import { viewerTabs, prune, decide, bind, normalisePath, sync, PENDING_TTL_MS } from "../viewer-tabs.js";

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

test("registry already holding t2 keeps it and the pending open waits for another tab", () => {
  const reg = { t2: { file: "/r/old.md", on: null } };
  const out = bind(reg, A, ["t1"], spaces("t1", "t2"), [pane("t1", "md-viewer"), pane("t2", "md-viewer")]);
  assert.deepEqual(out, { registry: reg, pending: A });
});

test("normalisePath handles separators, dots and drive prefixes", () => {
  assert.equal(normalisePath("/r//a/./b/../c.md"), "/r/a/c.md");
  assert.equal(normalisePath("C:\\Users\\me\\..\\x.md"), "C:/Users/x.md");
  assert.equal(normalisePath("c:/a//b"), "c:/a/b");
  assert.equal(normalisePath("/"), "/");
  assert.equal(normalisePath("/.."), "/");
});

test("decide compares normalised paths", () => {
  const reg = { t2: { file: "/r/./docs/../README.md", on: null } };
  assert.deepEqual(decide(reg, { file: "/r//README.md", on: null }, spaces("t2"), [pane("t2", "md-viewer")]), { select: "t2" });
  const win = { t2: { file: "C:\\r\\a.md", on: "w" } };
  assert.deepEqual(decide(win, { file: "C:/r/a.md", on: "w" }, spaces("t2"), [pane("t2", "md-viewer")]), { select: "t2" });
});

test("bind stores the normalised file", () => {
  const out = bind({}, { file: "/r//a.md", on: null }, [], spaces("t2"), [pane("t2", "md-viewer")]);
  assert.deepEqual(out.registry, { t2: { file: "/r/a.md", on: null } });
});

const pend = (at = 1000, before = []) => ({ target: A, before, at });

test("sync binds a new tab and reports the change", () => {
  const out = sync({ stored: {}, pending: pend(), ready: true, now: 1500 }, spaces("t2"), [pane("t2", "md-viewer")]);
  assert.deepEqual(out, { registry: { t2: A }, pending: null, changed: true });
});

test("sync with an unready machine keeps stored entries but still binds", () => {
  const stored = { tX: { file: "/off/line.md", on: "off" } };
  const out = sync({ stored, pending: pend(), ready: false, now: 1500 }, spaces("t2"), [pane("t2", "md-viewer")]);
  assert.deepEqual(out.registry, { ...stored, t2: A });
  assert.equal(out.pending, null);
});

test("sync prunes gone tabs only when ready", () => {
  const stored = { t9: A };
  assert.deepEqual(sync({ stored, pending: null, ready: true, now: 0 }, spaces("t1"), []), { registry: {}, pending: null, changed: true });
  assert.deepEqual(sync({ stored, pending: null, ready: false, now: 0 }, spaces("t1"), []), { registry: stored, pending: null, changed: false });
});

test("sync expires a pending open after the ttl", () => {
  const live = sync({ stored: {}, pending: pend(1000), ready: true, now: 1000 + PENDING_TTL_MS }, spaces("t1"), []);
  assert.deepEqual(live.pending, pend(1000));
  const dead = sync({ stored: {}, pending: pend(1000), ready: true, now: 1001 + PENDING_TTL_MS }, spaces("t1"), []);
  assert.equal(dead.pending, null);
  assert.equal(dead.changed, false);
});

test("sync without anything to do reports no change", () => {
  const out = sync({ stored: undefined, pending: null, ready: true, now: 0 }, [], []);
  assert.deepEqual(out, { registry: {}, pending: null, changed: false });
});
