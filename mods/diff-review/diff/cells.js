// Width in terminal cells: wide (CJK, fullwidth, emoji) characters take two.
// A copy of the Git Graph's helper in graph/detail.js: a mod cannot import from another mod.
const WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]|[\ud800-\udbff][\udc00-\udfff]/g;
export const cells = (line) => [...line].length + (line.match(WIDE)?.length ?? 0);
