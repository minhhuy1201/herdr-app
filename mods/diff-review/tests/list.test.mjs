import test from "node:test";
import assert from "node:assert/strict";
import { stepPath } from "../diff/list.js";

const files = [{ path: "a" }, { path: "b" }, { path: "c" }];

test("stepPath moves one file and stays on the ends", () => {
  assert.equal(stepPath(files, "b", 1), "c");
  assert.equal(stepPath(files, "b", -1), "a");
  assert.equal(stepPath(files, "c", 1), "c");
  assert.equal(stepPath(files, "a", -1), "a");
});

test("stepPath falls back to the first file, and to null for an empty list", () => {
  assert.equal(stepPath(files, "zzz", 1), "a");
  assert.equal(stepPath([], "a", 1), null);
});

import { filterFiles } from "../diff/list.js";

const named = [{ path: "views/Sidebar.js" }, { path: "main.js" }, { path: "docs/Readme.md" }];

test("filterFiles keeps files whose path contains the query anywhere, ignoring case", () => {
  assert.deepEqual(filterFiles(named, "sidebar").map((f) => f.path), ["views/Sidebar.js"]);
  assert.deepEqual(filterFiles(named, "VIEWS/").map((f) => f.path), ["views/Sidebar.js"]);
  assert.deepEqual(filterFiles(named, ".js").map((f) => f.path), ["views/Sidebar.js", "main.js"]);
});

test("filterFiles keeps every file for an empty or blank query, and gives [] for no match", () => {
  assert.equal(filterFiles(named, "").length, 3);
  assert.equal(filterFiles(named, "   ").length, 3);
  assert.deepEqual(filterFiles(named, "zzz"), []);
});
