// Open-or-select for Markdown viewer tabs: pure functions over the registry
// ({ [tabId]: { file, on } }) and plain spaces()/panes() data. No Herdr imports,
// so a copy lives in each mod that opens viewers.
const VIEWER = "md-viewer";
const machine = on => on ?? null;

// A tab is live while spaces() lists it and panes() has a viewer pane in it.
export function viewerTabs(spaces, panes) {
  const listed = new Set(spaces.flatMap(s => s.tabs.map(t => t.id)));
  const ids = [];
  for (const p of panes) if (p.mod === VIEWER && listed.has(p.tab) && !ids.includes(p.tab)) ids.push(p.tab);
  return ids;
}

export function prune(registry, spaces, panes) {
  const live = new Set(viewerTabs(spaces, panes));
  return Object.fromEntries(Object.entries(registry ?? {}).filter(([id]) => live.has(id)));
}

// { select: tabId } for a live tab of the same file on the same machine, else { open: true }.
export function decide(registry, target, spaces, panes) {
  const live = prune(registry, spaces, panes);
  const id = Object.keys(live).find(id => live[id].file === target.file && machine(live[id].on) === machine(target.on));
  return id ? { select: id } : { open: true };
}

// Binds a pending open ({ file, on }) to the first viewer tab absent from `before`
// (the viewer tab ids snapshotted ahead of tab.new) and not already registered.
export function bind(registry, pending, before, spaces, panes) {
  const known = registry ?? {};
  if (!pending) return { registry: known, pending: null };
  const id = viewerTabs(spaces, panes).find(id => !before.includes(id) && !(id in known));
  if (!id) return { registry: known, pending };
  return { registry: { ...known, [id]: { file: pending.file, on: machine(pending.on) } }, pending: null };
}
