import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { READ_ONLY, readGraph, readRoot, readGitDirs, joinPages, refsChanged, repoName, readRepoName } from "../graph/reads.js";

const env = {
  ...process.env,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
};
const runner = (cwd) => async (args) => {
  const r = spawnSync("git", [...READ_ONLY, ...args], { cwd, env, encoding: "utf8" });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
};

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "git-graph-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, env, stdio: "pipe" });
  const commit = (m) => {
    const file = m.replace(/\W+/g, "-");
    writeFileSync(join(dir, file), m);
    git("add", file);
    git("commit", "-q", "-m", m);
  };
  git("init", "-q", "-b", "main");
  return { dir, git, commit };
}

test("branches and a merge give two lanes and a merge row", async () => {
  const { dir, git, commit } = repo();
  try {
    commit("base");
    git("checkout", "-q", "-b", "feature");
    commit("feature work");
    git("checkout", "-q", "main");
    commit("main work");
    git("merge", "-q", "--no-ff", "-m", "merge feature", "feature");
    const { rows, laneCount } = await readGraph(runner(dir));
    assert.equal(laneCount, 2);
    assert.equal(rows.length, 4);
    assert.equal(rows[0].commit.subject, "merge feature");
    assert.equal(rows[0].merge, true);
    assert.deepEqual(rows[0].branch.map((e) => e.lane), [0, 1]);
    assert.equal(rows.at(-1).commit.subject, "base");
    assert.deepEqual(rows.at(-1).join.map((e) => e.lane), [0, 1]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no commits gives no rows, and a plain folder has no root", async () => {
  const { dir } = repo();
  const plain = mkdtempSync(join(tmpdir(), "git-graph-plain-"));
  try {
    const empty = await readGraph(runner(dir));
    assert.deepEqual([empty.rows, empty.laneCount], [[], 0]);
    assert.equal(await readRoot(runner(plain)), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(plain, { recursive: true, force: true });
  }
});

test("real refs: tag, remote branch, HEAD label, detached HEAD", async () => {
  const { dir, git, commit } = repo();
  try {
    commit("one");
    git("update-ref", "refs/tags/v1", "HEAD");
    git("update-ref", "refs/remotes/origin/main", "HEAD");
    git("update-ref", "refs/remotes/origin/HEAD", "HEAD");
    commit("two");
    let { rows } = await readGraph(runner(dir));
    assert.equal(rows[0].head, true);
    assert.deepEqual(rows[0].commit.refs.labels.map((l) => [l.name, l.current]), [["main", true]]);
    assert.equal(rows[1].head, false);
    assert.deepEqual(
      rows[1].commit.refs.labels.map((l) => [l.name, l.kind, l.remotes.join()]),
      [["main", "branch", "origin"], ["v1", "tag", ""]],
    );
    git("checkout", "-q", "--detach", "HEAD~1");
    ({ rows } = await readGraph(runner(dir)));
    const detached = rows.find((r) => r.head);
    assert.equal(detached.commit.subject, "one");
    assert.equal(detached.commit.refs.detached, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scope head hides other branches; two real pages match one", async () => {
  const { dir, git, commit } = repo();
  try {
    commit("base");
    git("checkout", "-q", "-b", "side");
    commit("side work");
    git("checkout", "-q", "main");
    for (const m of ["m1", "m2", "m3"]) commit(m);
    git("merge", "-q", "--no-ff", "-m", "merge side", "side");
    commit("m4");
    const all = await readGraph(runner(dir), { count: 100 });
    git("checkout", "-q", "-b", "other", "HEAD~1");
    commit("other work");
    git("checkout", "-q", "main");
    const onlyHead = await readGraph(runner(dir), { scope: "head" });
    assert.ok(!onlyHead.rows.some((r) => r.commit.subject === "other work"));
    const whole = await readGraph(runner(dir), { count: 100 });
    assert.ok(whole.rows.some((r) => r.commit.subject === "other work"));
    assert.equal(all.done, true);

    const first = await readGraph(runner(dir), { count: 4 });
    assert.equal(first.done, false);
    const second = await readGraph(runner(dir), { count: 4, skip: 4, prior: first });
    const third = await readGraph(runner(dir), { count: 4, skip: 8, prior: second });
    const joined = joinPages(joinPages(first, second), third);
    assert.deepEqual(joined.rows, whole.rows);
    assert.equal(joined.laneCount, whole.laneCount);
    assert.equal(joined.done, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("git dirs: HEAD and refs locations", async () => {
  const { dir } = repo();
  try {
    const dirs = await readGitDirs(runner(dir));
    assert.ok(dirs.gitDir.endsWith("/.git"));
    assert.equal(dirs.commonDir, dirs.gitDir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("refsChanged reacts to HEAD and refs, not to the index or lock files", () => {
  const d = "/r/.git";
  assert.equal(refsChanged(d, [`${d}/HEAD`]), true);
  assert.equal(refsChanged(d, [`${d}/refs/heads/main`]), true);
  assert.equal(refsChanged(d, [`${d}/packed-refs`]), true);
  assert.equal(refsChanged(d, [d]), true);
  assert.equal(refsChanged(d, [`${d}/index`, `${d}/HEAD.lock`, `${d}/refs/heads/main.lock`]), false);
});

test("repoName takes the repository name from any remote URL form", () => {
  assert.equal(repoName("git@github.com:minhhuy1201/herdr-config.git"), "herdr-config");
  assert.equal(repoName("https://github.com/owner/my-repo.git"), "my-repo");
  assert.equal(repoName("https://github.com/owner/my-repo/"), "my-repo");
  assert.equal(repoName("ssh://git@host:2222/group/sub/app.git"), "app");
  assert.equal(repoName("/srv/git/local-repo.git"), "local-repo");
  assert.equal(repoName("  "), null);
});

test("readRepoName prefers origin, falls back to another remote, then to the root folder", async () => {
  const { dir, git, commit } = repo();
  try {
    commit("base");
    const name = dir.split("/").at(-1);
    assert.equal(await readRepoName(runner(dir), dir), name);
    git("remote", "add", "upstream", "https://example.com/team/upstream-repo.git");
    assert.equal(await readRepoName(runner(dir), dir), "upstream-repo");
    git("remote", "add", "origin", "git@example.com:me/origin-repo.git");
    assert.equal(await readRepoName(runner(dir), dir), "origin-repo");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
