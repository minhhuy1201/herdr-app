import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileKind, ICONS } from "../file-kind.js";

test("folders, special names and extensions get their Material icon", () => {
  assert.equal(fileKind("misc", true), "folder");
  assert.equal(fileKind("misc", true, true), "folder-open");
  assert.equal(fileKind("src", true, true), "folder-src-open");
  assert.equal(fileKind("node_modules", true), "folder-node");
  assert.equal(fileKind("package.json", false), "nodejs");
  assert.equal(fileKind("README.md", false), "readme");
  assert.equal(fileKind("main.js", false), "javascript");
  assert.equal(fileKind("herdr.d.ts", false), "typescript-def");
  assert.equal(fileKind("a.test.js", false), "test-js");
  assert.equal(fileKind(".env.local", false), "tune");
  assert.equal(fileKind("Logo.PNG", false), "image");
  assert.equal(fileKind("Makefile", false), "makefile");
  assert.equal(fileKind("herdr-app.sock", false), "file");
});

test("every icon fileKind can return ships in icons/material/", () => {
  const shipped = new Set(readdirSync(new URL("../icons/material", import.meta.url)));
  for (const name of ICONS) assert.ok(shipped.has(`${name}.svg`), name);
});
