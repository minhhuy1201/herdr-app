# 04: Reload the viewer when the file changes

Spec: [docs/specs/md-viewer.md](../../specs/md-viewer.md), section "Reload". Read `~/.config/herdr-app/AGENTS.md` first (`watchFolder`, `cx.spawn`, `cx.timer`, "Never keep a `cx`").

**What to build:** When the shown markdown file changes on disk, for example an agent edits it, the viewer reloads the text and redraws in its current mode. A file on another machine is checked every 10 seconds.

Context for a cold start:
- The viewer mod `md-viewer` comes from ticket 01; ticket 02 may have added the mode switch.
- `watchFolder(dir)` works here only. It resolves with changed paths; a returned root path means refresh everything. On Linux, trees above 4096 directories reject the watch: fall back to the 10-second poll.
- Prior art: `my-files`'s `watch` loop and its context guard against stale tasks.

**Blocked by:** 01 (Open a markdown file from Files in a Preview tab)

**Model:** sonnet - local watch plus remote poll with fallback branching

**Status:** todo

- [ ] Local file: a loop awaits `watchFolder(<file's folder>)` and rereads the file when its path, or the folder root, is in the result.
- [ ] Remote file (`props().on` set), or a rejected watch: reread every 10 seconds; redraw only when the text changed.
- [ ] Reload keeps the current mode. Old editor states are released.
- [ ] A file deleted while open shows the missing-file message; it comes back if the file is recreated.
- [ ] The loop stops when the viewer closes (no work after `close`).
- [ ] `herdr-app check` passes for `md-viewer`; `herdr-app status` shows no errors.
- [ ] In the app: open a markdown file, append a heading to it from a terminal; `herdr-app shot` shows the new heading within a few seconds. Read the PNG and confirm it.
- [ ] Commit with `caveman:caveman-commit`.
