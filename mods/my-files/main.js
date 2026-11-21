// A lazy file browser for the focused pane's folder, with bounded read-only previews.
import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState, InputState, Input } from "gpui-base";
import { spaces, panes, focused, exec, run, readTextFile, watchFolder, theme, settings, window, shared, setShared, machines, openOverlay, notify, nextCommand } from "herdr";
import { fileKind, isMarkdown } from "./file-kind.js";
import { viewerTabs, decide, sync, normalisePath } from "./viewer-tabs.js";
import { relativePath, validateName, duplicateName, renameSelection, moveTreePath, parentOf, baseName } from "./names.js";
import { openDefaultCommand, terminalFolder, newItemCommand, renameCommand, duplicateCommand, trashCommand } from "./commands.js";

function location() {
  const space = spaces().find(s => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on, space: space?.id };
}
const key = () => JSON.stringify(location());
const LANG = { ts: "js", tsx: "js", mts: "js", cts: "js", jsx: "js", mjs: "js", toml: "yaml", jsonc: "json", svelte: "html", vue: "html" };
const PER_FOLDER = 500, TOTAL = 5000;

async function directory(path, on) {
  const windowsDirectory = async () => {
    // Windows PowerShell otherwise uses the console code page; exec decodes UTF-8.
    // Links keep directory attributes even when dangling; check their target.
    // Other reparse points (OneDrive's folders) have no LinkType and are folders.
    // PowerShell reads curly single quotes as quotes too, so they're doubled like '.
    const r = await exec("powershell", ["-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); & { param($p) @(Get-ChildItem -LiteralPath $p -Force -ErrorAction Stop | Where-Object Name -ne '.git' | Select-Object -First 501 | ForEach-Object { @{ name=$_.Name; dir=($_.PSIsContainer -and (-not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -or -not $_.LinkType -or ($_.Target -and [IO.Directory]::Exists(([IO.Path]::Combine([IO.Path]::GetDirectoryName($_.FullName), $_.Target[0])))))) } }) | ConvertTo-Json -Compress } '" + path.replace(/['‘’‚‛]/g, "$&$&") + "'"], { on });
    if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
    const result = JSON.parse(r.stdout || "[]");
    return Array.isArray(result) ? result : [result];
  };
  if (!on && window()?.platform === "windows") return windowsDirectory();
  const script = 'n=0; for p in "$1"/* "$1"/.[!.]* "$1"/..?*; do [ -e "$p" ] || [ -L "$p" ] || continue; name=${p##*/}; [ "$name" = .git ] && continue; if [ -d "$p" ]; then kind=d; else kind=f; fi; printf "%s\\0%s\\0" "$kind" "$name"; n=$((n+1)); [ "$n" -gt 500 ] && break; done; test -d "$1"';
  let r;
  try { r = await exec("sh", ["-c", script, "files", path], { on }); }
  catch (e) {
    if (on && String(e).includes("cannot start sh: program not found")) return windowsDirectory();
    throw e;
  }
  if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
  const fields = r.stdout.split("\0"), out = [];
  for (let i = 0; i + 1 < fields.length; i += 2) out.push({ name: fields[i + 1], dir: fields[i] === "d" });
  return out;
}

const INDENT = 16;

// One column per ancestor folder, each with a vertical line under that folder's icon.
function guides(depth, t) {
  return h_flex().flex_none().h_full().children(Array.from({ length: depth }, (_, i) =>
    div().w(INDENT).h_full().flex_none().child(div().ml(7).w(1).h_full().bg(t.border))));
}

export default class Files extends View {
  init(_props, cx) {
    this.saved = new Map();
    this.entries = new Map(); this.folders = new Set(); this.pending = new Set(); this.marks = {};
    this.refresh(cx);
    cx.timer.every(10000, cx => this.refresh(cx));
    cx.spawn(async cx => { for (;;) { this.command(await nextCommand(), cx); cx.notify(); } });
  }

  // The File menu acts on the item last right-clicked; mod commands carry no arguments.
  openMenu(path, entry, cx) {
    this.cancelEdit();
    if (!this.root) return;
    const isRoot = path === "";
    const absolute = isRoot ? this.root : `${this.root}/${path}`;
    const dir = isRoot || Boolean(entry?.dir);
    this.menuTarget = { path: absolute, dir, root: this.root, on: this.on, isRoot, open: isRoot || this.folders.has(path), platform: window()?.platform, rel: path, space: location().space };
    const { rel, space, ...target } = this.menuTarget;
    openOverlay({ mod: "my-menu", kind: "popup", frame: "none", width: 280, props: { tab: "file", target } });
  }

  command(name, cx) {
    const target = this.menuTarget;
    if (!target) return;
    if (name === "copy-path" || name === "copy-relative-path") {
      cx.write_to_clipboard(name === "copy-path" ? target.path : relativePath(target.root, target.path));
      notify({ title: "Copied path", level: "info" });
    } else if (name === "collapse-all") this.collapse(target.rel);
    else if (name === "open-terminal") run("tab.new", { space: target.space, folder: terminalFolder(target.path, target.dir) });
    else if (name === "new-file" || name === "new-folder") this.startEdit(name, target.rel, "", cx);
    else if (name === "rename") this.startEdit("rename", parentOf(target.rel), baseName(target.rel), cx, { original: baseName(target.rel), dir: target.dir });
    else if (name === "duplicate") this.duplicate(target, cx);
    else if (name === "trash") this.askTrash(target);
    else if (name === "trash-confirmed") this.trash(cx);
    else if (name === "open-default") this.launch(openDefaultCommand(target.platform, target.path), target.on, cx);
  }

  // The dialog names the item; the confirmation acts on this copy, not on a later right-click's target.
  askTrash(target) {
    if (target.isRoot || !trashCommand(target.platform, target.path)) return;
    this.trashTarget = target;
    openOverlay({ mod: "my-confirm", kind: "dialog", width: 380, height: 160, frame: "none", props: { title: `Move "${baseName(target.rel)}" to Trash?`, detail: "You can restore it from the system trash.", command: { name: "my-files.trash-confirmed" } } });
  }

  trash(cx) {
    const target = this.trashTarget;
    this.trashTarget = null;
    if (!target) return;
    const folder = parentOf(target.rel), name = baseName(target.rel);
    const command = trashCommand(target.platform, target.path);
    const context = this.context, on = this.on;
    cx.spawn(async (cx) => {
      const r = await exec(command.cmd, command.args, { on }).catch((e) => ({ code: 1, stderr: String(e?.message ?? e) }));
      if (r.code !== 0) notify({ title: "Could not move " + name + " to Trash", body: (r.stderr || "").trim() || `exit ${r.code}`, level: "error" });
      else if (this.current(context)) {
        this.collapse(target.rel);
        if (this.file && (this.file === target.rel || this.file.startsWith(target.rel + "/"))) this.show(null);
      }
      try { if (this.current(context)) await this.loadFolder(folder, context); } catch (e) { if (this.current(context)) this.error = String(e); }
      cx.notify();
    });
  }

  duplicate(target, cx) {
    const folder = parentOf(target.rel), original = baseName(target.rel);
    const name = duplicateName(original, target.dir, (this.entries.get(folder) ?? []).map((e) => e.name));
    const command = duplicateCommand(parentOf(target.path), original, name);
    const context = this.context, on = this.on;
    cx.spawn(async (cx) => {
      const r = await exec(command.cmd, command.args, { on }).catch((e) => ({ code: 1, stderr: String(e?.message ?? e) }));
      if (r.code !== 0) notify({ title: "Could not duplicate " + original, body: (r.stderr || "").trim() || `exit ${r.code}`, level: "error" });
      try { if (this.current(context)) await this.loadFolder(folder, context); } catch (e) { if (this.current(context)) this.error = String(e); }
      cx.notify();
    });
  }

  launch(command, on, cx) {
    cx.spawn(async (cx) => {
      const r = await exec(command.cmd, command.args, { on }).catch((e) => ({ code: 1, stderr: String(e?.message ?? e) }));
      if (r.code !== 0) notify({ title: "Could not run " + command.cmd, body: (r.stderr || "").trim() || `exit ${r.code}`, level: "error" });
    });
  }

  // One inline name field at a time: { kind, folder, input, error, armed }. `folder` is the
  // tree path of the folder whose children show the field ("" is the Panel root).
  // A rename edit also holds `original` (the current name) and `dir`; its field replaces that row.
  startEdit(kind, folder, value, cx, rename = {}) {
    this.cancelEdit();
    if (folder !== "" && !this.folders.has(folder)) this.toggle(folder, cx);
    const input = InputState.new({ value });
    const edit = { kind, folder, input, error: null, armed: false, ...rename };
    const select = () => { if (kind === "rename") input.set_selected_range(renameSelection(value, Boolean(rename.dir))); };
    input.on("submit", (_e, cx) => this.submitEdit(edit, cx));
    // The menu popup closing takes focus back, so blur only cancels once the field has been focused again.
    input.on("blur", (_e, cx) => { if (edit.armed && this.edit === edit) { this.cancelEdit(); cx.notify(); } });
    input.on("change", (_e, cx) => { if (edit.error) { edit.error = null; cx.notify(); } });
    this.edit = edit;
    input.focus();
    select();
    cx.timer.after(600, (cx) => { if (this.edit !== edit) return; input.focus(); select(); edit.armed = true; cx.notify(); });
  }

  cancelEdit() {
    this.edit?.input.release();
    this.edit = null;
  }

  submitEdit(edit, cx) {
    if (this.edit !== edit) return;
    const name = edit.input.value().trim();
    const renaming = edit.kind === "rename";
    if (renaming && name === edit.original) { this.cancelEdit(); cx.notify(); return; }
    const error = validateName(name, (this.entries.get(edit.folder) ?? []).map((e) => e.name));
    if (error) { edit.error = error; cx.notify(); return; }
    const parent = edit.folder ? `${this.root}/${edit.folder}` : this.root;
    if (renaming) { this.submitRename(edit, parent, name, cx); return; }
    const command = newItemCommand(edit.kind === "new-folder" ? "folder" : "file", parent, name);
    const context = this.context, on = this.on, folder = edit.folder;
    this.cancelEdit();
    cx.notify();
    cx.spawn(async (cx) => {
      const r = await exec(command.cmd, command.args, { on }).catch((e) => ({ code: 1, stderr: String(e?.message ?? e) }));
      if (r.code !== 0) notify({ title: "Could not create " + name, body: (r.stderr || "").trim() || `exit ${r.code}`, level: "error" });
      try { if (this.current(context)) await this.loadFolder(folder, context); } catch (e) { if (this.current(context)) this.error = String(e); }
      cx.notify();
    });
  }

  submitRename(edit, parent, name, cx) {
    const command = renameCommand(parent, edit.original, name);
    const context = this.context, on = this.on, folder = edit.folder, original = edit.original;
    this.cancelEdit();
    cx.notify();
    cx.spawn(async (cx) => {
      const r = await exec(command.cmd, command.args, { on }).catch((e) => ({ code: 1, stderr: String(e?.message ?? e) }));
      if (r.code !== 0) notify({ title: "Could not rename " + original, body: (r.stderr || "").trim() || `exit ${r.code}`, level: "error" });
      else if (this.current(context)) this.moveState(folder ? `${folder}/${original}` : original, folder ? `${folder}/${name}` : name);
      try { if (this.current(context)) await this.loadFolder(folder, context); } catch (e) { if (this.current(context)) this.error = String(e); }
      cx.notify();
    });
  }

  moveState(from, to) {
    const move = (p) => moveTreePath(p, from, to);
    this.folders = new Set([...this.folders].map(move));
    this.entries = new Map([...this.entries].map(([p, e]) => [move(p), e]));
    this.pending = new Set([...this.pending].map(move));
    if (this.file) this.file = move(this.file);
  }

  editRow(depth, t) {
    const edit = this.edit;
    return v_flex().id("files-edit").flex_none()
      .on_key_down((e, cx) => { if (e.key === "escape") { this.cancelEdit(); cx.stop_propagation(); cx.notify(); } })
      .child(h_flex().h(28).pl(8).pr(8).items_center()
        .child(guides(depth, t))
        .child((edit.kind === "new-folder" || edit.dir ? image("mods/my-files/icons/material/folder.svg") : image("mods/my-files/icons/material/file.svg")).size(16).flex_none().mr(7))
        .child(Input.new(edit.input).flex_1().min_w(0).h(24).px(6).border_1().border_color(edit.error ? t.ansi1 : t.accent).bg(t.background).text_size(13).text_color(t.foreground)))
      .when(Boolean(edit.error), el => el.child(div().pl(8 + depth * INDENT + 23).pb(2).text_size(11).text_color(t.ansi1).child(edit.error)));
  }

  // Closes a folder and every folder inside it; "" is the Panel root.
  collapse(path) {
    for (const folder of [...this.folders]) if (path === "" || folder === path || folder.startsWith(path + "/")) {
      this.folders.delete(folder);
      this.entries.delete(folder);
    }
  }

  watch(root, cx) {
    if (this.on || this.watched === root) return;
    this.watched = root;
    const context = this.context;
    cx.spawn(async cx => {
      try { while (this.context === context) { await watchFolder(root); if (this.current(context)) this.refresh(cx); } }
      catch { if (this.context === context) this.watched = null; }
    });
  }

  current(context) {
    return this.context === context && key() === context.key;
  }

  async loadFolder(path, context) {
    const { on, cwd: root } = context;
    const entries = await directory(path ? `${root}/${path}` : root, on);
    if (!this.current(context) || (path && !this.folders.has(path))) return;
    const used = [...this.entries.entries()].filter(([p]) => p !== path).reduce((n, [, e]) => n + e.length, 0);
    this.entries.set(path, entries.slice(0, Math.max(0, Math.min(PER_FOLDER, TOTAL - used))).sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name)));
    if (entries.length > PER_FOLDER || used + entries.length > TOTAL) this.limited = true;
  }

  refresh(cx) {
    const { cwd, on } = location(), next = key();
    if (next !== this.context?.key) {
      if (this.context) this.saved.set(this.context.key, { folders: this.folders, file: this.file });
      const saved = this.saved.get(next);
      this.context = { key: next, cwd, on }; this.root = cwd; this.on = on; this.entries = new Map(); this.folders = new Set(saved?.folders);
      this.pending = new Set(); this.marks = {}; this.show(null); this.watched = null; this.error = null; this.limited = false;
      this.loading = false;
      if (saved?.file) this.show(saved.file, cx);
    }
    if (!cwd || this.loading) return;
    const context = this.context;
    this.loading = true;
    this.limited = false;
    cx.spawn(async cx => {
      try {
        for (const path of ["", ...this.folders]) {
          if (!this.current(context)) return;
          await this.loadFolder(path, context);
        }
        const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on }).catch(() => null);
        const marks = {};
        if (top?.code === 0) {
          // Writes nothing under .git (index lock, fsmonitor cookie): the folder watch would refresh again.
          const status = await exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"], { cwd, on }).catch(() => null);
          if (status?.code === 0) for (const entry of status.stdout.split("\0").filter(Boolean).slice(0, TOTAL)) {
            const xy = entry.slice(0, 2);
            marks[`${top.stdout.trim()}/${entry.slice(3)}`] = xy === "??" || xy.includes("A") ? "A" : xy.includes("U") ? "U" : xy.includes("D") ? "D" : "M";
          }
        }
        if (!this.current(context)) return;
        this.marks = marks; this.error = null; this.watch(cwd, cx);
      } catch (e) { if (this.current(context)) this.error = String(e); }
      finally { if (this.context === context) this.loading = false; cx.notify(); }
    });
  }

  toggle(path, cx) {
    if (this.folders.has(path)) {
      for (const folder of [...this.folders]) if (folder === path || folder.startsWith(path + "/")) {
        this.folders.delete(folder);
        this.entries.delete(folder);
      }
    } else {
      this.folders.add(path);
      if (!this.entries.has(path) && !this.pending.has(path)) {
        const context = this.context;
        this.pending.add(path);
        cx.spawn(async cx => {
          try { await this.loadFolder(path, context); }
          catch (e) { if (this.current(context)) this.error = String(e); }
          finally { if (this.context === context) this.pending.delete(path); cx.notify(); }
        });
      }
    }
    cx.notify();
  }

  openMarkdown(path) {
    const target = { file: normalisePath(`${this.root}/${path}`), on: this.on ?? null };
    const choice = decide(shared("md-viewer.tabs"), target, spaces(), panes());
    if (choice.select) { run("tab.select", { id: choice.select }); return; }
    this.openPending = { target, before: viewerTabs(spaces(), panes()), at: Date.now() };
    run("tab.new", { name: path.split("/").pop(), mod: "md-viewer", props: target });
  }

  // run() returns no tab id, so a new viewer tab is bound on a later render.
  syncTabs() {
    const stored = shared("md-viewer.tabs") ?? {};
    const ready = machines().every(m => m.layout === "ready");
    const out = sync({ stored, pending: this.openPending ?? null, ready, now: Date.now() }, spaces(), panes());
    this.openPending = out.pending;
    if (out.changed) setShared("md-viewer.tabs", out.registry);
  }

  show(path, cx) {
    this.code?.release(); this.code = null; this.file = path; this.fileError = null;
    if (!path || !cx) return;
    const context = this.context, root = this.root, on = this.on;
    cx.spawn(async cx => {
      try {
        const text = await readTextFile(`${root}/${path}`, { on });
        if (this.file !== path || !this.current(context)) return;
        if (text === null) { this.fileError = "This file is no longer available"; return; }
        if (text.includes("\0")) { this.fileError = "Binary file · no text preview"; return; }
        const t = theme(), ext = path.includes(".") ? path.split(".").pop() : "txt";
        this.code = EditorState.new({ language: LANG[ext] ?? ext, readonly: true,
          value: text.length > 400000 ? text.slice(0, 400000) + "\n… (file truncated)" : text,
          font_family: settings().font_family, font_size: 12,
          syntax: { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6 } });
      } catch { if (this.file === path && this.current(context)) this.fileError = "Cannot preview this file (binary, too large, or unreadable)"; }
      finally { cx.notify(); }
    });
  }

  rows(prefix, depth, out, t) {
    if (out.length >= TOTAL || depth > 40) return out;
    if (this.edit && this.edit.folder === prefix && this.edit.kind !== "rename") out.push(this.editRow(depth, t));
    for (const entry of this.entries.get(prefix) ?? []) {
      if (out.length >= TOTAL) break;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name, open = this.folders.has(path), mark = this.marks[`${this.root}/${path}`];
      const kind = fileKind(entry.name, entry.dir, open);
      if (this.edit?.kind === "rename" && this.edit.folder === prefix && this.edit.original === entry.name) {
        out.push(this.editRow(depth, t));
        if (entry.dir && open) this.rows(path, depth + 1, out, t);
        continue;
      }
      out.push(h_flex().id(`file-${path}`).h(28).flex_none().pl(8).pr(8).items_center().cursor_pointer().hover(s => s.bg(t.hover))
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); this.openMenu(path, entry, cx); })
        .on_click((_e, cx) => { this.cancelEdit(); entry.dir ? this.toggle(path, cx) : isMarkdown(entry.name) ? this.openMarkdown(path) : this.show(path, cx); })
        .child(guides(depth, t))
        .child(image(`mods/my-files/icons/material/${kind}.svg`).size(16).flex_none().mr(7))
        .child(div().flex_1().min_w(0).truncate().child(entry.name))
        .when(Boolean(mark), el => el.child(div().flex_none().ml(7).text_size(11).text_color(mark === "A" ? t.ansi2 : mark === "D" ? t.ansi1 : t.ansi3).child(mark))));
      if (entry.dir && open) this.rows(path, depth + 1, out, t);
    }
    return out;
  }

  render(cx) {
    if (key() !== this.context?.key) this.refresh(cx);
    this.syncTabs();
    const t = theme();
    const rootMenu = (_e, cx) => { cx.stop_propagation(); this.openMenu("", null, cx); };
    return v_flex().id("files").size_full().min_h(0).overflow_hidden().bg(t.chrome).text_color(t.foreground).text_size(13)
      .child(h_flex().id("files-title").h(42).flex_none().px(14).gap(8).items_center().on_mouse_down("right", rootMenu)
        .when(Boolean(this.file), el => el.child(div().id("files-back").w(20).cursor_pointer().text_color(t.muted).on_click((_e, cx) => { this.show(null); cx.notify(); }).child("←")))
        .child(div().font_semibold().truncate().child(this.root?.split(/[\\/]/).pop() || "Files"))
        .child(div().flex_1().min_w(0).truncate().text_right().text_size(12).text_color(t.dim).child(this.file ?? "")))
      .when(!this.file, el => el.child(v_flex().id("files-tree").flex_1().min_h(0).overflow_y_scrollbar().p(6).on_mouse_down("right", rootMenu).children(this.rows("", 0, [], t))
        .when(Boolean(this.error) || !this.entries.get("")?.length, el => el.child(div().p(8).text_size(12).text_color(t.dim).child(this.error || (this.loading ? "Loading files…" : this.root ? "No files" : "No folder"))))
        .when(this.limited, el => el.child(div().p(8).text_size(11).text_color(t.dim).child("File list limited to 500 entries per folder and 5,000 total")))))
      .when(Boolean(this.file), el => el.child(this.code ? Editor.new(this.code).flex_1().min_h(0) : div().p(12).text_color(t.dim).child(this.fileError || "Loading file…")));
  }
}
