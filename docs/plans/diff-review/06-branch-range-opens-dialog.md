# 06: Changes panel's "Committed" group opens the one-file dialog

Spec: [docs/specs/diff-review.md](../../specs/diff-review.md). Terms: [GLOSSARY.md](../../../GLOSSARY.md) (Branch range). Read `~/.config/herdr-app/AGENTS.md`, the `diff-review` mod and how ticket 05 branched Better Changes' file click first.

**What to build:** In the Changes panel's "Committed" group (Better Changes' `committed` scope: the Branch range, base..HEAD), a click on a file opens the Review dialog for that one file, laid out like a Working change: header with the path and the status letter, side-by-side diff only, no file list, no search field. The diff runs from the merge base to `HEAD`.

- Props contract: `{ kind: "range", root, on, base, path }`. `base` is the full merge base hash already held in `this.committed.base` (from `readCommitted` in `better-changes/git/reads.js`).
- `better-changes/git/review.js`: `reviewProps` returns the range props for scope `committed` (conflicts still return null). Pass `base` in through its options object next to `root`, `on`, `commit`, and update the caller in `better-changes/views/diff.js` `pick()`.
- `diff-review/diff/reads.js`: add `readRangeFile(git, base, path)`: `--literal-pathspecs diff --unified=3 --no-ext-diff --no-textconv --no-color <base> HEAD -- <path>`, parsed with `parseDiff`; a nonzero exit throws like `readCommitFile`.
- `diff-review/main.js`: accept `kind: "range"` and load it through `readRangeFile`. It renders exactly as the Working change branch (`Header(path, statusOf(state))`, `body`). Update the props comment at the top.

**Blocked by:** 05

**Model:** sonnet - one new props kind and one read, following tickets 02 and 05

**Status:** done (criterion 3 checked by opening the dialog with real range props from a throwaway mod: `herdr-app status` showed the `diff-review` overlay and no errors; `herdr-app shot` is stale here, so no visual check, and no real click)

Watch out:
- `init(_props, cx)` gets no overlay props: keep using `props()` from `"herdr"`.
- `statusOf` reads the letter off the diff, so a range file's letter comes from its diff (A for a new file, D for a deleted one, M otherwise). Do not pass a scope of `untracked`.
- A renamed file is read by its new path only, so it shows as added. The spec puts rename detection out of scope.
- `HEAD` is read when the dialog opens, not when the panel listed the file. If a Commit lands in between, the dialog shows the newer range. Accept this.
- Avoid editing several mod files at once while a dialog is open: hot reload can leave the overlay stuck. Close it with `herdr-app do overlay.close`.

- [x] `reviewProps` unit tests in `better-changes`: scope `committed` gives `{ kind: "range", root, on, base, path }`; a conflicted file and a missing `base` give null.
- [x] `diff-review` reads test against a real temporary repository (`GIT_CONFIG_GLOBAL=/dev/null`): a branch with two Commits over a base shows both Commits' lines in one file's range diff; an uncommitted edit to that file is not in it; a file added on the branch reads as all added.
- [ ] In the app, a click on a file in the "Committed" group opens the one-file dialog with the merge base to HEAD diff; Escape closes it.
- [x] A click on a conflicted file still opens Better Changes' centre tab.
- [ ] `node --test tests/` passes in `diff-review` and `better-changes`; `herdr-app check` passes for both; `herdr-app status` shows `"errors": []`; a `herdr-app shot` of a range file dialog.
