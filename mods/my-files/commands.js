// Programs behind the File menu's actions. No Herdr imports, so node --test runs them.
// Each returns { cmd, args }.

// Copied from md-viewer's links.js: a mod cannot import another mod's folder.
export function openDefaultCommand(platform, path) {
  if (platform === "macos") return { cmd: "open", args: [path] };
  // Not `cmd /c start`: cmd would parse `&` in a path as a command separator.
  if (platform === "windows") return { cmd: "rundll32", args: ["url.dll,FileProtocolHandler", path] };
  return { cmd: "xdg-open", args: [path] };
}

// Makes a file or folder `name` inside `parent`. Paths are positional arguments so quotes and
// leading dashes stay data. Refuses to overwrite: the check also covers a name that appeared
// after validation, and noclobber makes the file create itself fail if it races.
export function newItemCommand(kind, parent, name) {
  const make = kind === "folder" ? 'mkdir -- "$t"' : 'set -C; : > "$t"';
  const script = `t="$1/$2"; if [ -e "$t" ] || [ -L "$t" ]; then echo "\\"$2\\" already exists" >&2; exit 1; fi; ${make}`;
  return { cmd: "sh", args: ["-c", script, "files", parent, name] };
}

// Renames `from` to `to` inside `parent`; refuses to overwrite, like newItemCommand.
export function renameCommand(parent, from, to) {
  const script = `t="$1/$3"; if [ -e "$t" ] || [ -L "$t" ]; then echo "\\"$3\\" already exists" >&2; exit 1; fi; mv -n -- "$1/$2" "$t"`;
  return { cmd: "sh", args: ["-c", script, "files", parent, from, to] };
}

// Copies `from` to `to` inside `parent` (folders recursively); refuses to overwrite, like newItemCommand.
// `cp -n` makes the copy itself skip an existing file if one appears after the check.
export function duplicateCommand(parent, from, to) {
  const script = `t="$1/$3"; if [ -e "$t" ] || [ -L "$t" ]; then echo "\\"$3\\" already exists" >&2; exit 1; fi; cp -R -n -- "$1/$2" "$t"`;
  return { cmd: "sh", args: ["-c", script, "files", parent, from, to] };
}

// Moves `path` to the system trash; null where there is none (Windows hides the item).
// A leading dash is safe: gio takes the path after `--`, osascript takes it as an argument.
export function trashCommand(platform, path) {
  if (platform === "macos") return { cmd: "osascript", args: ["-e", "on run argv", "-e", 'tell application "Finder" to delete (POSIX file (item 1 of argv) as alias)', "-e", "end run", path] };
  if (platform === "windows") return null;
  return { cmd: "gio", args: ["trash", "--", path] };
}
