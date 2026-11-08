import test from "node:test";
import assert from "node:assert/strict";
import { pickLocation, modVisible } from "../graph/location.js";

const space = { id: "s1", folder: "/home/me", machine: null, tabs: [{ id: "t1", active: true }] };

test("terminal folder wins, focused first", () => {
  const panes = [
    { tab: "t1", cwd: "/a" },
    { tab: "t1", cwd: "/b", focused: true },
  ];
  assert.deepEqual(pickLocation({ space, panes, diffTabs: {} }), { cwd: "/b", on: null });
});

test("a Better Changes diff tab keeps the repository of its source", () => {
  const panes = [{ tab: "t1", mod: "better-changes" }];
  const diffTabs = { s1: { source: { cwd: "/repo", on: "vps" } } };
  assert.deepEqual(pickLocation({ space, panes, diffTabs }), { cwd: "/repo", on: "vps" });
});

test("without a source it falls back to the space folder", () => {
  const panes = [{ tab: "t1", mod: "better-changes" }];
  assert.equal(pickLocation({ space, panes, diffTabs: {} }).cwd, "/home/me");
});

const root = {
  type: "row",
  children: [
    { id: "side", type: "column", hidden: true, children: [{ id: "x", type: "block", content: { mod: "other" } }] },
    {
      id: "stack",
      type: "stack",
      active: "files",
      children: [
        { id: "files", type: "block", content: { mod: "files" } },
        { id: "graph", type: "block", content: { mod: "git-graph" } },
      ],
    },
  ],
};

test("modVisible follows the active stack child and hidden nodes", () => {
  assert.equal(modVisible(root, "git-graph"), false);
  assert.equal(modVisible({ ...root, children: [root.children[0], { ...root.children[1], active: "graph" }] }, "git-graph"), true);
  assert.equal(modVisible(root, "other"), false);
  assert.equal(modVisible(root, "missing"), true);
});
