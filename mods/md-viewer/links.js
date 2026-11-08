// Classifies a link clicked in Preview mode. Pure: no Herdr imports.
// Returns { web: url }, { markdown: absolutePath } or null.
const MARKDOWN = /\.(md|markdown|mdx)$/i;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function decode(text) {
  try { return decodeURIComponent(text); } catch { return text; }
}

// Collapses "." and ".." segments of a "/"-separated path.
function normalise(path) {
  const out = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out;
}

export function resolveLink(link, file) {
  const href = String(link ?? "").trim();
  if (/^https?:\/\//i.test(href)) return { web: href };
  if (!href || href.startsWith("#")) return null;

  let path = href;
  if (/^file:\/\//i.test(href)) path = href.replace(/^file:\/\/[^/]*/i, "");
  else if (SCHEME.test(href)) return null;

  path = decode(path.replace(/[#?].*$/, ""));
  if (!MARKDOWN.test(path)) return null;

  const base = String(file ?? "").replace(/\\/g, "/");
  const drive = base.match(/^[a-z]:/i)?.[0] ?? "";
  const rooted = path.startsWith("/") ? path : `${base.replace(/[^/]*$/, "")}${path}`;
  const parts = normalise(drive && rooted.startsWith(drive) ? rooted.slice(drive.length) : rooted);
  return { markdown: `${drive}/${parts.join("/")}` };
}

export function opener(platform, url) {
  if (platform === "macos") return { cmd: "open", args: [url] };
  // Not `cmd /c start`: cmd would parse `&` in a URL from the document as a command separator.
  if (platform === "windows") return { cmd: "rundll32", args: ["url.dll,FileProtocolHandler", url] };
  return { cmd: "xdg-open", args: [url] };
}
