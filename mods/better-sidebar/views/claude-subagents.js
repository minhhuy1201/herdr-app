// Claude Code's in-process subagents (its Agent tool) have no terminal: herdr-core
// lists them flat per terminal in `records`. Who started whom is only in Claude's
// undocumented meta.json, found through ~/.claude/sessions/<pid>.json on the
// terminal's machine. Idea and lookup from h0ru5/herdr-agents-tree (Apache-2.0).

// Prints every `agent-<id>.meta.json` of the session run by pid $1, prefixed by its path.
export const META_SCRIPT = String.raw`sid=$(grep -o '"sessionId":"[^"]*"' ~/.claude/sessions/$1.json | cut -d'"' -f4); [ -n "$sid" ] && grep -H . ~/.claude/projects/*/"$sid"/subagents/agent-*.meta.json`;

// `grep -H` output to { id: { desc, parent } }; unreadable lines are skipped.
export function parseMeta(stdout) {
  const out = {};
  for (const m of stdout.matchAll(/agent-([^./]+)\.meta\.json:(\{.*\})$/gm)) {
    try {
      const j = JSON.parse(m[2]);
      out[m[1]] = { desc: j.description, parent: j.parentAgentId };
    } catch {}
  }
  return out;
}

// One row per record, nested under its parent subagent when meta knows it. A
// subagent waiting on its own subagent drops out of records; it stays as an idle
// row while a descendant is listed, so the child doesn't jump up to the terminal.
export function recordRows(terminal, meta) {
  const records = terminal.records ?? {};
  const rows = new Map();
  const add = (id, record) => {
    if (rows.has(id)) return;
    const parentId = meta[id]?.parent;
    if (parentId && !records[parentId] && meta[parentId]) add(parentId, null);
    rows.set(id, {
      address: `${terminal.address}#${id}`,
      name: record?.title || meta[id]?.desc || id,
      status: record ? record.state : "idle",
      program: terminal.program,
      record: true,
      parent: parentId && rows.has(parentId) ? `${terminal.address}#${parentId}` : terminal.address,
    });
  };
  for (const id of Object.keys(records)) add(id, records[id]);
  return [...rows.values()];
}
