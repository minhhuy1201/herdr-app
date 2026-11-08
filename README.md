# herdr-app config

My personal configuration for the [Herdr](https://herdr.dev) desktop app: the files Herdr reads from `~/.config/herdr-app/`. It is for my own use, not a published layout or mod.

## Platforms

The config targets macOS, Linux and Windows. Herdr's own mods handle the platform differences (window buttons, keys, shells), and these mods keep those code paths.

Every change here was made and tested only on **Linux (Fedora 45)**. On macOS and Windows it is untested.

## What is here

Only the files I own are tracked (see `.gitignore`). Herdr writes and rewrites everything else.

| Path | What it is |
| --- | --- |
| `layouts/better-main.json` | The window: a clone of Herdr's `main` layout, flat (no borders, gaps or rounded pane frames). |
| `keys.json` | Key bindings, including `ctrl-alt-1/2/3` for the Files, Changes and Git Graph panels. |
| `settings.json` | Zoom, fonts, `github-dark` theme, telemetry off. |
| `themes/github-dark.json` | The terminal and panel theme. |
| `programs.json` | A pixel icon for Claude Code. |
| `mods/better-sidebar/` | Spaces and agents in one sidebar: pixel sprites per space (wuxia themed, Alt-click to change), Claude Code subagents nested under their agent, git branch and PR status per space. |
| `mods/my-tabs/` | The tab bar: flat text tabs underlined in the accent color, and the side panel toggles. |
| `mods/my-files/` | The Files panel, with Material file icons. |
| `mods/better-changes/` | The Changes panel (read-only git status, diffs, commits), with Material file icons. |
| `mods/git-graph/` | The Git Graph panel. |
| `docs/` | Specs and plans for larger changes. |

## Network and programs

- `better-sidebar` runs `gh pr ...` with my GitHub login to show PR status per space, cached for 60 s. Set `pull_request_status: false` in its `mod.json` settings to turn it off.
- Links to commits and PRs open in the browser only when clicked.
- The mods run `git` (read-only), `sh` (listing folders, reading `~/.claude/` subagent metadata) and `hc` locally. Nothing else reaches the network.

## Checks

```sh
herdr-app check mods/<name>
(cd mods/<name> && node --test tests/)
```

## Credits

- Pixel sprite idea from [pilmokim/herdr-pixel-spaces](https://github.com/pilmokim/herdr-pixel-spaces) (Apache-2.0); the sprites are new.
- Claude Code subagent lookup from [h0ru5/herdr-agents-tree](https://github.com/h0ru5/herdr-agents-tree) (Apache-2.0).
- File icons from [Material Icon Theme](https://github.com/material-extensions/vscode-material-icon-theme) (MIT); license in `icons/material/LICENSE.txt` of each mod that ships them.
- The mods are clones of Herdr's shipped mods (Apache-2.0).
