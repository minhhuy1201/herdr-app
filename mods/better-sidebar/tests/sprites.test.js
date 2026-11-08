import { test } from "node:test";
import assert from "node:assert/strict";
import { SPRITES, NAMES, assign, nextSprite } from "../views/sprites.js";

test("every sprite is 8x8 and uses only . x o k", () => {
  for (const [name, rows] of Object.entries(SPRITES)) {
    assert.equal(rows.length, 8, name);
    for (const row of rows) assert.match(row, /^([.xok]){8}$/, `${name}: ${row}`);
  }
});

test("new spaces get distinct sprites while unused ones remain", () => {
  const spaces = NAMES.map((_, i) => ({ id: `s${i}`, name: `space ${i}` }));
  const { out, changed } = assign(spaces, {});
  assert.ok(changed);
  assert.equal(new Set(Object.values(out)).size, NAMES.length);
});

test("kept sprites stay and gone or unknown entries drop", () => {
  const { out, changed } = assign([{ id: "a", name: "a" }], { a: "lotus", gone: "sword", b: "slime" });
  assert.deepEqual(out, { a: "lotus" });
  assert.ok(changed);
  assert.equal(assign([{ id: "a", name: "a" }], { a: "lotus" }).changed, false);
});

test("nextSprite wraps around", () => {
  assert.equal(nextSprite(NAMES.at(-1)), NAMES[0]);
  assert.equal(nextSprite(NAMES[0]), NAMES[1]);
});
