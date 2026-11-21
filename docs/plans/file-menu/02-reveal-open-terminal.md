# 02: Reveal in File Manager, Open in Default App, Open in Terminal

Spec: [docs/specs/file-menu.md](../../specs/file-menu.md). Read `~/.config/herdr-app/AGENTS.md` and ticket 01 first.

**What to build:** The File menu gains its first group: Open in Default App, Reveal in File Manager and Open in Terminal. Reveal opens the system file manager with the item selected. Open in Default App opens the item with the system's program for it. Open in Terminal opens a new tab in the current space with a shell in that folder (the parent folder for a file). Reveal and Open in Default App are hidden when the space is on another machine.

Context for a cold start:
- Ticket 01 added the *menu items* module, the `file` kind in `my-menu`, and the `nextCommand()` loop in `my-files` that acts on the kept right-clicked target.
- The platform is `window().platform` (`"linux" | "macos" | "windows"`, `herdr.d.ts`). `exec(cmd, args, { on })` runs a program; it does not use a shell, so arguments need no quoting.
- The Markdown viewer already has an opener rule per platform (`md-viewer`'s `links` module, `opener()`): `open` on macOS, `rundll32 url.dll,FileProtocolHandler` on Windows (not `cmd /c start`, which parses `&`), `xdg-open` on Linux. Follow the same rule for Open in Default App; copy it into the new module rather than importing across mod folders.
- Linux Reveal: `gdbus call --session --dest org.freedesktop.FileManager1 --object-path /org/freedesktop/FileManager1 --method org.freedesktop.FileManager1.ShowItems "['file://<path>']" ""`. The path in the URI must be percent-encoded. If it exits nonzero, fall back to `xdg-open <parent folder>`. macOS: `open -R <path>`. Windows: `explorer /select,<path>` (explorer exits 1 even on success; ignore its code).
- Open in Terminal: `run("tab.new", { space, folder })`.

**Blocked by:** 01 (Open the File menu)

**Model:** sonnet - per-platform command rules with a D-Bus fallback

**Status:** done (app check pending)

- [x] A pure *commands* module returns `{ cmd, args }` for reveal (with its Linux fallback), open-default, per platform. Tests assert each platform's program and arguments, including a path with spaces and non-ASCII characters in the Linux URI.
- [x] The *menu items* module adds the group in the spec's order and hides Reveal and Open in Default App when `on` is set. Tests cover local and remote targets.
- [x] Reveal selects the item in the file manager on Linux; when D-Bus fails, the parent folder opens instead.
- [x] Open in Default App opens a file and a folder.
- [x] Open in Terminal opens a new tab in the current space; its shell starts in the folder, or the file's parent folder.
- [x] A failed program shows an error toast with its stderr.
- [x] `node --test tests/` passes in `my-files`; `herdr-app check` passes for `my-files` and `my-menu`.
- [ ] Tried in the app on this Linux machine: each item once on a file and a folder.
