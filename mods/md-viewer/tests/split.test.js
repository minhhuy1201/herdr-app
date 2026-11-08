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
