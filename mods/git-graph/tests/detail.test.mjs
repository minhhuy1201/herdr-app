import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildGraph } from "../graph/model.js";
import { parseCommitFiles, flatten, diffEntry, wrappedLines } from "../graph/detail.js";
import { READ_ONLY, readCommitDetail } from "../graph/reads.js";

const c = (hash, ...parents) => ({ hash, parents, author: "a", time: 0, subject: hash, refs: "" });

test("parseCommitFiles pairs numstat with status, handles binary and renames", () => {
  const numstat = "3\t1\ta.txt\0-\t-\timg.png\0" + "0\t0\t\0old.txt\0new.txt\0";
  const names = "M\0a.txt\0A\0img.png\0R100\0old.txt\0new.txt\0";
  assert.deepEqual(parseCommitFiles(numstat, names), [
    { path: "a.txt", add: 3, del: 1, binary: false, status: "M" },
    { path: "img.png", add: 0, del: 0, binary: true, status: "A" },
    { path: "new.txt", add: 0, del: 0, binary: false, status: "R" },
  ]);
});

test("flatten: only the expanded commit gets detail items, carrying the lanes below it", () => {
  const { rows } = buildGraph([c("m", "x", "f"), c("f", "base"), c("x", "base"), c("base")]);
  const detail = { hash: "m", state: "ready", meta: { author: "a", time: 1, message: "m\n\nbody" }, files: [{ path: "a/b.txt", add: 1, del: 0, binary: false, status: "M" }] };
  const items = flatten(rows, "m", detail, 40);
  assert.deepEqual(items.map((i) => i.kind), ["commit", "message", "meta", "hash", "file", "commit", "commit", "commit"]);
  assert.deepEqual(items[1].lanes.map((l) => l.lane), [0, 1]);
  assert.equal(flatten(rows, null, null).length, 4);
  // a detail for another commit is ignored: the expanded one shows Loading
  const stale = flatten(rows, "m", { ...detail, hash: "f" }, 40);
  assert.equal(stale.find((i) => i.kind === "state").text, "Loading…");
});

test("wrappedLines counts wrapped and blank lines", () => {
  assert.equal(wrappedLines("a\n\nb", 40), 3);
  assert.equal(wrappedLines("x".repeat(95), 40), 3);
});

test("diffEntry matches Better Changes' commit selection shape", () => {
  const e = diffEntry({ root: "/r", on: undefined, commit: { hash: "h".repeat(40), short: "hhhhhhh", subject: "s", extra: 1 }, file: { path: "p" }, old: undefined, hasTab: false, now: 5 });
  assert.deepEqual(Object.keys(e.source), ["cwd", "on"]);
  assert.equal(e.selection.context, JSON.stringify(e.source));
  assert.equal(e.selection.scope, "commit");
  assert.deepEqual(Object.keys(e.selection.commit), ["hash", "short", "subject"]);
  assert.equal(e.pending, 5);
  assert.equal(diffEntry({ root: "/r", commit: {}, file: {}, hasTab: true, now: 5 }).pending, null);
  assert.equal(diffEntry({ root: "/r", commit: {}, file: {}, hasTab: false, old: { pending: 2 }, now: 5 }).pending, 2);
});

test("readCommitDetail against real Git: message, author and files of a merge's first parent", () => {
  const dir = mkdtempSync(join(tmpdir(), "git-graph-detail-"));
  const env = { ...process.env, GIT_AUTHOR_NAME: "Ann", GIT_AUTHOR_EMAIL: "a@example.com", GIT_COMMITTER_NAME: "Ann", GIT_COMMITTER_EMAIL: "a@example.com", GIT_CONFIG_GLOBAL: "/dev/null" };
  const git = (...a) => execFileSync("git", a, { cwd: dir, env, stdio: "pipe", encoding: "utf8" });
  try {
    git("init", "-q", "-b", "main");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "a.txt"), "one\n");
    git("add", ".");
    git("commit", "-q", "-m", "first");
    writeFileSync(join(dir, "src", "a.txt"), "one\ntwo\n");
    writeFileSync(join(dir, "bin.dat"), Buffer.from([0, 1, 2, 0]));
    git("mv", "src/a.txt", "src/b.txt");
    git("add", ".");
    git("commit", "-q", "-m", "second subject", "-m", "the body\nline two");
    const run = async (args) => {
      const r = spawnSync("git", [...READ_ONLY, ...args], { cwd: dir, env, encoding: "utf8" });
      return { code: r.status, stdout: r.stdout, stderr: r.stderr };
    };
    const hash = git("rev-parse", "HEAD").trim();
    return readCommitDetail(run, hash).then((d) => {
      assert.equal(d.meta.author, "Ann");
      assert.equal(d.meta.message, "second subject\n\nthe body\nline two");
      assert.ok(d.meta.time > 0);
      const byPath = Object.fromEntries(d.files.map((f) => [f.path, f]));
      assert.equal(byPath["bin.dat"].binary, true);
      assert.equal(byPath["bin.dat"].status, "A");
      assert.equal(byPath["src/b.txt"].status, "R");
      assert.equal(byPath["src/b.txt"].add, 1);
      return assert.rejects(readCommitDetail(run, "deadbeef"));
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

import { joinPages } from "../graph/reads.js";

test("wide characters take two cells and long text never under-counts", () => {
  assert.ok(wrappedLines("漢".repeat(40), 40) >= 2);
  assert.ok(wrappedLines("x".repeat(40), 40) >= 2);
});

test("joinPages drops a commit that appears in both pages", () => {
  const row = (h) => ({ commit: { hash: h } });
  const joined = joinPages({ rows: [row("a"), row("b")], laneCount: 1 }, { rows: [row("b"), row("c")], laneCount: 2, state: null, done: true });
  assert.deepEqual(joined.rows.map((r) => r.commit.hash), ["a", "b", "c"]);
});
