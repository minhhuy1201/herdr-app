// Maps a Markdown fence info string to the language name the editor's grammars accept.
// Pure: no Herdr imports. The extension-style table extends mods/my-files/main.js (LANG) with `cjs`.
const EXTENSION = { ts: "js", tsx: "js", mts: "js", cts: "js", jsx: "js", mjs: "js", cjs: "js", toml: "yaml", jsonc: "json", svelte: "html", vue: "html" };
const ALIAS = {
  typescript: "js", javascript: "js", node: "js",
  shell: "sh", bash: "sh", zsh: "sh", console: "sh", shellscript: "sh",
  yml: "yaml", python: "py", python3: "py", rust: "rs", golang: "go", ruby: "rb",
  text: "txt", plaintext: "txt", markdown: "markdown",
};

export function editorLanguage(info) {
  const name = String(info ?? "").trim().toLowerCase().replace(/^\{?\.?(language-|lang-)?/, "").replace(/[{}].*$/, "");
  if (!name) return "txt";
  return EXTENSION[name] ?? ALIAS[name] ?? name;
}
