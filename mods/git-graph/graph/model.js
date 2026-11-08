// Pure: the output of one `git log` call -> rows with lanes. No Herdr APIs, so
// node --test can import it.

// One record per commit, fields split by NUL, records ended by 0x1e.
export const LOG_FORMAT = "--format=%H%x00%P%x00%an%x00%at%x00%s%x00%D%x1e";

/**
 * Parse `%D` printed with --decorate=full into
 *   { head, detached, labels: [{ name, kind, local, remotes, current }] }
 * A local branch and the remote branches of the same name share one label, so
 * `main` with `origin/main` is { name: "main", local: true, remotes: ["origin"] }.
 * Bare names (no refs/ prefix) count as local branches; `tag: ` marks a tag.
 */
export function parseRefs(text) {
  const out = { head: false, detached: false, labels: [] };
  const branches = new Map();
  const tags = [];
  let current = null;
  for (const raw of (text ?? "").split(",")) {
    let ref = raw.trim();
    if (!ref) continue;
    if (ref === "HEAD") {
      out.head = true;
      out.detached = true;
      continue;
    }
    if (ref.startsWith("HEAD -> ")) {
      out.head = true;
      current = ref.slice(8).replace(/^refs\/heads\//, "");
      continue;
    }
    if (ref.startsWith("tag: ")) {
      tags.push(ref.slice(5).replace(/^refs\/tags\//, ""));
      continue;
    }
    let remote = null;
    if (ref.startsWith("refs/remotes/")) {
      const [name, ...rest] = ref.slice(13).split("/");
      if (!rest.length || rest.join("/") === "HEAD") continue; // origin/HEAD is noise
      remote = name;
      ref = rest.join("/");
    } else ref = ref.replace(/^refs\/heads\//, "");
    const label = branches.get(ref) ?? { name: ref, kind: "branch", local: false, remotes: [], current: false };
    if (remote) label.remotes.push(remote);
    else label.local = true;
    branches.set(ref, label);
  }
  if (current !== null) {
    const label = branches.get(current) ?? { name: current, kind: "branch", local: true, remotes: [], current: false };
    label.local = true;
    label.current = true;
    branches.set(current, label);
  }
  const list = [...branches.values()].sort((a, b) => Number(b.current) - Number(a.current));
  out.labels = [
    ...list,
    ...tags.map((name) => ({ name, kind: "tag", local: false, remotes: [], current: false })),
  ];
  return out;
}

export function parseLog(text) {
  const commits = [];
  for (const record of text.split("\x1e")) {
    const [hash, parents, author, time, subject, refs] = record.replace(/^\n/, "").split("\0");
    if (!hash) continue;
    commits.push({
      hash,
      parents: parents ? parents.split(" ") : [],
      author,
      time: Number(time) || 0,
      subject: subject ?? "",
      refs: parseRefs(refs ?? ""),
    });
  }
  return commits;
}

/**
 * Assign lanes. A lane waits for one commit hash. A commit takes the first lane
 * waiting for it (lanes that also wait for it end at its row), its first parent
 * keeps that lane, and every other parent joins a lane already waiting for it or
 * takes the first free one. A lane nothing waits on is freed.
 *
 * Each row: { commit, lane, color, merge, join, branch, pass }
 *   join   lanes from above that end at this node (own lane included when it was waiting)
 *   branch lanes below that start at this node (own lane included when a parent continues it)
 *   pass   lanes that run through the whole row, untouched
 * and every lane entry is { lane, color }. `head` is true for the commit HEAD is on.
 * The result's `state` goes back in as `prior` to build the next page.
 */
export function buildGraph(commits, prior = null) {
  // `prior` is the `state` of an earlier page: the next page continues its lanes.
  const waiting = prior ? [...prior.waiting] : []; // lane -> hash waited for, or null when free
  const colors = prior ? [...prior.colors] : []; // lane -> colour index
  let nextColor = prior ? prior.nextColor : 0;
  let laneCount = prior ? prior.laneCount : 0;

  const freeLane = () => {
    const free = waiting.indexOf(null);
    if (free >= 0) return free;
    waiting.push(null);
    colors.push(0);
    return waiting.length - 1;
  };

  const rows = commits.map((commit) => {
    const ending = [];
    waiting.forEach((hash, lane) => {
      if (hash === commit.hash) ending.push(lane);
    });

    let lane;
    let color;
    if (ending.length) {
      lane = ending[0];
      color = colors[lane];
    } else {
      lane = freeLane();
      color = nextColor++;
      colors[lane] = color;
    }

    const join = ending.map((l) => ({ lane: l, color: colors[l] }));
    for (const l of ending) waiting[l] = null;

    const branch = [];
    commit.parents.forEach((parent, i) => {
      if (i === 0) {
        waiting[lane] = parent;
        colors[lane] = color;
        branch.push({ lane, color });
        return;
      }
      let target = waiting.indexOf(parent);
      if (target < 0) {
        target = freeLane();
        waiting[target] = parent;
        colors[target] = nextColor++;
      }
      branch.push({ lane: target, color: colors[target] });
    });

    const touched = new Set([...join, ...branch].map((e) => e.lane));
    const pass = [];
    waiting.forEach((hash, l) => {
      if (hash !== null && !touched.has(l)) pass.push({ lane: l, color: colors[l] });
    });

    for (const e of [...join, ...branch, ...pass, { lane }]) laneCount = Math.max(laneCount, e.lane + 1);
    return {
      commit,
      lane,
      color,
      merge: commit.parents.length > 1,
      head: Boolean(commit.refs?.head),
      join,
      branch,
      pass,
    };
  });

  return { rows, laneCount, state: { waiting, colors, nextColor, laneCount } };
}
