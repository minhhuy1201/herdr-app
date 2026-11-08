import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const helper = (url) =>
  readFileSync(url, "utf8")
    .split("\n")
    .filter((line) => /^(const WIDE|export const cells)/.test(line))
    .join("\n");

test("cells matches the Git Graph's copy", () => {
  const ours = helper(new URL("../diff/cells.js", import.meta.url));
  assert.ok(ours.includes("export const cells"));
  assert.equal(ours, helper(new URL("../../git-graph/graph/detail.js", import.meta.url)));
});
