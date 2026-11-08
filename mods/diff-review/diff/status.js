// The status letter for a Working change, read off its diff because the props do not carry one.
export function statusOf(state, scope) {
  if (scope === "untracked") return "A";
  if (state?.type !== "rows") return "M";
  const pairs = state.rows.filter((r) => r.kind === "pair");
  const removed = pairs.some((r) => r.left?.kind === "-");
  const added = pairs.some((r) => r.right?.kind === "+");
  const context = pairs.some((r) => r.left?.kind === " ");
  if (context) return "M";
  if (added && !removed) return "A";
  if (removed && !added) return "D";
  return "M";
}
