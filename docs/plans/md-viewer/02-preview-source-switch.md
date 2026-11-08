# 02: Switch between Preview and Source

Spec: [docs/specs/md-viewer.md](../../specs/md-viewer.md). Read `~/.config/herdr-app/AGENTS.md` first (keys sections, `<mod>.<command>` and `nextCommand()`). Terms: `GLOSSARY.md` (Preview mode, Source mode).

**What to build:** The Markdown viewer's header has a two-segment `Preview | Source` control. Source mode shows the raw markdown in a read-only editor with line numbers, soft wrap and markdown syntax colours. `ctrl-shift-m` changes the mode while the viewer has focus. Each viewer tab keeps its own mode.

Context for a cold start:
- The viewer mod `md-viewer` comes from ticket 01. Its header row already shows the file name.
- `EditorState.new({ language: "markdown", readonly: true, line_numbers: true, soft_wrap: true, ... })`; use the same syntax colour mapping as the code blocks. If the editor has no markdown grammar, plain text is acceptable.
- Keys: `keys.json` sections `mod:<name>` deliver `"<mod>.<command>"` actions to that mod's `nextCommand()` loop. Editing `keys.json` makes the whole file the person's own; add only the new section.

**Blocked by:** 01 (Open a markdown file from Files in a Preview tab)

**Model:** sonnet - adds mode state and a key binding rule

**Status:** todo

- [ ] The header shows `Preview | Source`; the active segment uses theme `selected`/`accent` styling, the other is muted; hover feedback on both.
- [ ] Source mode is a read-only `Editor` with line numbers and soft wrap, terminal font, theme syntax colours. Text can be selected and copied; typing changes nothing.
- [ ] `keys.json` has `"mod:md-viewer": { "ctrl-shift-m": "md-viewer.toggle" }`; no `keys.error` appears. The viewer's `nextCommand()` loop toggles the mode on `toggle`.
- [ ] Two viewer tabs keep separate modes when switching between them.
- [ ] Editor states are released when replaced or when the viewer closes.
- [ ] `herdr-app check` passes for `md-viewer`; `herdr-app status` shows no errors.
- [ ] In the app: click the switch and press `ctrl-shift-m`; `herdr-app shot` shows Source mode with line numbers. Read the PNG and confirm it.
- [ ] Commit with `caveman:caveman-commit`.
