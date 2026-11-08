import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewProps } from "../git/review.js";

const ctx = { root: "/r", on: null, commit: { hash: "abc123" }, base: "b4se" };

test("a Commit file opens the Commit dialog", () => {
  assert.deepEqual(reviewProps({ path: "a.js" }, "commit", ctx), {
    kind: "commit", root: "/r", on: null, hash: "abc123", path: "a.js",
  });
});

test("working files open the Working change dialog", () => {
  assert.deepEqual(reviewProps({ path: "a.js", fresh: true }, "unstaged", ctx).scope, "untracked");
  assert.equal(reviewProps({ path: "a.js" }, "staged", ctx).scope, "staged");
});

test("a Branch range file opens the one-file range dialog", () => {
  assert.deepEqual(reviewProps({ path: "a.js" }, "committed", ctx), {
    kind: "range", root: "/r", on: null, base: "b4se", path: "a.js",
  });
  assert.equal(reviewProps({ path: "a.js" }, "committed", { ...ctx, base: undefined }), null);
  assert.equal(reviewProps({ path: "a.js", conflict: true }, "committed", ctx), null);
});

test("conflicts and patches keep the centre tab", () => {
  assert.equal(reviewProps({ path: "a.js", conflict: true }, "commit", ctx), null);
  assert.equal(reviewProps({ path: "a.js" }, "patch", ctx), null);
  assert.equal(reviewProps({ path: "a.js" }, "commit", { ...ctx, commit: null }), null);
});
