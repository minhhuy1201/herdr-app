# 02: Git Graph with basic lanes in the right panel

Spec: [docs/specs/git-graph.md](../../specs/git-graph.md). Read `~/.config/herdr-app/AGENTS.md` first. It defines mods, layouts, `exec`, `herdr-app check` and `herdr-app shot`. The type files `gpui-kit.d.ts` and `herdr.d.ts` in the app home define the API.

**What to build:** A new mod named `git-graph`. It shows the history of the focused terminal's repository as coloured commit lanes, newest first. It is the third tab of the right panel, beside Files and Changes. The person can see where branches fork and merge. Labels, the toggle, paging, live reload and expanding a commit come in later tickets. This ticket delivers a correct graph of the first 300 commits of `git log --all --date-order`.

Context for a cold start:
- Prior art to copy, not import (a mod can't import from another mod's folder): Better Changes (`mods/better-changes`).
  - It follows the repository: a 300ms context timer reads the focused terminal's `cwd` and machine, then runs `git rev-parse --show-toplevel`.
  - Its read-only git flags are `--no-optional-locks`, `-c core.fsmonitor=false` and `-c diff.autoRefreshIndex=false`.
  - Its design kit (`views/ui.js`) sets the look: 42px header, 28px rows, radius 10 framed `Panel`, theme tokens.
  - Its tests run real Git in temporary repositories.
- Layout: in `layouts/better-main.json`, the stack `panel-body` holds `files` and `changes`. Add a third child block with `id: "git-graph"` and `content.mod: "git-graph"`. Set `mod.json` to `place: "none"`. Otherwise Herdr docks a second copy at the window's root on first load. If a stray docked block appears anyway, remove it from the layout.
- The mod needs an icon, a git-branch glyph in Lucide style, inside its own folder. Ticket 05 uses it for the tab bar button.

**Blocked by:** 01 (Baseline commit)

**Model:** sonnet - new mod with lane-assignment logic across several files

**Status:** todo

- [ ] A pure graph model module with no Herdr imports, so `node --test` can import it as ESM. It takes the raw output of one NUL-separated `git log` call (hash, parent hashes, author, unix time, subject, raw `%D` refs) and returns rows. Each row holds the commit, its lane, its colour index, and the lines that pass through, branch off or merge into that row.
- [ ] Lane rules: a commit takes the lane reserved by its first child. Its first parent keeps that lane. Each other parent gets a free lane, or joins a lane that already waits for it. A lane is freed when nothing waits on it.
- [ ] `node --test` model cases pass: a linear history, one branch and merge, an octopus merge, two root commits, and lane reuse after a merge.
- [ ] `node --test` real-Git case passes: build a temporary repository with branches and a merge, run the mod's own log arguments, feed the output to the model, and assert the lane count and the merge row.
- [ ] Every git call is an argument list through `exec("git", [...], { cwd, on })`, with the read-only flags. The mod never writes to the repository.
- [ ] The view is a header ("Git Graph" plus a refresh icon button) and one `v_virtual_list` of 28px rows. Each row has the graph column (nodes and line segments drawn with absolutely-positioned `div`s, lane colours cycling theme `ansi` colours, merge commits muted), the subject (truncated), the author and the age in dim caption text.
- [ ] A remote space runs git on its machine (`on: space.machine`).
- [ ] A focused folder outside any repository shows "Not a Git repository". A repository with no commits shows "No commits yet".
- [ ] `herdr-app check ~/.config/herdr-app/mods/git-graph` passes. `layouts/better-main.json` has no `.error` file and `herdr-app status` shows no errors.
- [ ] After `herdr-app do layout.select '{"stack":"panel-body","child":"git-graph"}'` and `layout.show --id panel`, with a terminal focused in a real repository that has merges, `herdr-app shot` shows lanes joined at forks and merges. Read the PNG and confirm it.
- [ ] Commit with `caveman:caveman-commit` on `feat/git-graph`.
