// Which Material Icon Theme icon a tree entry gets (icons/material/<name>.svg, full color).
// A copy of mods/my-files/file-kind.js: a mod cannot import from another mod's folder.
const FOLDERS = {
  src: "folder-src", lib: "folder-lib", docs: "folder-docs", doc: "folder-docs",
  test: "folder-test", tests: "folder-test", __tests__: "folder-test", node_modules: "folder-node",
  ".git": "folder-git", ".github": "folder-git", config: "folder-config", ".config": "folder-config",
  settings: "folder-config", icons: "folder-images", images: "folder-images", img: "folder-images",
  assets: "folder-images", scripts: "folder-scripts", bin: "folder-scripts", layouts: "folder-layout",
  themes: "folder-theme", mods: "folder-plugin", plugins: "folder-plugin", extensions: "folder-plugin",
  dist: "folder-dist", build: "folder-dist", out: "folder-dist", views: "folder-views",
  components: "folder-components", ".claude": "folder-claude", tools: "folder-tools",
};

const NAMES = {
  "package.json": "nodejs", "package-lock.json": "nodejs", "tsconfig.json": "tsconfig",
  "jsconfig.json": "tsconfig", ".gitignore": "git", ".gitattributes": "git", ".gitmodules": "git",
  "readme.md": "readme", license: "certificate", "license.md": "certificate", "license.txt": "certificate",
  dockerfile: "docker", makefile: "makefile", ".env": "tune", "go.mod": "go-mod", "go.sum": "go-mod",
  "cargo.toml": "rust", "cargo.lock": "rust", "yarn.lock": "yarn", "pnpm-lock.yaml": "pnpm",
  "bun.lockb": "bun", "claude.md": "claude", "agents.md": "claude",
};

const EXTENSIONS = {
  js: "javascript", mjs: "javascript", cjs: "javascript", ts: "typescript", mts: "typescript",
  jsx: "react", tsx: "react_ts", py: "python", rs: "rust", go: "go", rb: "ruby", java: "java",
  kt: "kotlin", swift: "swift", c: "c", h: "h", cpp: "cpp", hpp: "hpp", cs: "csharp", php: "php",
  lua: "lua", sh: "console", zsh: "console", bash: "console", fish: "console", css: "css",
  scss: "sass", sass: "sass", html: "html", vue: "vue", svelte: "svelte", sql: "database",
  json: "json", jsonc: "json", yaml: "yaml", yml: "yaml", toml: "toml", xml: "xml",
  md: "markdown", mdx: "markdown", txt: "document", pdf: "pdf", svg: "svg",
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", ico: "image", bmp: "image", avif: "image",
  zip: "zip", tar: "zip", gz: "zip", tgz: "zip", "7z": "zip", rar: "zip", xz: "zip", lock: "lock",
  ttf: "font", otf: "font", woff: "font", woff2: "font", ini: "settings", conf: "settings",
};

export function fileKind(name, dir, open = false) {
  const lower = name.trim().toLowerCase();
  if (dir) {
    const base = FOLDERS[lower] ?? "folder";
    return open ? `${base}-open` : base;
  }
  if (NAMES[lower]) return NAMES[lower];
  if (lower.endsWith(".d.ts")) return "typescript-def";
  if (/\.(test|spec)\.(js|mjs|cjs|jsx)$/.test(lower)) return "test-js";
  if (/\.(test|spec)\.(ts|tsx)$/.test(lower)) return "test-ts";
  if (lower.startsWith(".env")) return "tune";
  const ext = lower.includes(".") ? lower.split(".").pop() : "";
  return EXTENSIONS[ext] ?? "file";
}

export const ICONS = [
  ...new Set([
    "folder", "file", "typescript-def", "test-js", "test-ts", "tune",
    ...Object.values(FOLDERS), ...Object.values(NAMES), ...Object.values(EXTENSIONS),
  ]),
].flatMap((n) => (n.startsWith("folder") ? [n, `${n}-open`] : [n]));
