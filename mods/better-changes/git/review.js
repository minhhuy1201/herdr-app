// Which clicks open the Review dialog, and with what props. Conflicts and the
// branch range, remote and patch scopes keep the centre tab (null).
export function reviewProps(file, scope, { root, on, commit }) {
  if (file.conflict) return null;
  if (scope === "commit") {
    if (!commit?.hash) return null;
    return { kind: "commit", root, on, hash: commit.hash, path: file.path };
  }
  if (scope !== "staged" && scope !== "unstaged") return null;
  return { kind: "working", root, on, path: file.path, scope: file.fresh ? "untracked" : scope };
}
