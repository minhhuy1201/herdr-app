export function stepPath(files, path, delta) {
  if (!files.length) return null;
  const at = files.findIndex((f) => f.path === path);
  if (at < 0) return files[0].path;
  return files[Math.max(0, Math.min(files.length - 1, at + delta))].path;
}

export function filterFiles(files, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return files;
  return files.filter((f) => f.path.toLowerCase().includes(needle));
}
