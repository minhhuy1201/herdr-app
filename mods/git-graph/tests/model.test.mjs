import test from "node:test";
import assert from "node:assert/strict";
import { buildGraph, parseRefs, parseLog, LOG_FORMAT } from "../graph/model.js";

const c = (hash, ...parents) => ({ hash, parents, author: "a", time: 0, subject: hash, refs: "" });
const lanes = (commits) => buildGraph(commits).rows.map((r) => r.lane);

test("linear history stays in one lane with one colour", () => {
  const { rows, laneCount } = buildGraph([c("c", "b"), c("b", "a"), c("a")]);
  assert.deepEqual(rows.map((r) => r.lane), [0, 0, 0]);
  assert.equal(new Set(rows.map((r) => r.color)).size, 1);
  assert.equal(laneCount, 1);
  assert.deepEqual(rows[1].join, [{ lane: 0, color: 0 }]);
  assert.deepEqual(rows[1].branch, [{ lane: 0, color: 0 }]);
});

test("branch and merge: merge opens a second lane that joins at the fork", () => {
  // m merges f into main; both descend from base
  const { rows, laneCount } = buildGraph([c("m", "x", "f"), c("f", "base"), c("x", "base"), c("base")]);
  assert.equal(laneCount, 2);
  const [m, f, x, base] = rows;
  assert.equal(m.merge, true);
  assert.deepEqual(m.branch.map((e) => e.lane), [0, 1]);
  assert.equal(f.lane, 1);
  assert.deepEqual(f.pass.map((e) => e.lane), [0]);
  assert.equal(x.lane, 0);
  assert.equal(base.lane, 0);
  assert.deepEqual(base.join.map((e) => e.lane), [0, 1]);
  assert.notEqual(m.branch[0].color, m.branch[1].color);
});

test("octopus merge opens one lane per extra parent", () => {
  const { rows, laneCount } = buildGraph([
    c("m", "a", "b", "d"),
    c("a", "r"),
    c("b", "r"),
    c("d", "r"),
    c("r"),
  ]);
  assert.equal(laneCount, 3);
  assert.deepEqual(rows[0].branch.map((e) => e.lane), [0, 1, 2]);
  assert.deepEqual(rows.slice(1, 4).map((r) => r.lane), [0, 1, 2]);
  assert.deepEqual(rows[4].join.map((e) => e.lane), [0, 1, 2]);
});

test("two root commits use separate lanes", () => {
  const { rows, laneCount } = buildGraph([c("x", "x0"), c("y", "y0"), c("x0"), c("y0")]);
  assert.equal(laneCount, 2);
  assert.deepEqual(rows.map((r) => r.lane), [0, 1, 0, 1]);
  assert.deepEqual(rows[2].branch, []);
  assert.notEqual(rows[0].color, rows[1].color);
});

test("a lane freed by a merge is reused by the next branch", () => {
  const { rows, laneCount } = buildGraph([
    c("m", "x", "f"), // opens lane 1 for f
    c("f", "base"), // lane 1
    c("x", "base"), // lane 0
    c("base", "o"), // joins lanes 0 and 1, frees lane 1
    c("o", "p1", "p2"), // the next fork reuses lane 1
    c("p1"),
    c("p2"),
  ]);
  assert.equal(laneCount, 2);
  assert.equal(rows[4].branch[1].lane, 1);
});

test("a parent already waited for is joined, not duplicated", () => {
  const { rows } = buildGraph([c("m1", "a", "p"), c("m2", "b", "p"), c("a"), c("b"), c("p")]);
  // m2 is a new tip in lane 2 or free lane; its second parent p joins p's lane
  assert.equal(rows[1].branch[1].lane, rows[0].branch[1].lane);
});

test("refs: a local branch and its remote share one label, tags are separate", () => {
  const r = parseRefs(
    "HEAD -> refs/heads/main, tag: refs/tags/v1, refs/remotes/origin/main, refs/remotes/origin/HEAD, refs/remotes/origin/dev, refs/heads/feature/x",
  );
  assert.equal(r.head, true);
  assert.equal(r.detached, false);
  assert.deepEqual(r.labels, [
    { name: "main", kind: "branch", local: true, remotes: ["origin"], current: true },
    { name: "dev", kind: "branch", local: false, remotes: ["origin"], current: false },
    { name: "feature/x", kind: "branch", local: true, remotes: [], current: false },
    { name: "v1", kind: "tag", local: false, remotes: [], current: false },
  ]);
});

test("refs: short names parse too, and a detached HEAD is marked", () => {
  const r = parseRefs("HEAD, tag: v2, main");
  assert.equal(r.head, true);
  assert.equal(r.detached, true);
  assert.deepEqual(r.labels.map((l) => [l.name, l.kind, l.current]), [
    ["main", "branch", false],
    ["v2", "tag", false],
  ]);
  assert.deepEqual(parseRefs("").labels, []);
  assert.equal(parseRefs("").head, false);
});

test("parseLog attaches parsed refs and buildGraph marks the HEAD row", () => {
  const rec = (h, p, d) => [h, p, "a", "1", h, d].join("\0") + "\x1e\n";
  const { rows } = buildGraph(parseLog(rec("b", "a", "HEAD -> refs/heads/main") + rec("a", "", "")));
  assert.equal(rows[0].head, true);
  assert.equal(rows[1].head, false);
  assert.equal(rows[0].commit.refs.labels[0].name, "main");
  assert.ok(LOG_FORMAT.includes("%D"));
});

test("two pages build the same rows as one big page", () => {
  const history = [
    c("m", "x", "f"),
    c("f", "base"),
    c("x", "base"),
    c("base", "o"),
    c("o", "p1", "p2"),
    c("p1", "r"),
    c("p2", "r"),
    c("r"),
  ];
  const whole = buildGraph(history);
  for (let cut = 1; cut < history.length; cut++) {
    const first = buildGraph(history.slice(0, cut));
    const second = buildGraph(history.slice(cut), first.state);
    assert.deepEqual([...first.rows, ...second.rows], whole.rows, `cut at ${cut}`);
    assert.equal(Math.max(first.laneCount, second.laneCount), whole.laneCount);
  }
});
