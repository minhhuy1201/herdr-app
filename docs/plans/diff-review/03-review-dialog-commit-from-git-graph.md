# 03: Review dialog for a Commit, opened from the Git Graph

Spec: [docs/specs/diff-review.md](../../specs/diff-review.md). Terms: [GLOSSARY.md](../../../GLOSSARY.md). Read `~/.config/herdr-app/AGENTS.md` and the `diff-review` mod from ticket 02 first.

**What to build:** In the Git Graph, a click on a file of an expanded Commit opens the Review dialog for the whole Commit:

- Header: the Commit's short hash in `dim`, its subject (truncated) and its file count.
- A 300px file list on the left with a 1px `border` on its right. Rows as in the Changes panel: Material file icon, name, folder in `dim`, `+N` / `−N`, status letter (ticket 01's colours). The selected row is `selected`; rows never round.
- The clicked file is selected on open and its side-by-side diff fills the right. Clicking another row, or Up / Down, selects that file and loads its diff then (not all at once).
- A Merge commit's files are measured against its first parent, as the Git Graph's expanded Commit already does.
- Props: `{ kind: "commit", root, on, hash, path }`. The Git reads module gains the Commit's subject, its files (name status and numstat against the first parent) and one file's patch in the Commit.
- The Git Graph's file click opens the dialog with `openOverlay` and still records the selected file so the row stays highlighted. It no longer writes Better Changes' shared selection or opens its centre tab. Without the `diff-review` mod, the click only highlights. Update or remove the Git Graph code and tests that only served the old centre-tab handoff, and the matching lines in `docs/specs/git-graph.md`.

**Blocked by:** 02 (the dialog, diff module and Git reads)

**Model:** sonnet - new Git reads and a new file list view, plus a changed click in the Git Graph

**Status:** todo

- [ ] Git reads tests pass against a real temporary repository: a Commit's files with status and counts; a Merge commit measured against its first parent; one file's patch in a Commit.
- [ ] In the app, a click on a file of a Commit with many files opens the dialog on that file; another row and Up / Down change the shown diff.
- [ ] The Git Graph no longer opens Better Changes' centre tab on a file click; `docs/specs/git-graph.md` says the click opens the Review dialog.
- [ ] `node --test tests/` passes in `git-graph` and `diff-review`; `herdr-app check` passes for both; `herdr-app status` shows `"errors": []`; a `herdr-app shot` shows the list and the diff side by side.
