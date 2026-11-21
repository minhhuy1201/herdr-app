# 05: Duplicate

Spec: [docs/specs/file-menu.md](../../specs/file-menu.md). Read `~/.config/herdr-app/AGENTS.md` and ticket 01 first.

**What to build:** On a file or folder (not the Panel root), the File menu shows Duplicate. It copies the item next to itself with a Zed-style name and does not open the copy: `report.md` becomes `report copy.md`, then `report copy 2.md`, `report copy 3.md`; a folder `src` becomes `src copy`. The folder reloads at once. Hidden on Windows.

Context for a cold start:
- Ticket 01 added the *menu items* and *names* modules and the `nextCommand()` loop in `my-files`. If tickets 02 or 03 added the *commands* module, extend it; otherwise create it with the `sh` pattern: `exec("sh", ["-c", script, "files", ...paths], { on })`, paths as positional arguments.
- The folder's existing names are the loaded entries for that folder in `my-files`. They may be capped at 500 entries; the copy command must still refuse to overwrite.
- Zed's naming: the suffix goes before the last extension; a dot file (`.env`) is all name, so `.env copy`.

**Blocked by:** 01 (Open the File menu)

**Model:** sonnet - adds a naming rule

**Status:** done (app check pending)

- [x] The *names* module returns the next free duplicate name given a name, whether it is a folder, and the existing names. Tests cover `a.md`, `a copy.md` already taken, `a copy 2.md` taken, `.env`, `Makefile`, `archive.tar.gz` and a folder.
- [x] The *commands* module returns the `sh` copy: recursive for folders, failing without writing if the target exists. Tests run it for real in a temporary folder, including a folder with files inside and names with spaces.
- [x] The *menu items* module adds Duplicate for files and folders, not the Panel root, not on Windows.
- [x] Duplicate makes the copy, reloads the folder and does not open it; a failure shows an error toast with its stderr.
- [x] `node --test tests/` passes in `my-files`; `herdr-app check` passes for `my-files` and `my-menu`.
- [ ] Tried in the app: duplicate a file twice and a folder once.
