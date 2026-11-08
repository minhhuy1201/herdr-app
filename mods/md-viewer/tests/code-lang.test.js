import { test } from "node:test";
import assert from "node:assert/strict";
import { editorLanguage } from "../code-lang.js";

test("extension-style names map through the shared table", () => {
  assert.equal(editorLanguage("ts"), "js");
  assert.equal(editorLanguage("toml"), "yaml");
  assert.equal(editorLanguage("vue"), "html");
});

test("long aliases map to editor names", () => {
  assert.equal(editorLanguage("typescript"), "js");
  assert.equal(editorLanguage("JavaScript"), "js");
  assert.equal(editorLanguage("bash"), "sh");
  assert.equal(editorLanguage("shell"), "sh");
  assert.equal(editorLanguage("zsh"), "sh");
  assert.equal(editorLanguage("yml"), "yaml");
  assert.equal(editorLanguage("python"), "py");
  assert.equal(editorLanguage("rust"), "rs");
});

test("braces and trailing attributes in the info string are ignored", () => {
  assert.equal(editorLanguage("{ts}"), "js");
  assert.equal(editorLanguage("ts{1,3}"), "js");
  assert.equal(editorLanguage("language-ts"), "js");
});

test("unknown names pass through lowercased and empty becomes txt", () => {
  assert.equal(editorLanguage("Rs"), "rs");
  assert.equal(editorLanguage("klingon"), "klingon");
  assert.equal(editorLanguage(""), "txt");
  assert.equal(editorLanguage(undefined), "txt");
});
