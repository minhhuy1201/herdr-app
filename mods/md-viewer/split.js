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

// Each markdown segment renders on its own, so a reference definition in one segment must be
// repeated in the others. One-line definitions only (up to 3 spaces of indent; footnotes excluded).
const DEFINITION = /^ {0,3}\[(?!\^)[^\]]+\]:[ \t]*\S.*$/;

export function shareDefinitions(segments) {
  const defs = [];
  for (const seg of segments) {
    if (seg.md === undefined) continue;
    for (const line of seg.md.split("\n")) if (DEFINITION.test(line) && !defs.includes(line.trim())) defs.push(line.trim());
  }
  if (!defs.length) return segments;
  return segments.map((seg) => {
    if (seg.md === undefined) return seg;
    const have = new Set(seg.md.split("\n").map((l) => l.trim()));
    const missing = defs.filter((d) => !have.has(d));
    return missing.length ? { md: `${seg.md.trimEnd()}\n\n${missing.join("\n")}` } : seg;
  });
}
