// Reading from Git. Each function takes a `git(args)` runner that resolves to
// { code, stdout, stderr } and adds the read-only flags itself. Nothing here
// writes to the repository, and nothing imports Herdr.
import { LOG_FORMAT, parseLog, buildGraph } from "./model.js";
import { parseCommitFiles, parseCommitMeta } from "./detail.js";

// Reads must not take optional index locks or start fsmonitor helpers.
export const READ_ONLY = [
  "--no-optional-locks",
  "-c",
  "core.fsmonitor=false",
  "-c",
  "diff.autoRefreshIndex=false",
];

export const PAGE_SIZE = 300;

// scope "all" shows every ref, "head" only the history of the current checkout.
export const logArgs = ({ count = PAGE_SIZE, skip = 0, scope = "all" } = {}) => [
  "log",
  scope === "head" ? "HEAD" : "--all",
  "--decorate=full",
  "--date-order",
  `--max-count=${count}`,
  ...(skip ? [`--skip=${skip}`] : []),
  LOG_FORMAT,
];

// The repository root, or null outside one.
export async function readRoot(git) {
  const top = await git(["rev-parse", "--show-toplevel"]);
  return top.code === 0 ? top.stdout.trim() : null;
}

// Where Git keeps HEAD and the refs: HEAD lives in the git dir, refs in the common dir
// (they differ in a linked worktree).
export async function readGitDirs(git) {
  const r = await git(["rev-parse", "--absolute-git-dir", "--path-format=absolute", "--git-common-dir"]);
  if (r.code !== 0) return null;
  const [gitDir, commonDir] = r.stdout.trim().split("\n");
  return { gitDir, commonDir: commonDir || gitDir };
}

// One page of rows. `prior` is the previous page's result: its lanes continue.
// `done` is true once the history has no more commits. An empty repository has no
// HEAD, so the current-branch view is empty.
export async function readGraph(git, { count = PAGE_SIZE, skip = 0, scope = "all", prior = null } = {}) {
  const empty = { rows: [], laneCount: 0, state: null, done: true };
  // An unborn HEAD only empties the current-branch view; other refs can still have commits.
  if (scope === "head" && (await git(["rev-parse", "--verify", "HEAD"])).code !== 0) return empty;
  const log = await git(logArgs({ count, skip, scope }));
  if (log.code !== 0) throw Error((log.stderr || log.stdout).trim() || "Cannot read history");
  const commits = parseLog(log.stdout);
  const page = buildGraph(commits, prior?.state ?? null);
  return { ...page, done: commits.length < count };
}

// A commit that moved between pages (a ref changed meanwhile) appears once.
export function joinPages(graph, page) {
  const seen = new Set(graph.rows.map((r) => r.commit.hash));
  return {
    rows: [...graph.rows, ...page.rows.filter((r) => !seen.has(r.commit.hash))],
    laneCount: Math.max(graph.laneCount, page.laneCount),
    state: page.state,
    done: page.done,
  };
}

// A ref moved if HEAD, packed-refs or anything under refs/ changed (not a lock file).
export function refsChanged(dir, paths) {
  return paths.some((path) => {
    if (path === dir) return true;
    const rel = path.startsWith(dir + "/") ? path.slice(dir.length + 1) : path;
    return /^(HEAD|packed-refs|refs(\/|$))/.test(rel) && !rel.endsWith(".lock");
  });
}

// One commit's author, date, full message and changed files (first parent for a merge).
export async function readCommitDetail(git, hash) {
  const show = (...flags) => git(["show", "--diff-merges=first-parent", "--format=", ...flags, "-z", hash]);
  const [meta, numstat, names] = await Promise.all([
    git(["show", "-s", "--format=%an%x00%at%x00%B", hash]),
    show("--numstat"),
    show("--name-status"),
  ]);
  for (const r of [meta, numstat, names])
    if (r.code !== 0) throw Error((r.stderr || r.stdout).trim() || "Cannot read commit");
  return { meta: parseCommitMeta(meta.stdout), files: parseCommitFiles(numstat.stdout, names.stdout) };
}
