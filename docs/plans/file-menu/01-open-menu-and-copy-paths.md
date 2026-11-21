# 01: Open the File menu, copy paths, collapse folders

Spec: [docs/specs/file-menu.md](../../specs/file-menu.md). Read `~/.config/herdr-app/AGENTS.md` first. It defines mods, overlays, `nextCommand()`, `herdr-app check` and `herdr-app shot`. The type files `gpui-kit.d.ts` and `herdr.d.ts` in the app home define the API. Terms: `GLOSSARY.md` (File menu, Panel root).

**What to build:** In the `better-main` layout, a right-click on a file or folder row in the Files panel opens the File menu at the pointer. A right-click on the panel's empty space or its title opens the File menu for the Panel root. This ticket ships three working items: Copy Path, Copy Relative Path and Collapse All. The other items come in later tickets; do not show them yet.

Context for a cold start:
- The Files panel is the personal clone `my-files`. Its tree rows are built in its `rows()` method; a left-click toggles a folder or previews a file. The open folders are a set of paths relative to the Panel root; the Panel root's absolute path and the space's machine (`on`, null for this computer) are on the view.
- The menu is the personal clone `my-menu`. It builds items from `props().tab` and `props().target`; an item is `[label, command, args]` and runs `run(command, args)`. Its separators and icons are chosen from the command name. Add a `file` kind. Its items run mod commands such as `my-files.copy-path`; `run("<mod>.<command>")` delivers the command string to that mod's `nextCommand()` (`herdr.d.ts`, the `run` doc). Mod commands carry no arguments, so `my-files` keeps the right-clicked target itself.
- Prior art for opening the menu: `better-sidebar`'s space menu and `my-tabs`'s tab menu open `my-menu` with `kind: "popup"`, `frame: "none"`, `width: 280`.
- Clipboard: `cx.write_to_clipboard(text)` (`gpui-kit.d.ts`). Toast: `notify({ title, level })`.
- Pure modules with `node:test` tests and no Herdr imports are the house pattern: `my-files`'s `file-kind` and `viewer-tabs` and their tests. Run them with `node --test tests/` in the mod folder.
- The repo tracks only listed paths (`.gitignore` is an allow-list). New files under existing mod folders are tracked.

**Blocked by:** None (can start immediately)

**Model:** sonnet - touches `my-files` and `my-menu` and adds a new menu kind (an interface change)

**Status:** done (app check pending)

- [ ] A pure *menu items* module returns the File menu's ordered items for a target `{ dir, isRoot, open, on, platform }`. For this ticket: Copy Path and Copy Relative Path always; Collapse All only for an open folder (the Panel root counts as open). Its shape leaves room for the other groups in the spec's order.
- [ ] A pure *names* module returns the relative path from the Panel root. The Panel root itself gives `.`. Tests cover nested paths, the root and a trailing slash.
- [ ] `my-menu` shows the `file` kind with group separators and the same look and keys (↑/↓, Enter, Esc) as its other kinds.
- [ ] Right-click on a row opens the File menu for that item; right-click on the empty tree space or the title opens it for the Panel root.
- [ ] Copy Path puts the absolute path on the clipboard; Copy Relative Path puts the relative path. Both show a "Copied path" toast.
- [ ] Collapse All closes the folder and every open folder inside it; on the Panel root it closes all folders.
- [ ] `docs/upstream-forks.md` lists `my-menu`'s new `file` kind and the `my-files` right-click caller.
- [ ] `node --test tests/` passes in `my-files`; `herdr-app check` passes for `my-files` and `my-menu`.
- [ ] Tried in the app: each of the three items once on a file, a folder and the Panel root; a `herdr-app shot` of the open menu.
