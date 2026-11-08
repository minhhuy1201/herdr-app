// Open-or-select for Markdown viewer tabs: pure functions over the registry
// ({ [tabId]: { file, on } }) and plain spaces()/panes() data. No Herdr imports,
// so a copy lives in each mod that opens viewers.
const VIEWER = "md-viewer";
const machine = on => on ?? null;

// run("tab.new") returns no id, so an opener waits this long for its tab to appear before giving up.
export const PENDING_TTL_MS = 10000;

// Backslashes to "/", collapses "//", "." and ".."; keeps a Windows drive prefix.
export function normalisePath(path) {
  const text = String(path ?? "").replace(/\\/g, "/");
  const drive = /^[A-Za-z]:(?=\/|$)/.exec(text)?.[0] ?? "";
  const rest = text.slice(drive.length);
  const parts = [];
  for (const part of rest.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  const absolute = rest.startsWith("/") || (drive && rest === "");
  return drive + (absolute ? "/" : "") + parts.join("/");
}

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
  const id = Object.keys(live).find(id => normalisePath(live[id].file) === normalisePath(target.file) && machine(live[id].on) === machine(target.on));
  return id ? { select: id } : { open: true };
}

// Binds a pending open ({ file, on }) to the first viewer tab absent from `before`
// (the viewer tab ids snapshotted ahead of tab.new) and not already registered.
export function bind(registry, pending, before, spaces, panes) {
  const known = registry ?? {};
  if (!pending) return { registry: known, pending: null };
  const id = viewerTabs(spaces, panes).find(id => !before.includes(id) && !(id in known));
  if (!id) return { registry: known, pending };
  return { registry: { ...known, [id]: { file: normalisePath(pending.file), on: machine(pending.on) } }, pending: null };
}

// One sync step for both openers. `pending` is { target, before, at } or null. While a machine is
// not ready its tabs are missing from spaces(), so stored entries are kept (no prune) but a
// pending open still binds. A pending open that no tab claims expires after PENDING_TTL_MS.
export function sync({ stored, pending, ready, now }, spaces, panes) {
  const current = stored ?? {};
  const base = ready ? prune(current, spaces, panes) : current;
  const bound = pending ? bind(base, pending.target, pending.before, spaces, panes) : { registry: base, pending: null };
  const keep = bound.pending && now - pending.at <= PENDING_TTL_MS ? pending : null;
  return {
    registry: bound.registry,
    pending: keep,
    changed: JSON.stringify(bound.registry) !== JSON.stringify(current),
  };
}
