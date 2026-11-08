import test from "node:test";
import assert from "node:assert/strict";
import { parseDiff, addedFile, MAX_LINES, MAX_LENGTH } from "../diff/rows.js";

const diff = (...lines) => lines.join("\n") + "\n";
const texts = (cells) => cells.map((c) => (c ? c.text : null));

test("context shows on both sides with each side's own line number", () => {
  const r = parseDiff(diff("@@ -5,2 +7,2 @@", " a", " b"));
  assert.equal(r.type, "rows");
  assert.deepEqual(r.rows[0], { kind: "hunk", text: "@@ -5,2 +7,2 @@" });
  assert.deepEqual(r.rows[1].left, { line: 5, text: "a", kind: " " });
  assert.deepEqual(r.rows[1].right, { line: 7, text: "a", kind: " " });
  assert.equal(r.rows[2].right.line, 8);
  assert.equal(r.truncated, false);
});

test("equal runs of removed and added lines face each other in order", () => {
  const r = parseDiff(diff("@@ -1,2 +1,2 @@", "-a", "-b", "+x", "+y"));
  assert.deepEqual(texts(r.rows.slice(1).map((p) => p.left)), ["a", "b"]);
  assert.deepEqual(texts(r.rows.slice(1).map((p) => p.right)), ["x", "y"]);
  assert.equal(r.rows[1].left.kind, "-");
  assert.equal(r.rows[1].right.kind, "+");
});

test("unequal runs leave an empty cell on the shorter side", () => {
  const more = parseDiff(diff("@@ -1,1 +1,3 @@", "-a", "+x", "+y", "+z"));
  assert.deepEqual(texts(more.rows.slice(1).map((p) => p.left)), ["a", null, null]);
  const fewer = parseDiff(diff("@@ -1,3 +1,1 @@", "-a", "-b", "-c", "+x"));
  assert.deepEqual(texts(fewer.rows.slice(1).map((p) => p.right)), ["x", null, null]);
});

test("a new file has an empty before, a deleted file an empty after", () => {
  const added = parseDiff(diff("@@ -0,0 +1,2 @@", "+a", "+b"));
  assert.ok(added.rows.slice(1).every((p) => p.left === null));
  assert.deepEqual(added.rows.slice(1).map((p) => p.right.line), [1, 2]);
  const gone = parseDiff(diff("@@ -1,2 +0,0 @@", "-a", "-b"));
  assert.ok(gone.rows.slice(1).every((p) => p.right === null));
});

test("several hunks keep their headers and restart their numbers", () => {
  const r = parseDiff(diff("diff --git a/f b/f", "index 1..2 100644", "--- a/f", "+++ b/f",
    "@@ -1,1 +1,1 @@", "-a", "+b", "@@ -40,1 +40,1 @@", " c"));
  assert.deepEqual(r.rows.filter((x) => x.kind === "hunk").map((x) => x.text), ["@@ -1,1 +1,1 @@", "@@ -40,1 +40,1 @@"]);
  assert.equal(r.rows.at(-1).left.line, 40);
});

test("a removed run never pairs across a context line", () => {
  const r = parseDiff(diff("@@ -1,3 +1,3 @@", "-a", " m", "+b"));
  assert.equal(r.rows[1].right, null);
  assert.equal(r.rows[3].left, null);
});

test("the line limit cuts the diff and flags it; long lines get an ellipsis", () => {
  const lines = ["@@ -1,1 +1,4000 @@", ...Array.from({ length: 4000 }, (_, i) => `+l${i}`)];
  const r = parseDiff(lines.join("\n"));
  assert.equal(r.truncated, true);
  assert.equal(r.rows.length, 1 + (MAX_LINES - 1));
  const long = parseDiff(diff("@@ -1,1 +1,1 @@", "+" + "x".repeat(MAX_LENGTH + 5)));
  assert.equal(long.rows[1].right.text, "x".repeat(MAX_LENGTH) + "…");
  assert.equal(long.truncated, false);
});

test("binary, mode-only, submodule and empty output are recognised", () => {
  assert.equal(parseDiff(diff("diff --git a/i b/i", "Binary files a/i and b/i differ")).type, "binary");
  assert.equal(parseDiff(diff("diff --git a/i b/i", "GIT binary patch", "literal 3")).type, "binary");
  assert.deepEqual(parseDiff(diff("diff --git a/s b/s", "old mode 100644", "new mode 100755")), { type: "mode", note: "Mode change", status: "M" });
  assert.equal(parseDiff(diff("@@ -1 +1 @@", "-Subproject commit abc", "+Subproject commit def")).type, "mode");
  assert.equal(parseDiff("").type, "empty");
});

test("an untracked file reads as all added; binary and empty are named", () => {
  const r = addedFile("a\nb\n");
  assert.deepEqual(r.rows.slice(1).map((p) => [p.left, p.right.text]), [[null, "a"], [null, "b"]]);
  assert.equal(addedFile("a\0b").type, "binary");
  assert.equal(addedFile("").type, "empty");
});
