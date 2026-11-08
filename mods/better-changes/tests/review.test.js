import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewProps } from "../git/review.js";

const ctx = { root: "/r", on: null, commit: { hash: "abc123" } };

test("a Commit file opens the Commit dialog", () => {
  assert.deepEqual(reviewProps({ path: "a.js" }, "commit", ctx), {
    kind: "commit", root: "/r", on: null, hash: "abc123", path: "a.js",
  });
});

test("working files open the Working change dialog", () => {
  assert.deepEqual(reviewProps({ path: "a.js", fresh: true }, "unstaged", ctx).scope, "untracked");
  assert.equal(reviewProps({ path: "a.js" }, "staged", ctx).scope, "staged");
});

test("conflicts, branch range and patches keep the centre tab", () => {
  assert.equal(reviewProps({ path: "a.js", conflict: true }, "commit", ctx), null);
  assert.equal(reviewProps({ path: "a.js" }, "committed", ctx), null);
  assert.equal(reviewProps({ path: "a.js" }, "patch", ctx), null);
  assert.equal(reviewProps({ path: "a.js" }, "commit", { ...ctx, commit: null }), null);
});
