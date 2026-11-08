# 01: Status letter colours: yellow for changes, red only for deletions

Spec: [docs/specs/diff-review.md](../../specs/diff-review.md) (user story 36, "Status colours, everywhere"). Read `~/.config/herdr-app/AGENTS.md` first.

**What to build:** Every status letter in the Files panel (`my-files`), the Changes panel (`better-changes`) and the Git Graph's expanded Commit (`git-graph`) follows one rule: `A` is green (`ansi2`), `D` is red (`ansi1`), and every other letter (`M`, `R`, `C`, `T`, `U`) is yellow (`ansi3`). Today `M` uses the theme's derived `blocked` token, which shows red, so a modified file looks deleted. Each of the three mods has its own one-line colour rule for the letter; change each one. Mods cannot share code, so each keeps its own copy. Agent status colours (`blocked` on "Needs you" badges) are not status letters and stay as they are.

**Blocked by:** None (can start immediately)

**Model:** sonnet - touches three files in three mods, over the two-file limit for haiku

**Status:** done

- [ ] In Files, Changes and the Git Graph, `M`, `R`, `C`, `T` and `U` letters use `ansi3`; `A` uses `ansi2`; `D` uses `ansi1`. No status letter uses `blocked`.
- [ ] Agent status uses of `blocked` (badges in the sidebar and in the pane header) are unchanged.
- [ ] `node --test tests/` passes in `git-graph`, `better-changes` and `my-files`; `herdr-app check` passes for all three; `herdr-app status` shows `"errors": []`.
- [ ] A `herdr-app shot` of the Changes panel with a modified file shows a yellow `M`.
