import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveLink, opener } from "../links.js";

const file = "/home/u/proj/docs/guide.md";
const md = (link) => resolveLink(link, file);

test("sibling and parent relative markdown links", () => {
  assert.deepEqual(md("./other.md"), { markdown: "/home/u/proj/docs/other.md" });
  assert.deepEqual(md("other.md"), { markdown: "/home/u/proj/docs/other.md" });
  assert.deepEqual(md("../docs/a.md"), { markdown: "/home/u/proj/docs/a.md" });
  assert.deepEqual(md("../README.markdown"), { markdown: "/home/u/proj/README.markdown" });
});

test("anchor and query are dropped", () => {
  assert.deepEqual(md("a.md#part"), { markdown: "/home/u/proj/docs/a.md" });
  assert.deepEqual(md("a.md?x=1#p"), { markdown: "/home/u/proj/docs/a.md" });
});

test("url-encoded spaces are decoded", () => {
  assert.deepEqual(md("my%20notes.md"), { markdown: "/home/u/proj/docs/my notes.md" });
});

test("web links", () => {
  assert.deepEqual(md("https://x"), { web: "https://x" });
  assert.deepEqual(md("http://x/a?b#c"), { web: "http://x/a?b#c" });
});

test("anchor-only, mailto, non-markdown and empty do nothing", () => {
  for (const l of ["#anchor", "mailto:a@b", "image.png", "", "ftp://x/a.md", "./dir/"]) assert.equal(md(l), null);
});

test("absolute and file: links", () => {
  assert.deepEqual(md("/etc/a.md"), { markdown: "/etc/a.md" });
  assert.deepEqual(md("file:///tmp/a%20b.md"), { markdown: "/tmp/a b.md" });
});

test("windows viewer path", () => {
  assert.deepEqual(resolveLink("../x.md", "C:\\u\\docs\\g.md"), { markdown: "C:/u/x.md" });
});

test("opener per platform", () => {
  assert.deepEqual(opener("linux", "https://x"), { cmd: "xdg-open", args: ["https://x"] });
  assert.deepEqual(opener("macos", "https://x"), { cmd: "open", args: ["https://x"] });
  assert.deepEqual(opener("windows", "https://x?a=1&b=2"), { cmd: "rundll32", args: ["url.dll,FileProtocolHandler", "https://x?a=1&b=2"] });
});
