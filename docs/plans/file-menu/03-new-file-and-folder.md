# 03: New File and New Folder with an inline name field

Spec: [docs/specs/file-menu.md](../../specs/file-menu.md). Read `~/.config/herdr-app/AGENTS.md` and ticket 01 first.

**What to build:** On a folder or the Panel root, the File menu shows New File… and New Folder…. Choosing one opens the folder and shows an empty name field at the top of its children, like Zed. Enter makes the item; Esc or a click elsewhere cancels. A bad name keeps the field open with a red error line under it. The new item appears at once and does not open. The items are hidden on Windows.

Context for a cold start:
- Ticket 01 added the *menu items* and *names* modules, the `file` kind in `my-menu`, and the `nextCommand()` loop in `my-files`. Ticket 02 may have added the *commands* module; if not, create it here.
- Text input: `gpui-base` `InputState` + `Input`. The shipped `prompt` mod shows the pattern: `InputState.new({ value })`, `on("change")`, `on("submit")`, `on("blur")`, `focus()`, and a delayed second `focus()` after the popup closes.
- `my-files` loads one folder's entries with its `loadFolder(path, context)`; call it for the parent after a change instead of waiting for the folder watch or the 10-second timer. Remote spaces have no watch.
- File changes go through `exec("sh", ["-c", script, "files", ...paths], { on })`, paths as positional arguments, never spliced into the script, so a remote space's change runs on its machine.

**Blocked by:** 01 (Open the File menu)

**Model:** sonnet - a new inline input with name validation rules

**Status:** done (app check pending)

- [x] The *names* module validates a name against the folder's existing names: empty, contains `/`, is `.` or `..`, or already taken each return an error message; a valid name returns none. Tests cover each case and a name with only spaces.
- [x] The *commands* module returns the `sh` invocation for new file and new folder. They fail, without writing, if the target already exists (it may have appeared after validation). Tests run them for real in a temporary folder with `child_process` and assert the files on disk, with names that have spaces, quotes and a leading `-`.
- [x] The *menu items* module adds New File… and New Folder… for folders and the Panel root, not files, and not on Windows.
- [x] Choosing an item opens the folder and shows the field at the top of its children, focused.
- [x] Enter with a valid name makes the item, closes the field and reloads that folder; the item does not open.
- [x] Enter with a bad name shows the red error line and keeps the field and its text.
- [x] Esc or a click elsewhere cancels. A right-click or a second edit cancels the open field first.
- [x] A failed command shows an error toast with its stderr.
- [x] `node --test tests/` passes in `my-files`; `herdr-app check` passes for `my-files` and `my-menu`.
- [ ] Tried in the app: a file and a folder made in a nested folder and at the Panel root; a `herdr-app shot` of the field with an error.
