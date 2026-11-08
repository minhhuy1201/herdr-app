import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMeta, recordRows } from "../views/claude-subagents.js";

const terminal = (records) => ({ address: "t13", program: { key: "claude" }, records });

test("parseMeta reads description and parent per agent id", () => {
  const out = parseMeta(
    [
      '/h/.claude/projects/p/s/subagents/agent-a1.meta.json:{"description":"Scan repo","parentAgentId":null}',
      '/h/.claude/projects/p/s/subagents/agent-b2.meta.json:{"description":"Fix test","parentAgentId":"a1"}',
      "/h/.claude/projects/p/s/subagents/agent-c3.meta.json:not json",
    ].join("\n"),
  );
  assert.deepEqual(out, { a1: { desc: "Scan repo", parent: null }, b2: { desc: "Fix test", parent: "a1" } });
});

test("records without meta sit directly under the terminal", () => {
  const rows = recordRows(terminal({ a1: { state: "working", title: "Scan repo" } }), {});
  assert.deepEqual(rows.map((r) => [r.address, r.name, r.status, r.parent]), [["t13#a1", "Scan repo", "working", "t13"]]);
  assert.equal(rows[0].record, true);
});

test("a nested record hangs under its parent record", () => {
  const meta = { a1: { desc: "Scan", parent: null }, b2: { desc: "Fix", parent: "a1" } };
  const rows = recordRows(terminal({ a1: { state: "working" }, b2: { state: "blocked" } }), meta);
  assert.equal(rows.find((r) => r.address === "t13#b2").parent, "t13#a1");
});

test("a parent waiting on its child stays as an idle row named from meta", () => {
  const meta = { a1: { desc: "Scan", parent: null }, b2: { desc: "Fix", parent: "a1" } };
  const rows = recordRows(terminal({ b2: { state: "working" } }), meta);
  assert.deepEqual(rows.map((r) => [r.address, r.name, r.status, r.parent]), [
    ["t13#a1", "Scan", "idle", "t13"],
    ["t13#b2", "Fix", "working", "t13#a1"],
  ]);
});
