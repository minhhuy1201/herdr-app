# 01: Open a markdown file from Files in a Preview tab

Spec: [docs/specs/md-viewer.md](../../specs/md-viewer.md). Read `~/.config/herdr-app/AGENTS.md` first. It defines mods, `tab.new {mod, props}`, `herdr-app check` and `herdr-app shot`. The type files `gpui-kit.d.ts` and `herdr.d.ts` in the app home define the API. Terms: `GLOSSARY.md` (Markdown viewer, Preview mode).

**What to build:** A click on a markdown file in the Files panel of the `better-main` layout opens a new tab in the current space. The tab's only pane is a new mod, `md-viewer`, that shows the file in Preview mode: formatted text in a centred column, a sans font with real bold and italic, and fenced code blocks with theme syntax colours. Other files keep the inline code view. This ticket opens a new tab on every click; duplicate handling is ticket 03.

Context for a cold start:
- The Files panel is the personal clone `my-files`. Its row click calls `show(path)` for files. Its `show` already builds a read-only `EditorState` with the syntax colour mapping the spec names; reuse that mapping.
- Prior art for pure modules and tests: `my-files`'s `file-kind` module and its `node:test` file (ESM import, no Herdr imports).
- Prototype result (2026-11-08) that set the rendering. Trimmed to the decision-rich part:

  ```js
  // markdown segments: TextView; fenced code: read-only Editor, sized to its lines
  v_flex().w_full().max_w(860).mx_auto().px(40).py(32).gap(12)
    .font_family("Inter").text_size(15).line_height(1.6)
    .children(parts.map((p, i) => p.state
      ? v_flex().rounded(6).bg(t.surface).border(1).border_color(t.border).p(12)
          .h(lines * 20 + 26).child(Editor.new(p.state).size_full())
      : TextView.markdown(`md${i}`, p.md).selectable(true)))
  ```
  The outer element scrolls (`overflow_y_scrollbar`) with `bg(background)`. Code editors: `readonly: true, line_numbers: false, folding: false`, terminal font `settings().font_family`, 13px.
- Fonts: Herdr draws variable fonts without bold (Adwaita Sans, Noto Sans, Geist all failed). Use static Inter. Get it with `gh release download v4.1 --repo rsms/inter -p Inter-4.1.zip` into a scratch folder, then copy `extras/ttf/Inter-{Regular,Italic,Bold,BoldItalic,SemiBold}.ttf` and `LICENSE.txt` into the mod's `fonts/` folder. Herdr loads mod fonts at start and on a look change: after adding them, run `herdr-app do app.theme --name <current theme from settings.json>` to load them without a restart.
- A mod pane's `props()` holds exactly the props passed to `tab.new`; it has no pane or tab id.
- The repo tracks only listed paths (`.gitignore` is an allow-list).

**Blocked by:** None (can start immediately)

**Model:** sonnet - new mod with fence-splitting logic across several files

**Status:** done (real click and clipboard copy need a human check)

- [ ] Work is on branch `feat/md-viewer` (create it from `main` before the first commit). The spec, this plan and the glossary terms go in the first commit.
- [ ] Pure splitter module in `md-viewer`, no Herdr imports: markdown text in, ordered segments out (`{ md }` or `{ lang, code }`), following the CommonMark fence rules in the spec.
- [ ] `node --test` splitter cases pass: no fences; ``` with a language; ~~~; longer closing fence; shorter inner fence that does not close; fence indented 3 spaces and 4 spaces (not a fence); unclosed fence; empty file; markdown before and after code.
- [ ] Pure `isMarkdown(name)` in `my-files` (case-insensitive `.md`, `.markdown`, `.mdx`); `node --test` cases beside the `fileKind` tests, including `README.MD` and `notes.md.bak` (false).
- [ ] `md-viewer` has `mod.json` with `place: "none"`; reads `props().file` with `readTextFile(file, { on: props().on })`; shows a header row with the file name, then Preview mode as specified.
- [ ] Missing, unreadable or binary file (contains `\0`) shows a message in the tab. Text over 400,000 characters is cut with a note.
- [ ] Click on a markdown file in `my-files` runs `tab.new { name: <file name>, mod: "md-viewer", props: { file: <absolute path>, on } }`. Other files keep the inline view.
- [ ] Inter static fonts and the OFL license are in the mod's `fonts/` folder. `.gitignore` allows `mods/md-viewer/`.
- [ ] `herdr-app check` passes for `md-viewer` and `my-files`; `herdr-app status` shows no errors.
- [ ] In the app, click a real markdown file with headings, bold, a list, a table and a code block. `herdr-app shot` shows bold headings, bold text and coloured code. Read the PNG and confirm it. Select text and press ctrl-c; paste in a terminal to confirm copy works.
- [ ] Commit with `caveman:caveman-commit`.
