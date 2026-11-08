# 06: Markdown icon on viewer tabs and fork note

Spec: [docs/specs/md-viewer.md](../../specs/md-viewer.md), sections "Tab icon" and "Upstream note". Read `~/.config/herdr-app/AGENTS.md` first.

**What to build:** In the tab bar, a viewer tab shows the Material markdown file icon instead of the terminal glyph. `docs/upstream-forks.md` records the new behaviour of the `my-files` and `my-tabs` forks.

Context for a cold start:
- `my-tabs` picks each tab's icon from the program of the tab's pane, and falls back to the terminal glyph; a mod pane has no program. Follow the same `image(...)` pattern it uses for full-colour program icons.
- The Material icon is `markdown.svg` in `my-files`'s `icons/material/` folder. Reference it by its home-relative path; a mod may load images from another mod's folder by path.
- `docs/upstream-forks.md` has a table row per fork.

**Blocked by:** 01 (Open a markdown file from Files in a Preview tab)

**Model:** haiku - two files, follows the existing icon pattern in `my-tabs`, no interface change

**Status:** todo

- [ ] A tab whose pane has `mod === "md-viewer"` shows the Material markdown icon at the same size as other tab icons; other tabs are unchanged.
- [ ] `docs/upstream-forks.md`: the `my-files` row adds "Markdown files open in an `md-viewer` tab"; the `my-tabs` row adds "Markdown icon for `md-viewer` tabs".
- [ ] `herdr-app check` passes for `my-tabs`; `herdr-app status` shows no errors.
- [ ] In the app with a viewer tab open, `herdr-app shot` shows the markdown icon in the tab bar. Read the PNG and confirm it.
- [ ] Commit with `caveman:caveman-commit`.
