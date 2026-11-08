import { test } from "node:test";
import assert from "node:assert/strict";
import { splitFences } from "../split.js";

test("no fences gives one markdown segment", () => {
  assert.deepEqual(splitFences("# Hi\n\ntext"), [{ md: "# Hi\n\ntext" }]);
});

test("empty file gives no segments", () => {
  assert.deepEqual(splitFences(""), []);
});

test("backtick fence with language, markdown around it", () => {
  assert.deepEqual(splitFences("before\n```js\nlet a = 1;\n```\nafter"), [
    { md: "before" }, { lang: "js", code: "let a = 1;" }, { md: "after" },
  ]);
});

test("tilde fence", () => {
  assert.deepEqual(splitFences("~~~py\nprint(1)\n~~~"), [{ lang: "py", code: "print(1)" }]);
});

test("longer closing fence closes", () => {
  assert.deepEqual(splitFences("```\nx\n`````\ny"), [{ lang: "", code: "x" }, { md: "y" }]);
});

test("shorter or other-char inner fence does not close", () => {
  assert.deepEqual(splitFences("````md\n```\ninner\n```\n~~~\n````"), [
    { lang: "md", code: "```\ninner\n```\n~~~" },
  ]);
});

test("fence indented 3 spaces counts, 4 spaces does not", () => {
  assert.deepEqual(splitFences("   ```\n   a\n   ```"), [{ lang: "", code: "   a" }]);
  assert.deepEqual(splitFences("    ```\n    a\n    ```"), [{ md: "    ```\n    a\n    ```" }]);
});

test("unclosed fence runs to end of file", () => {
  assert.deepEqual(splitFences("```sh\nls\nmore"), [{ lang: "sh", code: "ls\nmore" }]);
});

import { shareDefinitions } from "../split.js";

test("link reference definitions are appended to markdown segments that lack them", () => {
  const segs = splitFences("See [docs][d] here.\n\n```ts\nx\n```\n\nAlso [more][d].\n\n[d]: https://example.com/d \"Title\"\n");
  const out = shareDefinitions(segs);
  assert.equal(out[0].md, 'See [docs][d] here.\n\n[d]: https://example.com/d "Title"');
  assert.equal(out[1].code, "x");
  assert.ok(out[2].md.trim().startsWith("Also [more][d]."));
  assert.equal(out[2].md.match(/\[d\]:/g).length, 1);
});

test("shareDefinitions ignores footnotes, deep indent and definitions inside code", () => {
  const segs = [{ md: "a [x][y]\n[^1]: note\n    [z]: https://indented" }, { lang: "md", code: "[c]: https://code" }, { md: "b" }];
  assert.deepEqual(shareDefinitions(segs), segs);
});

test("shareDefinitions without definitions returns the segments unchanged", () => {
  const segs = splitFences("one\n\n```\nc\n```\n\ntwo");
  assert.deepEqual(shareDefinitions(segs), segs);
});
