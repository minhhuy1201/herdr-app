import { test } from "node:test";
import assert from "node:assert/strict";
import { relativePath } from "../names.js";

test("nested path is relative to the Panel root", () => {
  assert.equal(relativePath("/a/b", "/a/b/c/d.md"), "c/d.md");
});
test("the Panel root itself is a dot", () => {
  assert.equal(relativePath("/a/b", "/a/b"), ".");
});
test("trailing slashes on either side are ignored", () => {
  assert.equal(relativePath("/a/b/", "/a/b/c/"), "c");
  assert.equal(relativePath("/a/b/", "/a/b/"), ".");
});
test("a sibling with the same prefix is not inside the root", () => {
  assert.equal(relativePath("/a/b", "/a/bc/x"), "/a/bc/x");
});

import { validateName } from "../names.js";

test("a valid name has no error", () => {
  assert.equal(validateName("new.md", ["a.md"]), null);
});
test("empty and whitespace-only names are refused", () => {
  assert.ok(validateName("", []));
  assert.ok(validateName("   ", []));
});
test("a name with a slash is refused", () => {
  assert.ok(validateName("a/b", []));
});
test("dot and dot-dot are refused", () => {
  assert.ok(validateName(".", []));
  assert.ok(validateName("..", []));
});
test("a name already in the folder is refused, ignoring surrounding spaces", () => {
  assert.match(validateName("a.md", ["a.md"]), /exists/);
  assert.match(validateName(" a.md ", ["a.md"]), /exists/);
});
test("a dot file name is allowed", () => {
  assert.equal(validateName(".env", []), null);
});

import { renameSelection, moveTreePath, parentOf, baseName } from "../names.js";

test("rename selects the name before the last dot of a file", () => {
  assert.deepEqual(renameSelection("a.md", false), { start: 0, end: 1 });
  assert.deepEqual(renameSelection("archive.tar.gz", false), { start: 0, end: 11 });
});
test("rename selects everything for dot files, extensionless names and folders", () => {
  assert.deepEqual(renameSelection(".env", false), { start: 0, end: 4 });
  assert.deepEqual(renameSelection("Makefile", false), { start: 0, end: 8 });
  assert.deepEqual(renameSelection("v1.2", true), { start: 0, end: 4 });
  assert.deepEqual(renameSelection("trailing.", false), { start: 0, end: 9 });
});
test("parentOf and baseName split a tree path", () => {
  assert.equal(parentOf("a/b/c.md"), "a/b");
  assert.equal(parentOf("c.md"), "");
  assert.equal(baseName("a/b/c.md"), "c.md");
});
test("moveTreePath rewrites the path and anything beneath it, nothing else", () => {
  assert.equal(moveTreePath("a/b", "a/b", "a/x"), "a/x");
  assert.equal(moveTreePath("a/b/c/d.md", "a/b", "a/x"), "a/x/c/d.md");
  assert.equal(moveTreePath("a/bc", "a/b", "a/x"), "a/bc");
  assert.equal(moveTreePath("z", "a/b", "a/x"), "z");
  assert.equal(moveTreePath(null, "a", "b"), null);
});

import { duplicateName } from "../names.js";

test("duplicate puts ' copy' before the last extension", () => {
  assert.equal(duplicateName("a.md", false, ["a.md"]), "a copy.md");
});
test("duplicate counts up when the copy names are taken", () => {
  assert.equal(duplicateName("a.md", false, ["a.md", "a copy.md"]), "a copy 2.md");
  assert.equal(duplicateName("a.md", false, ["a.md", "a copy.md", "a copy 2.md"]), "a copy 3.md");
  assert.equal(duplicateName("a copy.md", false, ["a.md", "a copy.md"]), "a copy copy.md");
});
test("duplicate treats a dot file and an extensionless name as all name", () => {
  assert.equal(duplicateName(".env", false, [".env"]), ".env copy");
  assert.equal(duplicateName("Makefile", false, ["Makefile"]), "Makefile copy");
});
test("duplicate splits only at the last dot", () => {
  assert.equal(duplicateName("archive.tar.gz", false, []), "archive.tar copy.gz");
});
test("duplicate of a folder never splits at a dot", () => {
  assert.equal(duplicateName("src", true, ["src"]), "src copy");
  assert.equal(duplicateName("v1.2", true, ["v1.2"]), "v1.2 copy");
  assert.equal(duplicateName("src", true, ["src", "src copy"]), "src copy 2");
});
