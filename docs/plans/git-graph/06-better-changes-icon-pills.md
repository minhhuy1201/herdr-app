# 06: Icon-only pills in Better Changes

Spec: [docs/specs/git-graph.md](../../specs/git-graph.md). Read `~/.config/herdr-app/AGENTS.md` first.

**What to build:** The header pills of the Better Changes sidebar, Changes and Commits, show only an icon and their count badge. Each has a tooltip naming the tab.

**Blocked by:** None (can start immediately)

**Model:** haiku - 2 files (the design kit's `HeaderTab` and its two callers in the sidebar view), following the existing `IconButton` pattern (`.tooltip(label)` plus `.accessibility_label(label)`), with no new logic

**Status:** implemented, commit pending

- [ ] `HeaderTab` takes an `icon` and draws `Icon(icon, 14)` instead of the visible label text. The label moves to `.tooltip(label)` and `.accessibility_label(label)`. The badge, the active style, the hover and `role("tab")` stay.
- [ ] Changes uses a changes or diff glyph. Commits uses the existing `commit` icon. If a new SVG is needed, add it to Better Changes' `icons/` folder in the same Lucide style.
- [ ] Better Changes is edited in place: it is a personal install, not a mod Herdr ships. No clone is needed.
- [ ] `herdr-app check ~/.config/herdr-app/mods/better-changes` passes. `herdr-app shot` with the Changes panel open shows two icon pills with badges.
- [ ] Commit with `caveman:caveman-commit`.
