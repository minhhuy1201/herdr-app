# 05: `my-tabs`, an icon-only tab bar

Spec: [docs/specs/git-graph.md](../../specs/git-graph.md). Read `~/.config/herdr-app/AGENTS.md` (Layouts: shipped mods are read-only, so clone them) and Herdr's shipped `tabs` mod first.

**What to build:** The tab bar in the `better-main` layout shows icons only, each with a tooltip. The panel buttons are Files, Changes and the new Git Graph. Terminal tabs show the program icon, with the tab's name in a tooltip. Nothing else about the bar changes.

**Blocked by:** 02 (Git Graph with basic lanes). It needs the `git-graph` panel node and the mod's icon.

**Model:** sonnet - clones a mod, edits the layout and changes the enabled-panels logic

**Status:** implemented, commit pending

- [ ] Make the clone with `herdr-app do mod.clone '{"name":"tabs","as":"my-tabs"}'`. Never edit `mods/tabs` itself, because Herdr restores it on start. In `layouts/better-main.json`, point the block that shows `tabs` at `my-tabs`, keeping its size and `window_drag`. Add `mods/my-tabs/` to the allowlist in `.gitignore` if it is missing.
- [ ] The panel buttons are 26px squares with only an icon and `.tooltip(label)` ("Files", "Changes", "Git Graph"), plus an `accessibility_label`. The active panel's button keeps the `selected` background. A click toggles the panel exactly as before, through `layout.select` on `panel-body` and `layout.show` / `layout.hide` on `panel`.
- [ ] The enabled panels are `shared("workspace.panels") ?? ["files", "changes"]` plus `git-graph` whenever the layout has that node. The per-space panel memory (`syncPanel`) restores `git-graph` like the others.
- [ ] Terminal tab pills show only the program icon (tinted SVG or image, as before). A tab with no program icon uses a generic terminal glyph. `.tooltip(name)` gives the tab's display name, with the zoom mark. The working spinner, the blocked or done dot, and the active tab's close button stay. Double-click rename, drag to reorder, right-click menu and scroll-to-switch still work.
- [ ] The + button and the window buttons don't change.
- [ ] `herdr-app check ~/.config/herdr-app/mods/my-tabs` passes, and `herdr-app status` shows no errors. `herdr-app shot` shows the icon-only bar. Hover each panel button and a tab, then confirm the tooltips in a screenshot.
- [ ] Commit with `caveman:caveman-commit`.
