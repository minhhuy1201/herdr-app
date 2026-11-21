# 04: Rename

Spec: [docs/specs/file-menu.md](../../specs/file-menu.md). Read `~/.config/herdr-app/AGENTS.md` and tickets 01 and 03 first.

**What to build:** On a file or folder (not the Panel root), the File menu shows Rename…. It replaces the row's name with a field holding the current name, with the part before the extension selected. Enter renames; an unchanged name closes the field and changes nothing. Bad names show the same error line as New File. A file previewed in the panel stays previewed under its new name; an open folder stays open under its new name. Hidden on Windows.

Context for a cold start:
- Ticket 03 added the inline name field, name validation and the `sh` command pattern in the *commands* module. Reuse them; a rename edit holds the original name.
- `InputState` has `set_selected_range({ start, end })` (the shipped `prompt` mod uses it). Select up to the last `.` for a file with an extension; select all for a folder, a dot file (`.env`) or a name without an extension.
- `my-files` keeps the previewed file as a path relative to the Panel root, and the open folders as a set of relative paths. After a rename, rewrite the entries that start with the old path.
- A Markdown viewer tab showing the renamed file is out of scope; it shows its existing "no longer available" message.

**Blocked by:** 03 (New File and New Folder)

**Model:** sonnet - reuses the field but adds selection and state-rewrite rules

**Status:** done (app check pending)

- [x] The *names* module returns the selection range for a name. Tests cover `a.md`, `archive.tar.gz` (up to the last dot), `.env`, `Makefile` and a folder.
- [x] The *commands* module returns the `sh` rename. It fails, without writing, if the new name exists. Tests run it for real in a temporary folder.
- [x] The *menu items* module adds Rename… for files and folders, not the Panel root, not on Windows.
- [x] The field opens in the row with the current name and the selection above.
- [x] Enter with a new valid name renames, closes the field and reloads the folder; an unchanged name closes the field with no command run.
- [x] A previewed file stays previewed after a rename; an open folder and its open sub-folders stay open.
- [x] `node --test tests/` passes in `my-files`; `herdr-app check` passes for `my-files` and `my-menu`.
- [ ] Tried in the app: rename a file, a folder with open sub-folders, and the previewed file.
