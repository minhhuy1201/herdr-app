// Pure helpers for where the graph looks and whether it is on screen. No Herdr calls.

// The focused terminal's folder; for a Better Changes diff tab (a mod pane with no
// terminal folder) the repository saved for it; else the focused folder or the space's.
export function pickLocation({ space, panes, focusedCwd, diffTabs }) {
  const tab = space?.tabs?.find((t) => t.active)?.id;
  const inTab = panes.filter((p) => p.tab === tab);
  const candidates = inTab.filter((p) => p.cwd);
  if (!candidates.length && inTab.some((p) => p.mod === "better-changes")) {
    const source = diffTabs?.[space?.id]?.source;
    if (source?.cwd) return { cwd: source.cwd, on: source.on ?? null };
  }
  return {
    cwd: candidates.find((p) => p.focused)?.cwd ?? candidates[0]?.cwd ?? focusedCwd ?? space?.folder,
    on: space?.machine ?? null,
  };
}

// Whether the block showing `mod` is on screen: no hidden node above it and every
// stack on the way has it selected. Unknown layouts count as visible.
export function modVisible(root, mod) {
  const pathTo = (node) => {
    if (node?.content?.mod === mod) return [node];
    for (const child of node?.children ?? []) {
      const path = pathTo(child);
      if (path) return [node, ...path];
    }
    return null;
  };
  const path = pathTo(root);
  if (!path) return true;
  return path.every((node, i) => {
    if (node.hidden) return false;
    const next = path[i + 1];
    return node.type !== "stack" || !next || (node.active ?? node.children[0]?.id) === next.id;
  });
}
