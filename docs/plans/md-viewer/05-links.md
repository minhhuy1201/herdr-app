# 05: Follow links from the viewer

Spec: [docs/specs/md-viewer.md](../../specs/md-viewer.md), section "Links". Read `~/.config/herdr-app/AGENTS.md` first (`exec`, `window().platform`).

**What to build:** In Preview mode, a click on a web link opens it in the system browser. A click on a relative link to another markdown file opens that file in its own viewer tab, or selects its tab if one is open. Anchor-only links and other links do nothing.

Context for a cold start:
- `TextView` has `.on_link_click((url, cx) => ...)`, which replaces its default URL opening.
- The open-or-select module from ticket 03 lives in `my-files`. Copy it into `md-viewer` with its tests (a mod cannot import another mod's folder); keep both copies identical.
- System opener: `xdg-open` on Linux, `open` on macOS, `cmd /c start "" <url>` on Windows, through `exec` with an argument list.

**Blocked by:** 03 (Select the open viewer tab instead of opening a duplicate)

**Model:** sonnet - link resolution rules plus a copied registry module

**Status:** todo

- [ ] Pure resolver, no Herdr imports: link plus the viewer file's path in; out `{ web: url }`, `{ markdown: absolutePath }` or nothing.
- [ ] `node --test` resolver cases pass: `./other.md`, `../docs/a.md`, `a.md#part` (anchor dropped), URL-encoded spaces, `https://x`, `http://x`, `#anchor` (nothing), `mailto:a@b` (nothing), `image.png` (nothing).
- [ ] The open-or-select module and its tests exist in `md-viewer`, identical to `my-files`'s copy; both test runs pass.
- [ ] Web links open with the platform opener; markdown links open or select a viewer tab with the same `on` as the current file.
- [ ] `herdr-app check` passes for `md-viewer`; `herdr-app status` shows no errors.
- [ ] In the app: a doc with a web link and a relative `.md` link; the web link opens the browser; the relative link opens one viewer tab and a second click selects it.
- [ ] Commit with `caveman:caveman-commit`.
