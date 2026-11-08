// 8x8 pixel sprites for space avatars, wuxia / xianxia themed. Idea from
// pilmokim/herdr-pixel-spaces (Apache-2.0); these drawings are new.
// "." clear, "x" the space's color, "o" white, "k" near-black.

export const SPRITES = {
  sword: [
    "...oo...",
    "...ox...",
    "...ox...",
    "...ox...",
    "...ox...",
    ".xxxxxx.",
    "...xx...",
    "..xxxx..",
  ],
  saber: [
    ".......o",
    "......ox",
    ".....oxx",
    "....oxx.",
    "...oxx..",
    ".xxxx...",
    "..x.....",
    ".x......",
  ],
  taiji: [
    "..ooxx..",
    ".ooooxx.",
    "oooxoxxx",
    "ooooooxx",
    "ooxxxxxx",
    "oooxoxxx",
    ".ooxxxx.",
    "..ooxx..",
  ],
  lantern: [
    "...oo...",
    ".oooooo.",
    ".xoxxxx.",
    "xxkxxkxx",
    "xxkxxkxx",
    ".xxxxxx.",
    ".oooooo.",
    "...xx...",
  ],
  pagoda: [
    "...xx...",
    "x.xxxx.x",
    ".xxxxxx.",
    "..okko..",
    "xxxxxxxx",
    ".xxxxxx.",
    ".ookkoo.",
    ".ookkoo.",
  ],
  gourd: [
    "....x...",
    "..xxxx..",
    "..xoxx..",
    "...oo...",
    ".xxxxxx.",
    "xoxxxxxx",
    "xxxxxxxx",
    ".xxxxxx.",
  ],
  scroll: [
    "kxxxxxxk",
    ".oooooo.",
    ".okkkko.",
    ".oooooo.",
    ".okkoko.",
    ".oooooo.",
    ".okkkoo.",
    "kxxxxxxk",
  ],
  flame: [
    "...x....",
    "...xx...",
    "..xxx.x.",
    ".xxoxxx.",
    ".xxooxxx",
    "xxoooxxx",
    "xxooooxx",
    ".xxxxxx.",
  ],
  cauldron: [
    "..o..o..",
    "...o..o.",
    "xxxxxxxx",
    "xxxxxxxx",
    ".xxkkxx.",
    ".xxxxxx.",
    "..xxxx..",
    ".x....x.",
  ],
  mountain: [
    "........",
    "...o....",
    "..oxx...",
    "..xxxxo.",
    ".xxxxxxx",
    ".xxxxxxx",
    "xxxxxxxx",
    "xxxxxxxx",
  ],
  coin: [
    "..xxxx..",
    ".xoxxxx.",
    "xxkkkkxx",
    "xxk..kxx",
    "xxk..kxx",
    "xxkkkkxx",
    ".xxxxxx.",
    "..xxxx..",
  ],
  fan: [
    "xxxxxxxx",
    "xoxxxxox",
    ".xoxxox.",
    ".xxooxx.",
    "..xoox..",
    "...xx...",
    "...xx...",
    "...o....",
  ],
  bamboo: [
    ".xx..xx.",
    ".xx..xx.",
    ".kk..kk.",
    ".xx.xxx.",
    ".xxx.xx.",
    ".kk..kk.",
    ".xx..xx.",
    ".xx..xx.",
  ],
  lotus: [
    "........",
    "...xx...",
    "..xoox..",
    "x.xoox.x",
    "xoxxxxox",
    ".xxxxxx.",
    "..xxxx..",
    "...xx...",
  ],
  talisman: [
    "..xxxx..",
    "..xkkx..",
    "..xxkx..",
    "..xkkx..",
    "..xkxx..",
    "..xkkx..",
    "..xxxx..",
    "...x.x..",
  ],
};

export const NAMES = Object.keys(SPRITES);

export function runs(row) {
  const out = [];
  for (let i = 0; i < row.length; ) {
    let j = i;
    while (j < row.length && row[j] === row[i]) j++;
    out.push([row[i], j - i]);
    i = j;
  }
  return out;
}

// Kept sprites for listed spaces; a new space gets the least used one, ties
// broken by a hash of its name so the pick is stable.
export function assign(spaces, kept) {
  const ids = new Set(spaces.map((s) => s.id));
  const out = Object.fromEntries(
    Object.entries(kept ?? {}).filter(([id, name]) => ids.has(id) && NAMES.includes(name)),
  );
  let changed = Object.keys(out).length !== Object.keys(kept ?? {}).length;
  for (const s of spaces) {
    if (out[s.id]) continue;
    const uses = (n) => Object.values(out).filter((v) => v === n).length;
    const least = Math.min(...NAMES.map(uses));
    const free = NAMES.filter((n) => uses(n) === least);
    let h = 0;
    for (const ch of s.name ?? s.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    out[s.id] = free[h % free.length];
    changed = true;
  }
  return { out, changed };
}

export function nextSprite(name) {
  return NAMES[(NAMES.indexOf(name) + 1) % NAMES.length];
}
