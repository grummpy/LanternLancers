import test from "node:test";
import assert from "node:assert/strict";
import { createArena } from "../src/core/arena.js";
import { createRider } from "../src/core/rider.js";
import { resolveCombat } from "../src/core/combat.js";

const arena = createArena();

test("the higher lance pops one lantern and scores a pop", () => {
  const upper = createRider(0, { x: 100, y: 100 });
  const lower = createRider(1, { x: 120, y: 118 });
  const events = resolveCombat([upper, lower], arena);
  assert.equal(lower.lanterns, 2);
  assert.equal(upper.lanterns, 3);
  assert.equal(upper.pops, 1);
  assert.equal(lower.pops, 0);
  assert.ok(events.some((event) => event.type === "pop"));
  assert.ok(upper.hitCd > 0 && lower.hitCd > 0);

  resolveCombat([upper, lower], arena);
  assert.equal(lower.lanterns, 2);
});

test("equal lance height bounces both riders and pops nobody", () => {
  const a = createRider(0, { x: 100, y: 100, vx: 80 });
  const b = createRider(1, { x: 130, y: 100, vx: -80 });
  const events = resolveCombat([a, b], arena);
  assert.equal(a.lanterns, 3);
  assert.equal(b.lanterns, 3);
  assert.equal(a.pops, 0);
  assert.equal(b.pops, 0);
  assert.ok(events.some((event) => event.type === "bounce"));
  assert.ok(a.vx < 0);
  assert.ok(b.vx > 0);
});

test("a pop across the wrapped edge still counts", () => {
  const upper = createRider(0, { x: 940, y: 100 });
  const lower = createRider(1, { x: 4, y: 120 });
  resolveCombat([upper, lower], arena);
  assert.equal(lower.lanterns, 2);
  assert.equal(upper.pops, 1);
});

test("the last lantern is a knockout", () => {
  const upper = createRider(0, { x: 100, y: 100 });
  const lower = createRider(1, { x: 120, y: 118, lanterns: 1 });
  const events = resolveCombat([upper, lower], arena);
  assert.equal(lower.alive, false);
  assert.equal(lower.lanterns, 0);
  assert.ok(events.some((event) => event.type === "ko" && event.victim === 1));
});
