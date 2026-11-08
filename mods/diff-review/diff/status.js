// The status letter of a one-file dialog. Untracked files have no Git diff; every other
// state carries the letter parseDiff read from the diff header.
export function statusOf(state, scope) {
  if (scope === "untracked") return "A";
  return state?.status ?? "M";
}
