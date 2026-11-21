# 06: Move to Trash with a confirm dialog

Spec: [docs/specs/file-menu.md](../../specs/file-menu.md). Read `~/.config/herdr-app/AGENTS.md` and ticket 01 first.

**What to build:** On a file or folder (not the Panel root), the File menu shows Move to Trash as its last item of the change group. It opens a confirm dialog "Move `<name>` to Trash?" with Move to Trash and Cancel buttons; Enter confirms, Esc cancels. Confirming moves the item to the system trash and reloads the folder. The dialog looks like `my-menu`: square corners, a 1px border, no Herdr frame. Hidden on Windows. There is no permanent delete.

Context for a cold start:
- Herdr's shipped `confirm` mod takes props `{ title, detail, command: { name, args } }` and runs `run(command.name, command.args)` on Enter. Clone it as `my-confirm` (`herdr-app do mod.clone '{"name":"confirm","as":"my-confirm"}'`), then give it `frame: "none"`, square corners and a 1px border as `my-menu` does (see `my-menu`'s `mod.json` `overlay.frame` and its root element). Open it with `command: { name: "my-files.trash-confirmed" }`: Herdr delivers `trash-confirmed` to `my-files`'s `nextCommand()`, which acts on the kept target.
- If the right-click target changes before confirmation, the confirmation must act on the item named in the dialog. Keep the pending trash target separate from the right-click target.
- Trash: Linux `gio trash -- <path>`; macOS `osascript -e 'on run argv' -e 'tell application "Finder" to delete (POSIX file (item 1 of argv) as alias)' -e 'end run' <path>`. Run through `exec(..., { on })`, no shell. A remote machine without `gio` fails; show the error toast.
- Close a preview of the trashed file, and drop the trashed folder and its children from the open folders.

**Blocked by:** 01 (Open the File menu)

**Model:** sonnet - new mod fork and per-platform commands

**Status:** done (app check pending)

- [ ] The *commands* module returns the trash program and arguments per platform. Tests assert them, including a path starting with `-` on Linux (after `--`).
- [ ] The *menu items* module adds Move to Trash for files and folders, not the Panel root, not on Windows.
- [ ] `my-confirm` exists as a clone of `confirm` with `cloned_from`, the `my-menu` look, and the same keys.
- [ ] Choosing Move to Trash opens the dialog with the item's name; Cancel or Esc changes nothing.
- [ ] Confirming moves the item to the trash (it can be restored from the file manager), reloads the folder and closes its preview if shown.
- [ ] A failure shows an error toast with its stderr.
- [ ] `docs/upstream-forks.md` lists the `my-confirm` fork and its copy is saved under `docs/upstream/<version>/`.
- [ ] `node --test tests/` passes in `my-files`; `herdr-app check` passes for `my-files`, `my-menu` and `my-confirm`.
- [ ] Tried in the app: trash a file and a folder, then restore one from the system trash; a `herdr-app shot` of the dialog.
