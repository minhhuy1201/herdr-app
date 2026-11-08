# 02: Review dialog for one Working change

Spec: [docs/specs/diff-review.md](../../specs/diff-review.md). Terms: [GLOSSARY.md](../../../GLOSSARY.md). Read `~/.config/herdr-app/AGENTS.md`, `gpui-kit.d.ts` and `herdr.d.ts` first. Prior art: the `git-graph` mod (read-only Git runner, `node --test` tests against a real temporary repository, Material icons copied into the mod) and Better Changes' `diffRows` / `splitDiffRows` (unified diff parsing; copy what you need, a mod cannot import another mod's code).

**What to build:** In the Changes panel, a click on a staged, unstaged or untracked file opens the Review dialog for that one file: a flat dialog over the window showing its side-by-side diff (before on the left, after on the right), with a header holding the path and the status letter, and nothing else. Escape closes it. This ticket builds the new `diff-review` mod and its foundations, which tickets 03 to 05 reuse:

- The mod's manifest: placed nowhere, a dialog overlay of 88% by 86% of the window, `frame: "none"`. The mod draws its own square 1px `border`; no radius and no shadow anywhere in it.
- A pure diff module (no Herdr imports): unified diff text to side-by-side rows (hunk headers; context on both sides; removed lines paired with added lines in order, an empty cell on the shorter side); the 3000-line and 2000-character limits with a truncation flag; binary and mode-only output recognised.
- A Git reads module taking a `git(args)` runner with the Git Graph's read-only flags plus `--no-ext-diff --no-textconv --no-color --literal-pathspecs`: the cached diff for a staged path, the worktree diff for an unstaged path. An untracked file is read with `readTextFile` and shown as all added.
- The side-by-side view as the spec's "Look" describes: terminal font at 12px, 20px rows, two 50% halves with a 1px `border` between, line numbers per half, red and green row tints at low alpha, a missing cell in `border` at low alpha, hunk headers `dim` on `surface`, both halves scrolling sideways together, loading and error states, "Binary file", the truncation note.
- Props contract: `{ kind: "working", root, on, path, scope }` with `scope` one of `staged`, `unstaged`, `untracked`.
- Better Changes opens it with `openOverlay` for those three scopes. Conflicts and the branch range group still open Better Changes' centre tab.
- Add `mods/diff-review/` to the repository's `.gitignore` allowlist.

Watch out (from `session-diff`'s notes): handlers inside `v_virtual_list` row renderers can throw silently, so keep click handlers off virtual rows or draw rows yourself; theme colours can already be `#rrggbbaa`, so add alpha only to `#rrggbb`; a diff column inside an `h_flex` needs full height or it collapses; `herdr-app check` renders only the first state, so verify with `herdr-app shot`.

**Blocked by:** 01 (the status letter colour rule)

**Model:** sonnet - a new mod with new parsing logic and a new props interface

**Status:** todo

- [ ] Pure diff module tests pass: context on both sides; equal and unequal removed/added runs; new file (empty before); deleted file (empty after); several hunks with headers; line limit with truncation flag; binary and mode-only output.
- [ ] Git reads tests pass against a real temporary repository (`GIT_CONFIG_GLOBAL=/dev/null`): staged and unstaged diffs of the same file differ; an untracked file reads as all added.
- [ ] A click on a staged, an unstaged and an untracked file in the Changes panel each opens the dialog with the right diff; Escape closes it.
- [ ] A click on a conflicted file still opens Better Changes' centre tab.
- [ ] The dialog has square corners, a 1px border, no shadow and no buttons; the status letter follows ticket 01's colours.
- [ ] `herdr-app check` passes for `diff-review` and `better-changes`; `herdr-app status` shows `"errors": []`; a `herdr-app shot` shows both columns with a long line scrolled sideways.
- [ ] `git status` shows the new mod as tracked (allowlist updated).
