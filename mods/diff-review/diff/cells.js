// Width in terminal cells: wide (CJK, fullwidth, emoji) characters take two.
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]|[\ud800-\udbff][\udc00-\udfff]/g;
export const cells = (line) => [...line].length + (line.match(WIDE)?.length ?? 0);
