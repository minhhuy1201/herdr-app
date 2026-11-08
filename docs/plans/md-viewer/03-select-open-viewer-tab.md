# 03: Select the open viewer tab instead of opening a duplicate

Spec: [docs/specs/md-viewer.md](../../specs/md-viewer.md), section "Open-or-select". Read `~/.config/herdr-app/AGENTS.md` first (`shared`/`setShared`, `spaces()`, `panes()`, `tab.select`). Terms: `GLOSSARY.md`.

**What to build:** A click in the Files panel on a markdown file that already has a viewer tab selects that tab. A click on a file whose tab was closed opens a new one. Two files with the same name in different folders get separate tabs. The same path on another machine gets its own tab.

Context for a cold start:
- Facts verified with a probe mod: `run()` returns null, so `tab.new` does not give back the new tab's id. A mod pane's `props()` holds only the given props. `focused()` during the new pane's `init` still names the previous tab. So the opener learns the tab id on a later render, by noticing a new `md-viewer` tab.
- `panes()` lists every pane with `tab` and, for mod panes, `mod`. It does not expose props.
- `my-files` (ticket 01) currently runs `tab.new` on every markdown click.
- Ticket 05 copies the same module into `md-viewer` (a mod cannot import from another mod's folder), so keep it self-contained with no Herdr imports.

**Blocked by:** 01 (Open a markdown file from Files in a Preview tab)

**Model:** sonnet - shared registry and tab-binding logic

**Status:** done (real clicks need a human check)

- [x] Pure module, no Herdr imports, with functions over plain data: find a live tab for `{ file, on }` in the registry; prune entries whose tab is gone (a tab is live while `spaces()` lists it and `panes()` has an `md-viewer` pane in it); bind a pending open to a new `md-viewer` tab not in the snapshot taken before `tab.new`.
- [x] `node --test` cases pass: empty registry asks to open; live entry for same file and machine selects it; same file on another machine opens; gone tab is pruned; new `md-viewer` tab after a pending open is bound; an unrelated new tab is not bound.
- [x] The registry lives in shared state `"md-viewer.tabs"` (tab id to `{ file, on }`), so it survives a restart.
- [x] `my-files` uses the module: select with `tab.select { id }`, or snapshot, record the pending file and run `tab.new`; on render, bind and write the registry.
- [x] `herdr-app check` passes for `my-files`; `herdr-app status` shows no errors.
- [ ] In the app: click a markdown file twice; `herdr-app ls` shows one viewer tab. Close it, click again; a new tab opens. Open two `README.md` files from different folders; two tabs. _(needs human: no real click available to the agent)_
- [x] Commit with `caveman:caveman-commit`.
