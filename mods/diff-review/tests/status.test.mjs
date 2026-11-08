import test from "node:test";
import assert from "node:assert/strict";
import { parseDiff, addedFile } from "../diff/rows.js";
import { statusOf } from "../diff/status.js";

const diff = (...lines) => lines.join("\n") + "\n";
const header = (...extra) => ["diff --git a/f b/f", ...extra];

test("a file emptied to zero lines is modified, not deleted", () => {
  const r = parseDiff(diff(...header("index 1234567..e69de29 100644", "--- a/f", "+++ b/f"), "@@ -1,2 +0,0 @@", "-a", "-b"));
  assert.equal(statusOf(r), "M");
});

test("a file filled from empty is modified, not added", () => {
  const r = parseDiff(diff(...header("index e69de29..1234567 100644", "--- a/f", "+++ b/f"), "@@ -0,0 +1 @@", "+x"));
  assert.equal(statusOf(r), "M");
});

test("new and deleted file headers give A and D", () => {
  const added = parseDiff(diff(...header("new file mode 100644", "index 0000000..1234567", "--- /dev/null", "+++ b/f"), "@@ -0,0 +1 @@", "+x"));
  assert.equal(statusOf(added), "A");
  const deleted = parseDiff(diff(...header("deleted file mode 100644", "index 1234567..0000000", "--- a/f", "+++ /dev/null"), "@@ -1 +0,0 @@", "-x"));
  assert.equal(statusOf(deleted), "D");
});

test("an added or deleted binary file keeps its letter", () => {
  const added = parseDiff(diff(...header("new file mode 100644", "index 0000000..1234567"), "Binary files /dev/null and b/i.png differ"));
  assert.equal(added.type, "binary");
  assert.equal(statusOf(added), "A");
  const deleted = parseDiff(diff(...header("deleted file mode 100644", "index 1234567..0000000"), "Binary files a/i.png and /dev/null differ"));
  assert.equal(statusOf(deleted), "D");
});

test("an untracked file is always A, a plain edit M", () => {
  assert.equal(statusOf(addedFile("x\n"), "untracked"), "A");
  assert.equal(statusOf(addedFile("bin\0"), "untracked"), "A");
  assert.equal(statusOf(parseDiff(diff("@@ -1 +1 @@", "-a", "+b"))), "M");
  assert.equal(statusOf({ type: "loading" }), "M");
});
