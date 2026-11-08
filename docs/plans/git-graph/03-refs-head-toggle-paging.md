# 03: Ref labels, HEAD, branch toggle, paging and live reload

Spec: [docs/specs/git-graph.md](../../specs/git-graph.md). Read `~/.config/herdr-app/AGENTS.md` and the `git-graph` mod from ticket 02 first.

**What to build:** The graph shows where every ref points and where the person is. It can focus on the current branch, loads more history on scroll, and stays current when refs change in any terminal.

**Blocked by:** 02 (Git Graph with basic lanes)

**Model:** sonnet - ref parsing and lane continuity across pages are new logic

**Status:** implemented, commit pending

- [x] The model parses `%D` into labels: local branches, remote branches and tags, plus `HEAD -> <branch>`. A local branch and its remote on the same commit show as one label (`main | origin`). Tags have their own style. Labels sit after the graph column, before the subject.
- [x] The checked-out branch's label has a ✓. The HEAD commit's node is a ring and its row is tinted. A detached HEAD still marks its commit.
- [x] A header toggle switches between all branches (`--all`, the default) and the current branch only (`HEAD`). The choice persists in the mod's `localStorage` and has a tooltip.
- [x] The first load is 300 commits. Scrolling to the end loads the next 300 with `--skip`, and lanes continue across the page boundary. A model test covers two pages that join into the same rows as one big page.
- [x] Live reload: a local repository is watched with `watchFolder` on its git directory (refs, HEAD, packed-refs), and the graph reloads on change. A remote repository polls every 10 seconds. A reload keeps the scroll position. The refresh button reloads at once and spins its icon natively (`.spin`, not a timer).
- [x] A hidden or inactive panel keeps its timers gentle: at most one poll every 10 seconds.
- [x] `node --test` passes, including the new ref-label and paging cases.
- [ ] `herdr-app check` passes. `herdr-app shot` on a real repository with tags and remote branches shows the labels, the ✓ and the HEAD ring. Make a commit in a terminal and confirm the graph updates without a click.
- [ ] Commit with `caveman:caveman-commit`.
