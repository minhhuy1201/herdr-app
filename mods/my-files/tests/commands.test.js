import { test } from "node:test";
import assert from "node:assert/strict";
import { revealCommand, openDefaultCommand, parentFolder, terminalFolder, trashCommand } from "../commands.js";

const DBUS = ["call", "--session", "--dest", "org.freedesktop.FileManager1", "--object-path", "/org/freedesktop/FileManager1", "--method", "org.freedesktop.FileManager1.ShowItems"];

test("linux reveal asks the file manager over D-Bus, falling back to the parent folder", () => {
  assert.deepEqual(revealCommand("linux", "/home/a/b.txt"), {
    cmd: "gdbus", args: [...DBUS, "['file:///home/a/b.txt']", ""],
    fallback: { cmd: "xdg-open", args: ["/home/a"] },
  });
});
test("linux reveal percent-encodes spaces, non-ASCII and quotes in the URI", () => {
  const r = revealCommand("linux", "/home/a/my dir/tệp 'x'.txt");
  assert.equal(r.args[DBUS.length], "['file:///home/a/my%20dir/t%E1%BB%87p%20%27x%27.txt']");
  assert.deepEqual(r.fallback.args, ["/home/a/my dir"]);
});
test("macos reveal is open -R", () => {
  assert.deepEqual(revealCommand("macos", "/Users/a/b c.txt"), { cmd: "open", args: ["-R", "/Users/a/b c.txt"] });
});
test("windows reveal selects in explorer and ignores its exit code", () => {
  assert.deepEqual(revealCommand("windows", "C:/Users/a/b c.txt"), { cmd: "explorer", args: ["/select,C:\\Users\\a\\b c.txt"], ignoreCode: true });
});
test("open-default follows the markdown viewer's opener rule", () => {
  assert.deepEqual(openDefaultCommand("linux", "/a b/é.pdf"), { cmd: "xdg-open", args: ["/a b/é.pdf"] });
  assert.deepEqual(openDefaultCommand("macos", "/a"), { cmd: "open", args: ["/a"] });
  assert.deepEqual(openDefaultCommand("windows", "C:\\a&b.txt"), { cmd: "rundll32", args: ["url.dll,FileProtocolHandler", "C:\\a&b.txt"] });
});
test("parentFolder", () => {
  assert.equal(parentFolder("/a/b/c.txt"), "/a/b");
  assert.equal(parentFolder("/c.txt"), "/");
});
test("terminal folder is the folder itself, or a file's parent", () => {
  assert.equal(terminalFolder("/a/b", true), "/a/b");
  assert.equal(terminalFolder("/a/b/c.txt", false), "/a/b");
});

import { newItemCommand } from "../commands.js";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, statSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const runIn = (c) => spawnSync(c.cmd, c.args, { encoding: "utf8" });
const NAMES = ["plain.txt", "with space.txt", "it's \"q\".txt", "-dash.txt", "--rf", "tệp.md"];

test("new file and new folder are made on disk for awkward names", () => {
  const dir = mkdtempSync(join(tmpdir(), "files-new-"));
  try {
    for (const n of NAMES) {
      assert.equal(runIn(newItemCommand("file", dir, n)).status, 0, n);
      assert.equal(runIn(newItemCommand("folder", dir, "d " + n)).status, 0, n);
    }
    for (const n of NAMES) {
      assert.ok(statSync(join(dir, n)).isFile(), n);
      assert.ok(statSync(join(dir, "d " + n)).isDirectory(), n);
    }
    assert.equal(readdirSync(dir).length, NAMES.length * 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("an existing file or folder is not overwritten", () => {
  const dir = mkdtempSync(join(tmpdir(), "files-new-"));
  try {
    writeFileSync(join(dir, "a"), "keep");
    for (const kind of ["file", "folder"]) {
      const r = runIn(newItemCommand(kind, dir, "a"));
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /exists/);
    }
    assert.equal(readFileSync(join(dir, "a"), "utf8"), "keep");
    execFileSync("ln", ["-s", "missing", join(dir, "dangling")]);
    assert.notEqual(runIn(newItemCommand("file", dir, "dangling")).status, 0);
    assert.equal(readdirSync(dir).length, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("paths are positional arguments, not part of the script", () => {
  const c = newItemCommand("file", "/a b", "x'; rm -rf ~ #");
  assert.equal(c.cmd, "sh");
  assert.deepEqual(c.args.slice(2), ["files", "/a b", "x'; rm -rf ~ #"]);
  assert.ok(!c.args[1].includes("rm"));
});

import { renameCommand } from "../commands.js";

test("rename moves a file or folder, for awkward names", () => {
  const dir = mkdtempSync(join(tmpdir(), "files-ren-"));
  try {
    writeFileSync(join(dir, "old name.txt"), "x");
    execFileSync("mkdir", [join(dir, "-dir")]);
    writeFileSync(join(dir, "-dir", "in.txt"), "y");
    assert.equal(runIn(renameCommand(dir, "old name.txt", "it's \"q\".txt")).status, 0);
    assert.equal(runIn(renameCommand(dir, "-dir", "--new")).status, 0);
    assert.deepEqual(readdirSync(dir).sort(), ["--new", "it's \"q\".txt"]);
    assert.equal(readFileSync(join(dir, "--new", "in.txt"), "utf8"), "y");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("rename fails without writing when the new name exists", () => {
  const dir = mkdtempSync(join(tmpdir(), "files-ren-"));
  try {
    writeFileSync(join(dir, "a"), "A");
    writeFileSync(join(dir, "b"), "B");
    execFileSync("ln", ["-s", "missing", join(dir, "dangling")]);
    for (const to of ["b", "dangling"]) {
      const r = runIn(renameCommand(dir, "a", to));
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /exists/);
    }
    assert.equal(readFileSync(join(dir, "a"), "utf8"), "A");
    assert.equal(readFileSync(join(dir, "b"), "utf8"), "B");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

import { duplicateCommand } from "../commands.js";

test("duplicate copies a file and a folder with its contents, for awkward names", () => {
  const dir = mkdtempSync(join(tmpdir(), "files-dup-"));
  try {
    writeFileSync(join(dir, "my file.txt"), "x");
    execFileSync("mkdir", ["-p", join(dir, "-src dir", "sub")]);
    writeFileSync(join(dir, "-src dir", "sub", "in it.txt"), "y");
    assert.equal(runIn(duplicateCommand(dir, "my file.txt", "my file copy.txt")).status, 0);
    assert.equal(runIn(duplicateCommand(dir, "-src dir", "-src dir copy")).status, 0);
    assert.equal(readFileSync(join(dir, "my file copy.txt"), "utf8"), "x");
    assert.equal(readFileSync(join(dir, "my file.txt"), "utf8"), "x");
    assert.equal(readFileSync(join(dir, "-src dir copy", "sub", "in it.txt"), "utf8"), "y");
    assert.equal(readFileSync(join(dir, "-src dir", "sub", "in it.txt"), "utf8"), "y");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("duplicate fails without writing when the target exists, even a dangling link or a folder", () => {
  const dir = mkdtempSync(join(tmpdir(), "files-dup-"));
  try {
    writeFileSync(join(dir, "a"), "A");
    writeFileSync(join(dir, "b"), "B");
    execFileSync("mkdir", [join(dir, "d")]);
    execFileSync("ln", ["-s", "missing", join(dir, "dangling")]);
    for (const to of ["b", "dangling", "d"]) {
      const r = runIn(duplicateCommand(dir, "a", to));
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /exists/);
    }
    assert.equal(readFileSync(join(dir, "b"), "utf8"), "B");
    assert.deepEqual(readdirSync(join(dir, "d")), []);
    assert.equal(readdirSync(dir).length, 4);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("linux trash is gio trash, with the path after -- so a leading dash stays data", () => {
  assert.deepEqual(trashCommand("linux", "/a/b c.txt"), { cmd: "gio", args: ["trash", "--", "/a/b c.txt"] });
  assert.deepEqual(trashCommand("linux", "-rf").args, ["trash", "--", "-rf"]);
});
test("macos trash asks Finder over osascript, the path as an argument", () => {
  assert.deepEqual(trashCommand("macos", "/Users/a/b.txt"), {
    cmd: "osascript",
    args: ["-e", "on run argv", "-e", 'tell application "Finder" to delete (POSIX file (item 1 of argv) as alias)', "-e", "end run", "/Users/a/b.txt"],
  });
});
test("windows has no trash command", () => {
  assert.equal(trashCommand("windows", "C:/a"), null);
});
