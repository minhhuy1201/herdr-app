# 01: Baseline commit

Spec: [docs/specs/git-graph.md](../../specs/git-graph.md)

**What to build:** The first commit on the local repository, so each later ticket has a diff to review. The Herdr app home (`~/.config/herdr-app`) is a fresh Git repository on the branch `feat/git-graph`, with no commits yet. Its allowlist `.gitignore` tracks only the files the person owns.

**Blocked by:** None (can start immediately)

**Model:** haiku - stages and commits files that already exist, with no logic

**Status:** todo

- [ ] `git status` shows only allowlisted paths: `.gitignore`, `docs/`, `keys.json`, `settings.json`, `layouts/better-main.json`, `mods/better-changes/`, `mods/better-sidebar/`. It shows no `.d.ts`, no `jsconfig.json` and no app-written state such as `view.json`, `shared.json` or `layouts/.state/`.
- [ ] Before committing, the branch is `feat/git-graph` (check with `git rev-parse --abbrev-ref HEAD`). Don't commit on `main`.
- [ ] One commit holds everything. Its message comes from `caveman:caveman-commit`, for example `chore: track personal herdr layout, mods and git-graph spec`.
- [ ] Nothing is pushed. The repository has no remote.
