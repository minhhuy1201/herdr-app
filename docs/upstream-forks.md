# Upstream forks

Some files here are copies of files that Herdr ships. Herdr updates its own files on every start. It does not update these copies. After an update, use this note to find what Herdr changed and copy the changes you want into your copies.

## Forks

All forks were made from Herdr **0.1.13**. An exact copy of each source file at that version is in `docs/upstream/0.1.13/`.

| Fork | Herdr source | What the fork changes |
| --- | --- | --- |
| `layouts/better-main.json` | `layouts/main.json` | Flat look: no borders, gaps or rounded pane frames. Uses the `my-*` and `better-*` mods. Sets `"terminal_menu": "my-menu"`. |
| `mods/my-tabs/` | `mods/tabs/` | Flat text tabs underlined in the accent color, and side panel toggles. Right-clicking a tab opens `my-menu` with `frame: "none"` (`main.js:84`). Markdown icon for `md-viewer` tabs. |
| `mods/my-files/` | `mods/files/` | Material file icons. Markdown files open in an `md-viewer` tab. |
| `mods/my-palette/` | `frame/palette/` | Command palette. Square corners, no Herdr frame, opens as a centered dialog (`mod.json`). "Go to space or tab…" opens `my-picker`. |
| `mods/my-picker/` | `mods/picker/` | "Go to…" picker. Square corners, no Herdr frame, opens as a centered dialog. No title row; the search row has a bottom border. |
| `mods/my-menu/` | `mods/menu/` | Right-click menu. Square corners, no Herdr frame (`mod.json` `overlay.frame`), 1px border. Long labels wrap instead of being cut: rows use `min_h(31)` instead of `h(31)`, and the shortcut is `flex_none`. |
| `mods/my-status/` | `mods/workspace-status/` | Status bar. A click opens `my-palette`, and the key hint reads the `mod.open:my-palette` binding (`main.js:11`, `main.js:29`). |

`mods/better-sidebar/`, `mods/better-changes/` and `mods/git-graph/` have no `cloned_from` field. Their Herdr sources and versions are not recorded, so they are not tracked here.

## Bindings and callers that depend on the forks

If Herdr renames a command or changes how an overlay opens, check these:

- `keys.json`: `ctrl-shift-p` is `mod.open:my-palette` (Herdr's default is `app.palette`), and `ctrl-shift-k` is `mod.open:my-picker` (Herdr's default is `mod.open:picker`).
- `mods/better-sidebar/views/spaces.js` `menu()`: right-clicking a space opens `my-menu` with `frame: "none"`.
- `mods/my-tabs/main.js:84`: right-clicking a tab opens `my-menu` with `frame: "none"`.

These Herdr screens still use Herdr's own look. Nothing here replaces them:

- `app.palette`, run from any place other than the key or the status bar, opens Herdr's palette.
- Herdr opens `prompt` and `confirm` by itself.
- `frame/settings`, `frame/welcome`, `frame/whatsnew` and `frame/feedback` are rewritten on every start.

## After a Herdr update

1. Find the new version:

   ```sh
   herdr-app --version
   ```

2. See what Herdr changed in each source since the fork. Run this from `~/.config/herdr-app`:

   ```sh
   OLD=docs/upstream/0.1.13
   for f in $(cd "$OLD" && find . -type f | sort); do
     git diff --no-index --stat "$OLD/$f" "$f"
   done
   ```

   The loop prints a line only for files that changed. Remove `--stat` to see the full diff of one file.

3. Copy each change you want into its fork from the table above. Keep the fork's own changes.

4. Check every fork you changed:

   ```sh
   herdr-app check mods/<fork>
   (cd mods/<fork> && node --test tests/)   # only when the mod has tests
   ls *.error 2>/dev/null || true           # no output means no errors
   herdr-app status                          # "errors": []
   ```

5. Store the new sources as the next baseline, and update the version in this note and in each fork's `cloned_from`:

   ```sh
   NEW=$(herdr-app --version | awk '{print $2}')
   for f in $(cd docs/upstream/0.1.13 && find . -type f); do
     mkdir -p "docs/upstream/$NEW/$(dirname "$f")"
     cp "$f" "docs/upstream/$NEW/$f"
   done
   git rm -r -q docs/upstream/0.1.13
   ```

## Undo a fork

To go back to Herdr's version, point the caller back to Herdr's source, then delete the fork folder:

- `my-palette`: in `keys.json`, set `ctrl-shift-p` to `app.palette`.
- `my-picker`: in `keys.json`, set `ctrl-shift-k` to `mod.open:picker`. In `my-palette/main.js`, set the "Go to space or tab…" entry to `{ name: "picker" }`.
- `my-menu`: remove `"terminal_menu"` from `layouts/better-main.json`. Set `mod: "menu"` in `my-tabs/main.js:84` and in `better-sidebar/views/spaces.js` `menu()`.
- `my-status`: in `layouts/better-main.json`, set the status bar block's `mod` to `workspace-status`.

`ctrl-alt-shift-escape` always resets the window to Herdr's `main` layout when something breaks.
