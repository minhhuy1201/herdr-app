// Path helpers for the File menu. No Herdr imports, so node --test runs them.

const trim = (p) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

// The path relative to the Panel root; the root itself is ".".
// A path outside the root comes back unchanged.
export function relativePath(root, path) {
  const r = trim(root), p = trim(path);
  if (p === r) return ".";
  return p.startsWith(r + "/") ? p.slice(r.length + 1) : p;
}

// The error message for a new name in a folder, or null when it is fine.
// `existing` holds the folder's current names.
export function validateName(name, existing) {
  const n = name.trim();
  if (n === "") return "Name cannot be empty";
  if (n.includes("/")) return "Name cannot contain /";
  if (n === "." || n === "..") return `"${n}" is not a valid name`;
  if (existing.includes(n)) return `"${n}" already exists`;
  return null;
}

export const parentOf = (path) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
export const baseName = (path) => path.slice(path.lastIndexOf("/") + 1);

// The part of a name the rename field selects: up to the last dot of a file with an
// extension, the whole name for folders, dot files and names without an extension.
export function renameSelection(name, isDir) {
  const dot = name.lastIndexOf(".");
  return { start: 0, end: isDir || dot <= 0 || dot === name.length - 1 ? name.length : dot };
}

// Where a tree path ends up after `from` is renamed to `to`: paths at or under `from` move.
export function moveTreePath(path, from, to) {
  if (path === null || path === undefined) return path;
  if (path === from) return to;
  return path.startsWith(from + "/") ? to + path.slice(from.length) : path;
}

// The next free "copy" name, like Zed: the suffix goes before the last extension; folders,
// dot files and names without an extension take it at the end. `existing` holds the folder's names.
export function duplicateName(name, isDir, existing) {
  const dot = name.lastIndexOf(".");
  const split = isDir || dot <= 0 ? name.length : dot;
  const stem = name.slice(0, split), ext = name.slice(split);
  for (let n = 1; ; n++) {
    const candidate = `${stem} copy${n > 1 ? ` ${n}` : ""}${ext}`;
    if (!existing.includes(candidate)) return candidate;
  }
}
