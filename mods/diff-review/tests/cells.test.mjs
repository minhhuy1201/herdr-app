import test from "node:test";
import assert from "node:assert/strict";
import { cells } from "../diff/cells.js";

test("wide characters take two cells, others one", () => {
  assert.equal(cells("abc"), 3);
  assert.equal(cells("日本"), 4);
  assert.equal(cells("a😀"), 3);
  assert.equal(cells(""), 0);
});
