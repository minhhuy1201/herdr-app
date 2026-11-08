// Pure: the expanded commit's data and the flat item list the virtual list draws.
// No Herdr APIs, so node --test can import it.

const STATUS = new Set(["A", "M", "D", "R", "C", "T"]);

// `git show --numstat -z` and `--name-status -z` printed separately (together Git prints
// only the last). A rename or copy carries two paths in both; the new one names the file.
function numstatEntries(text) {
  const fields = text.split("\0");
  const out = [];
  for (let i = 0; i < fields.length; i++) {
    if (!fields[i]) continue;
    const [add, del, path] = fields[i].split("\t");
    if (path === "") {
      out.push({ add, del, path: fields[i + 2] });
      i += 2;
    } else out.push({ add, del, path });
  }
  return out;
}

function statusMap(text) {
  const map = new Map();
  const fields = text.split("\0");
  for (let i = 0; i < fields.length; i++) {
    const code = fields[i]?.[0];
    if (!code || !STATUS.has(code)) continue;
    const paths = code === "R" || code === "C" ? 2 : 1;
    map.set(fields[i + paths], code);
    i += paths;
  }
  return map;
}

export function parseCommitFiles(numstat, nameStatus) {
  const status = statusMap(nameStatus);
  return numstatEntries(numstat).map(({ add, del, path }) => {
    const binary = add === "-";
    return {
      path,
      add: binary ? 0 : Number(add),
      del: binary ? 0 : Number(del),
      binary,
      status: status.get(path) ?? "M",
    };
  });
}

// `git show -s --format=%an%x00%at%x00%B`
export function parseCommitMeta(text) {
  const [author, at, ...message] = text.split("\0");
  return { author, time: Number(at), message: message.join("\0").trim() };
}

export const ITEM = { commit: 28, line: 18, pad: 12, meta: 22, hash: 28, state: 24, file: 28 };

// Width in character cells: wide (CJK, fullwidth, emoji) characters take two.
const WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]|[\ud800-\udbff][\udc00-\udfff]/g;
export const cells = (line) => [...line].length + (line.match(WIDE)?.length ?? 0);

// How many lines one paragraph takes at `width` cells, wrapped at spaces; a word longer
// than the line breaks inside it.
function wrapLine(line, width) {
  let lines = 1;
  let used = 0;
  for (const word of line.split(" ").filter(Boolean)) {
    let size = cells(word);
    const gap = used ? 1 : 0;
    if (used + gap + size <= width) {
      used += gap + size;
      continue;
    }
    if (used) lines++;
    while (size > width) {
      size -= width;
      lines++;
    }
    used = size;
  }
  return lines;
}

// How many wrapped lines a message takes at about `chars` cells per line. `chars` is an
// estimate, so the line is taken a little shorter to never under-count.
export function wrappedLines(text, chars) {
  const width = Math.max(10, Math.floor(chars * 0.9));
  return text.split("\n").reduce((n, line) => n + wrapLine(line, width), 0);
}

/**
 * Rows (from the graph) -> flat items. The expanded commit is followed by its
 * detail items, which carry the lanes that continue below it so the graph keeps
 * drawing through them. `detail` is { hash, state: "loading" | "ready" | "error",
 * meta, files, error } or null.
 */
export function flatten(rows, expanded, detail, chars = 40) {
  const items = [];
  for (const row of rows) {
    const hash = row.commit.hash;
    items.push({ key: hash, kind: "commit", row, height: ITEM.commit });
    if (hash !== expanded) continue;
    const lanes = [...row.pass, ...row.branch];
    const mine = detail?.hash === hash ? detail : null;
    const add = (item) => items.push({ lanes, hash, ...item });
    // The subject only: a long body would crowd the panel.
    const message = row.commit.subject;
    add({
      key: `msg:${hash}`,
      kind: "message",
      message,
      height: wrappedLines(message, chars) * ITEM.line + ITEM.pad,
    });
    if (mine?.meta) add({ key: `meta:${hash}`, kind: "meta", meta: mine.meta, height: ITEM.meta });
    add({ key: `copy:${hash}`, kind: "hash", height: ITEM.hash });
    if (!mine || mine.state === "loading")
      add({ key: `state:${hash}`, kind: "state", text: "Loading…", height: ITEM.state });
    else if (mine.state === "error")
      add({ key: `state:${hash}`, kind: "state", text: mine.error, error: true, height: ITEM.state });
    else if (!mine.files.length)
      add({ key: `state:${hash}`, kind: "state", text: "No file changes", height: ITEM.state });
    else
      mine.files.forEach((file, i) =>
        add({ key: `file:${hash}:${i}`, kind: "file", file, height: ITEM.file }),
      );
  }
  return items;
}
