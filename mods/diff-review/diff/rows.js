export const MAX_LINES = 3000;
export const MAX_LENGTH = 2000;

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)/;
const BINARY = /^(Binary files .* differ|GIT binary patch)$/m;

const cut = (text) => (text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH)}…` : text);

function pairRuns(lines) {
  const rows = [];
  let removed = [];
  let added = [];
  const flush = () => {
    const count = Math.max(removed.length, added.length);
    for (let i = 0; i < count; i++) rows.push({ kind: "pair", left: removed[i] ?? null, right: added[i] ?? null });
    removed = [];
    added = [];
  };
  for (const line of lines) {
    if (line.kind === "-") removed.push(line.cell);
    else if (line.kind === "+") added.push(line.cell);
    else {
      flush();
      if (line.kind === "@") rows.push({ kind: "hunk", text: line.text });
      else if (line.kind === " ") rows.push({ kind: "pair", left: line.cell, right: line.right });
    }
  }
  flush();
  return rows;
}

// The file's status letter comes from the header: line counts cannot tell an emptied
// file from a deleted one, and a binary diff has no lines at all.
function headerStatus(lines) {
  if (lines.some((line) => line.startsWith("new file mode "))) return "A";
  if (lines.some((line) => line.startsWith("deleted file mode "))) return "D";
  return "M";
}

export function parseDiff(text) {
  const all = text.replace(/\n$/, "").split("\n");
  const first = all.findIndex((line) => HUNK.test(line));
  const status = headerStatus(first < 0 ? all : all.slice(0, first));
  if (first < 0) {
    if (BINARY.test(text)) return { type: "binary", status };
    if (/^Subproject commit /m.test(text)) return { type: "mode", note: "Submodule change", status };
    if (/^(old|new) mode /m.test(text)) return { type: "mode", note: "Mode change", status };
    return { type: "empty", status };
  }
  const body = all.slice(first);
  if (body.some((line) => /^[-+]Subproject commit /.test(line))) return { type: "mode", note: "Submodule change", status };
  const truncated = body.length > MAX_LINES;
  let oldLine = 0;
  let newLine = 0;
  const lines = [];
  for (const raw of body.slice(0, MAX_LINES)) {
    const hunk = HUNK.exec(raw);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      lines.push({ kind: "@", text: raw });
      continue;
    }
    const kind = raw[0];
    const text = cut(raw.slice(1));
    if (kind === "-") lines.push({ kind, cell: { line: oldLine++, text, kind } });
    else if (kind === "+") lines.push({ kind, cell: { line: newLine++, text, kind } });
    else if (kind === " ") {
      lines.push({
        kind,
        cell: { line: oldLine++, text, kind },
        right: { line: newLine++, text, kind },
      });
    }
    // "\ No newline at end of file" and other metadata consume no line number.
  }
  return { type: "rows", rows: pairRuns(lines), truncated, status };
}

export function addedFile(text) {
  if (text.includes("\0")) return { type: "binary" };
  if (!text) return { type: "empty" };
  const lines = text.replace(/\n$/, "").split("\n");
  return parseDiff([`@@ -0,0 +1,${lines.length} @@`, ...lines.map((line) => `+${line}`)].join("\n"));
}
