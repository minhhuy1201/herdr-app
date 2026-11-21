import { test } from "node:test";
import assert from "node:assert/strict";
import { fileMenuItems } from "../menu-items.js";

const labels = (t) => fileMenuItems(t).map((i) => i.label);
const base = { dir: false, isRoot: false, open: false, on: null, platform: "linux" };

const OPEN = ["Open in Default App"];
const NEW = ["New File…", "New Folder…"];
const COPY = ["Copy Path", "Copy Relative Path"];
const CHANGE = ["Rename…", "Duplicate", "Move to Trash"];

test("a local file gets the open group, then the copy group", () => {
  assert.deepEqual(labels(base), [...OPEN, ...COPY, ...CHANGE]);
});
test("a closed folder gets New items but no Collapse All", () => {
  assert.deepEqual(labels({ ...base, dir: true }), [...OPEN, ...NEW, ...COPY, ...CHANGE]);
});
test("an open folder gets Collapse All last, in its own group", () => {
  const items = fileMenuItems({ ...base, dir: true, open: true });
  assert.deepEqual(items.map((i) => i.label), [...OPEN, ...NEW, ...COPY, ...CHANGE, "Collapse All"]);
  const runs = items.map((i) => i.group).filter((g, i, all) => g !== all[i - 1]);
  assert.deepEqual(runs, ["open", "new", "copy", "change", "fold"]);
});
test("the Panel root counts as open", () => {
  assert.deepEqual(labels({ ...base, dir: true, isRoot: true }), [...OPEN, ...NEW, ...COPY, "Collapse All"]);
});
test("commands are my-files mod commands", () => {
  assert.deepEqual(fileMenuItems(base).map((i) => i.command),
    ["my-files.open-default", "my-files.copy-path", "my-files.copy-relative-path", "my-files.rename", "my-files.duplicate", "my-files.trash"]);
});
test("a remote target hides Open in Default App", () => {
  assert.deepEqual(labels({ ...base, on: "vps" }), [...COPY, ...CHANGE]);
});
test("a Windows target keeps the open group", () => {
  assert.deepEqual(labels({ ...base, platform: "windows" }), [...OPEN, ...COPY]);
});
test("New items only on folders, with their commands", () => {
  assert.deepEqual(fileMenuItems({ ...base, dir: true }).filter((i) => i.group === "new").map((i) => i.command),
    ["my-files.new-file", "my-files.new-folder"]);
  assert.ok(!labels(base).includes("New File…"));
});
test("a remote folder keeps the New items", () => {
  assert.deepEqual(labels({ ...base, dir: true, on: "vps" }), [...NEW, ...COPY, ...CHANGE]);
});
test("Windows hides the New items", () => {
  assert.deepEqual(labels({ ...base, dir: true, platform: "windows" }), [...OPEN, ...COPY]);
});

test("Rename is on files and folders, not the Panel root, not on Windows", () => {
  assert.ok(labels(base).includes("Rename…"));
  assert.ok(labels({ ...base, dir: true }).includes("Rename…"));
  assert.ok(!labels({ ...base, dir: true, isRoot: true }).includes("Rename…"));
  assert.ok(!labels({ ...base, platform: "windows" }).includes("Rename…"));
});

test("Duplicate is on files and folders, not the Panel root, not on Windows", () => {
  assert.ok(labels(base).includes("Duplicate"));
  assert.ok(labels({ ...base, dir: true }).includes("Duplicate"));
  assert.ok(!labels({ ...base, dir: true, isRoot: true }).includes("Duplicate"));
  assert.ok(!labels({ ...base, platform: "windows" }).includes("Duplicate"));
});

test("Move to Trash is the last item of the change group, with its command", () => {
  const change = fileMenuItems({ ...base, dir: true }).filter((i) => i.group === "change");
  assert.equal(change.at(-1).label, "Move to Trash");
  assert.equal(change.at(-1).command, "my-files.trash");
  assert.ok(!labels({ ...base, isRoot: true, dir: true }).includes("Move to Trash"));
  assert.ok(!labels({ ...base, platform: "windows" }).includes("Move to Trash"));
});
