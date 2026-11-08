# 05: Changes panel's commit list opens the Commit dialog

Spec: [docs/specs/diff-review.md](../../specs/diff-review.md). Read `~/.config/herdr-app/AGENTS.md`, the `diff-review` mod and how ticket 03 opened it from the Git Graph first.

**What to build:** In the Changes panel's commit list (the Commits header button), a click on a file of a Commit opens the Review dialog for that Commit with props `{ kind: "commit", root, on, hash, path }`, exactly as the Git Graph does. The branch range group ("committed" against a base), conflicts, and patches handed over by other mods keep opening Better Changes' centre tab.

**Blocked by:** 03 (the Commit dialog)

**Model:** sonnet - adds a scope branch in Better Changes' file click

**Status:** todo

- [ ] In the app, a click on a file of a Commit in the Changes panel's commit list opens the Commit dialog on that file.
- [ ] A click on a file in the branch range group or a conflicted file still opens Better Changes' centre tab.
- [ ] `node --test tests/` passes in `better-changes`; `herdr-app check` passes; `herdr-app status` shows `"errors": []`.
