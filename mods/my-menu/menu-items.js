// The File menu's items for one target. No Herdr imports, so node --test runs them.
// target: { dir, isRoot, open, on, platform }. `on` and `platform` decide which
// later groups show (local-only, write items); the copy group is always there.
// Write items need a known Unix: `platform` is null while a remote machine's OS is unknown.

const item = (group, label, action) => ({ group, label, command: `my-files.${action}` });

export function fileMenuItems(target) {
  const { dir, isRoot, open, on, platform } = target;
  const local = !on;
  const unix = platform === "linux" || platform === "macos";
  const launch = local ? [item("open", "Open in Default App", "open-default")] : [];
  const make = dir && unix ? [item("new", "New File…", "new-file"), item("new", "New Folder…", "new-folder")] : [];
  const copy = [item("copy", "Copy Path", "copy-path"), item("copy", "Copy Relative Path", "copy-relative-path")];
  const change = !isRoot && unix ? [item("change", "Rename…", "rename"), item("change", "Duplicate", "duplicate"), item("change", "Move to Trash", "trash")] : [];
  const fold = dir && (open || isRoot) ? [item("fold", "Collapse All", "collapse-all")] : [];
  return [...launch, ...make, ...copy, ...change, ...fold];
}
