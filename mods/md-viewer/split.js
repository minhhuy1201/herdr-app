// Splits markdown into { md } and { lang, code } segments by CommonMark fenced code rules.
const OPEN = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$/;

export function splitFences(text) {
  const segments = [];
  let md = [], code = null;
  const flushMd = () => {
    const joined = md.join("\n");
    if (joined.trim()) segments.push({ md: joined });
    md = [];
  };
  for (const line of text.split(/\r?\n/)) {
    if (!code) {
      const m = OPEN.exec(line);
      if (!m) { md.push(line); continue; }
      flushMd();
      code = { fence: m[1], lang: m[2], lines: [] };
      continue;
    }
    const close = new RegExp(`^ {0,3}\\${code.fence[0]}{${code.fence.length},}[ \\t]*$`);
    if (close.test(line)) {
      segments.push({ lang: code.lang, code: code.lines.join("\n") });
      code = null;
      continue;
    }
    code.lines.push(line);
  }
  if (code) segments.push({ lang: code.lang, code: code.lines.join("\n") });
  else flushMd();
  return segments;
}
