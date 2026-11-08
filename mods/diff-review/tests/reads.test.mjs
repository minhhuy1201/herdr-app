import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { READ_ONLY, readWorkingChange, readCommitFiles, readCommitFile } from "../diff/reads.js";

const env = {
  ...process.env,
  GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
};

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "diff-review-"));
  const run = (...a) => execFileSync("git", a, { cwd: dir, env, stdio: "pipe" });
  const git = async (args) => {
    const r = spawnSync("git", [...READ_ONLY, ...args], { cwd: dir, env, encoding: "utf8" });
    return { code: r.status, stdout: r.stdout, stderr: r.stderr };
  };
  const readText = async (path) => readFileSync(join(dir, path), "utf8");
  run("init", "-q", "-b", "main");
  return { dir, run, git, readText };
}

test("staged and unstaged diffs of the same file differ", async () => {
  const { dir, run, git, readText } = repo();
  try {
    writeFileSync(join(dir, "f.txt"), "one\ntwo\n");
    run("add", "f.txt");
    run("commit", "-q", "-m", "base");
    writeFileSync(join(dir, "f.txt"), "ONE\ntwo\n");
    run("add", "f.txt");
    writeFileSync(join(dir, "f.txt"), "ONE\nTWO\n");
    const staged = await readWorkingChange({ git, readText, path: "f.txt", scope: "staged" });
    const unstaged = await readWorkingChange({ git, readText, path: "f.txt", scope: "unstaged" });
    const changed = (r) => r.rows.filter((p) => p.kind === "pair" && p.right?.kind === "+").map((p) => p.right.text);
    assert.deepEqual(changed(staged), ["ONE"]);
    assert.deepEqual(changed(unstaged), ["TWO"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an untracked file reads as all added, and a glob path is literal", async () => {
  const { dir, git, readText } = repo();
  try {
    writeFileSync(join(dir, "new.txt"), "a\nb\n");
    const r = await readWorkingChange({ git, readText, path: "new.txt", scope: "untracked" });
    assert.deepEqual(r.rows.slice(1).map((p) => p.right.text), ["a", "b"]);
    assert.ok(r.rows.slice(1).every((p) => p.left === null));
    writeFileSync(join(dir, "[a].txt"), "x\n");
    const run = (...a) => execFileSync("git", a, { cwd: dir, env, stdio: "pipe" });
    run("add", "[a].txt");
    const staged = await readWorkingChange({ git, readText, path: "[a].txt", scope: "staged" });
    assert.equal(staged.type, "rows");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a failing git read throws its message", async () => {
  const git = async () => ({ code: 128, stdout: "", stderr: "fatal: not a repo\n" });
  await assert.rejects(readWorkingChange({ git, readText: async () => "", path: "f", scope: "staged" }), /not a repo/);
});

function commitRepo() {
  const r = repo();
  const put = (name, text) => writeFileSync(join(r.dir, name), text);
  put("keep.txt", "k\n");
  put("edit.txt", "one\ntwo\n");
  put("gone.txt", "bye\n");
  r.run("add", ".");
  r.run("commit", "-q", "-m", "base");
  return { ...r, put };
}

test("a commit's files come with subject, status and counts", async () => {
  const { dir, run, git, put } = commitRepo();
  try {
    put("edit.txt", "one\nTWO\nthree\n");
    put("new.txt", "n\n");
    rmSync(join(dir, "gone.txt"));
    run("add", "-A");
    run("commit", "-q", "-m", "change things");
    const hash = run("rev-parse", "HEAD").toString().trim();
    const { subject, files } = await readCommitFiles(git, hash);
    assert.equal(subject, "change things");
    const by = Object.fromEntries(files.map((f) => [f.path, f]));
    assert.deepEqual([by["edit.txt"].status, by["edit.txt"].add, by["edit.txt"].del], ["M", 2, 1]);
    assert.deepEqual([by["new.txt"].status, by["new.txt"].add], ["A", 1]);
    assert.deepEqual([by["gone.txt"].status, by["gone.txt"].del], ["D", 1]);
    assert.equal(files.length, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a merge commit is measured against its first parent", async () => {
  const { dir, run, git, put } = commitRepo();
  try {
    run("checkout", "-q", "-b", "side");
    put("side.txt", "s\n");
    run("add", ".");
    run("commit", "-q", "-m", "side work");
    run("checkout", "-q", "main");
    put("main.txt", "m\n");
    run("add", ".");
    run("commit", "-q", "-m", "main work");
    run("merge", "-q", "--no-ff", "-m", "merge side", "side");
    const hash = run("rev-parse", "HEAD").toString().trim();
    const { files } = await readCommitFiles(git, hash);
    assert.deepEqual(files.map((f) => f.path), ["side.txt"]);
    const diff = await readCommitFile(git, hash, "side.txt");
    assert.equal(diff.type, "rows");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("one file's patch in a commit holds only that file, and a glob path is literal", async () => {
  const { dir, run, git, put } = commitRepo();
  try {
    put("edit.txt", "one\nTWO\n");
    put("[a].txt", "x\n");
    run("add", "-A");
    run("commit", "-q", "-m", "two files");
    const hash = run("rev-parse", "HEAD").toString().trim();
    const edit = await readCommitFile(git, hash, "edit.txt");
    const pairs = edit.rows.filter((p) => p.kind === "pair");
    assert.deepEqual(pairs.filter((p) => p.right?.kind === "+").map((p) => p.right.text), ["TWO"]);
    assert.deepEqual(pairs.filter((p) => p.left?.kind === "-").map((p) => p.left.text), ["two"]);
    const glob = await readCommitFile(git, hash, "[a].txt");
    assert.equal(glob.rows.filter((p) => p.right?.kind === "+").length, 1);
    await assert.rejects(readCommitFile(git, "nothash", "edit.txt"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
