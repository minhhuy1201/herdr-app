# 04: Search field filters a Commit's files

Spec: [docs/specs/diff-review.md](../../specs/diff-review.md). Read `~/.config/herdr-app/AGENTS.md` and the `diff-review` mod from tickets 02 and 03 first.

**What to build:** In the Review dialog for a Commit, a search field sits above the file list (32px, square, 1px `border` below, no other frame). It has the keyboard when the dialog opens. Typing filters the list to files whose path contains the query, ignoring case. "No matching files" shows when nothing matches. Up / Down move only through the filtered list. The filter lives in this dialog only and resets when the dialog closes. The Working change dialog has no search field. The filter is a pure function in the diff module, tested there.

**Blocked by:** 03 (the Commit dialog and its file list)

**Model:** sonnet - a filtering rule and keyboard handling

**Status:** todo

- [ ] Filter tests pass: substring anywhere in the path; case ignored; empty query keeps every file; no match gives an empty list.
- [ ] In the app, typing `sidebar` in a Commit that changed `views/sidebar.js` leaves that file listed; a query with no match shows "No matching files".
- [ ] The field has the keyboard on open; Up / Down step through the filtered rows only.
- [ ] `node --test tests/` passes in `diff-review`; `herdr-app check` passes; `herdr-app status` shows `"errors": []`.
