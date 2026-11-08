# 04: Expand a commit and open a file's diff

Spec: [docs/specs/git-graph.md](../../specs/git-graph.md). Read `~/.config/herdr-app/AGENTS.md`, the `git-graph` mod from ticket 02, and Better Changes' `pick` (`mods/better-changes/views/diff.js`) and `syncSelection` / `diffFile` / `diffArgs` first.

**What to build:** A click on a commit row expands it in place. The person sees the full message, the author, the date, a hash to copy, and the changed files. A click on a file opens its diff in the Better Changes centre tab.

**Blocked by:** 02 (Git Graph with basic lanes)

**Model:** sonnet - depends on Better Changes' shared-state shape, with async loading and stale-result guards

**Status:** implemented, commit pending

- [ ] A click on a commit expands it under its row inside the same virtual list. The lanes keep drawing through the expanded rows. A second click collapses it. One commit is expanded at a time.
- [ ] The expanded area shows: the subject and body, wrapped; the author and the local date; the short hash with a copy icon that writes the full hash to the clipboard (look up the clipboard write call in `gpui-kit.d.ts`); and the files from `git show --numstat --name-status -z --format= --diff-merges=first-parent <hash>`, each with a file icon, a name, a dim folder, `+n` and `−n`.
- [x] Loading shows "Loading…". A slow answer for a commit that is no longer expanded, or for another repository, is dropped (use token guards, as Better Changes does).
- [x] A click on a file writes the same shared state Better Changes' `pick` writes for scope `commit`:
  - `shared("better-changes.selection")`
  - `shared("better-changes.diff-tabs")[space.id] = { source, selection, pending }`, with `source = { cwd: <repository root>, on: <machine or null> }`. Key order matters: `cwd` first, then `on`, because `selection.context` must be `JSON.stringify(source)`.
  - The selection carries `commit: { hash, short, subject }` and `file: { path, add, del, binary, status }`.
  
  Then it renames and selects the existing Better Changes diff tab in that space, or runs `tab.new` with `mod: "better-changes"` and `props: { mode: "diff", space, source, selection }`. Repeated clicks reuse one tab.
- [x] Without Better Changes installed (no `mods/better-changes/mod.json` under `appHome()`), a file click only highlights the file.
- [ ] `herdr-app check` passes. On a real repository, expand a commit, click a file, and confirm with `herdr-app shot` that the Better Changes tab shows that commit's diff for the file. Test a second file in the same commit, and a file in another commit, to confirm the tab is reused.
- [ ] Commit with `caveman:caveman-commit`.
