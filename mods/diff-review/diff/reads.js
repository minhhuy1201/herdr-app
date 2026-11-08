import { parseDiff, addedFile } from "./rows.js";

// Reads must not take optional index locks or start fsmonitor helpers.
export const READ_ONLY = [
  "--no-optional-locks",
  "-c",
  "core.fsmonitor=false",
  "-c",
  "diff.autoRefreshIndex=false",
];

const DIFF_FLAGS = ["--no-ext-diff", "--no-textconv", "--no-color"];

export const workingDiffArgs = (scope, path) => [
  "--literal-pathspecs",
  "diff",
  ...(scope === "staged" ? ["--cached"] : []),
  ...DIFF_FLAGS,
  "--",
  path,
];

// scope: staged | unstaged | untracked. `readText(path)` returns the file's text, or null
// when it cannot be read; it is used for untracked files only.
export async function readWorkingChange({ git, readText, path, scope }) {
  if (scope === "untracked") {
    const text = await readText(path);
    if (text === null) throw Error("Cannot preview this file: unreadable or too large.");
    return addedFile(text);
  }
  const result = await git(workingDiffArgs(scope, path));
  if (result.code !== 0) throw Error((result.stderr || result.stdout).trim() || "Cannot read diff");
  return parseDiff(result.stdout);
}

// `git show --numstat -z` and `--name-status -z`, printed separately (together Git prints
// only the last). A rename or copy carries two paths in both; the new one names the file.
const STATUS = new Set(["A", "M", "D", "R", "C", "T"]);

function numstatEntries(text) {
  const fields = text.split("\0");
  const out = [];
  for (let i = 0; i < fields.length; i++) {
    if (!fields[i]) continue;
    const [add, del, path] = fields[i].split("\t");
    if (path === "") {
      out.push({ add, del, path: fields[i + 2] });
      i += 2;
    } else out.push({ add, del, path });
  }
  return out;
}

function statusMap(text) {
  const map = new Map();
  const fields = text.split("\0");
  for (let i = 0; i < fields.length; i++) {
    const code = fields[i]?.[0];
    if (!code || !STATUS.has(code)) continue;
    const paths = code === "R" || code === "C" ? 2 : 1;
    map.set(fields[i + paths], code);
    i += paths;
  }
  return map;
}

export function parseCommitFiles(numstat, nameStatus) {
  const status = statusMap(nameStatus);
  return numstatEntries(numstat).map(({ add, del, path }) => {
    const binary = add === "-";
    return { path, add: binary ? 0 : Number(add), del: binary ? 0 : Number(del), binary, status: status.get(path) ?? "M" };
  });
}

const failure = (r, fallback) => Error((r.stderr || r.stdout).trim() || fallback);

export async function readCommitFiles(git, hash) {
  const show = (...flags) => git(["show", "--diff-merges=first-parent", "--format=", ...flags, "-z", hash]);
  const [subject, numstat, names] = await Promise.all([
    git(["show", "-s", "--format=%s", hash]),
    show("--numstat"),
    show("--name-status"),
  ]);
  for (const r of [subject, numstat, names]) if (r.code !== 0) throw failure(r, "Cannot read commit");
  return { subject: subject.stdout.trim(), files: parseCommitFiles(numstat.stdout, names.stdout) };
}

export async function readRangeFile(git, base, path) {
  const r = await git(["--literal-pathspecs", "diff", "--unified=3", ...DIFF_FLAGS, base, "HEAD", "--", path]);
  if (r.code !== 0) throw failure(r, "Cannot read diff");
  return parseDiff(r.stdout);
}

export async function readCommitFile(git, hash, path) {
  const r = await git([
    "--literal-pathspecs",
    "show",
    "--diff-merges=first-parent",
    "--format=",
    "--unified=3",
    ...DIFF_FLAGS,
    hash,
    "--",
    path,
  ]);
  if (r.code !== 0) throw failure(r, "Cannot read diff");
  return parseDiff(r.stdout);
}
