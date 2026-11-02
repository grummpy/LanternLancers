import test from "node:test";
import assert from "node:assert/strict";
import { createArena } from "../src/core/arena.js";
import { createRider, stepRider } from "../src/core/rider.js";
import { emptyInput } from "../src/core/inputmap.js";
import { resolveCombat, resolveFog } from "../src/core/combat.js";

const arena = createArena();

function sink(rider) {
  rider.y = arena.fogTop - rider.h + 10;
  rider.fogCd = 0;
}

test("touching the fog costs one lantern and cannot chain immediately", () => {
  const rider = createRider(0, { x: 200, y: 100, lanterns: 3 });
  sink(rider);
  const events = resolveFog([rider], arena);
  assert.equal(rider.lanterns, 2);
  assert.ok(rider.vy < 0);
  assert.ok(rider.fogCd > 0);
  assert.ok(events.some((event) => event.type === "fog"));
  rider.y = arena.fogTop;
  resolveFog([rider], arena);
  assert.equal(rider.lanterns, 2);
});

test("the fog eliminates a rider who is on their last lantern", () => {
  const rider = createRider(0, { x: 200, y: 100, lanterns: 1 });
  sink(rider);
  const events = resolveFog([rider], arena);
  assert.equal(rider.alive, false);
  assert.equal(rider.lanterns, 0);
  assert.ok(events.some((event) => event.type === "ko"));
});

test("an eliminated rider falls and no longer jousts", () => {
  const fallen = createRider(0, { x: 100, y: 100, lanterns: 0, alive: false, vy: 40 });
  const other = createRider(1, { x: 110, y: 90 });
  const y = fallen.y;
  stepRider(fallen, emptyInput(), arena, []);
  assert.ok(fallen.y > y);
  resolveCombat([fallen, other], arena);
  assert.equal(other.lanterns, 3);
  assert.equal(other.pops, 0);
});
