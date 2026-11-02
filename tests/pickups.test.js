import test from "node:test";
import assert from "node:assert/strict";
import { createRider } from "../src/core/rider.js";
import { resolveEmbers } from "../src/core/combat.js";
import { createMatch, updateMatch } from "../src/core/match.js";
import { DT } from "../src/core/constants.js";

function emberAt(x, y) {
  return { x, y, r: 12, phase: 0 };
}

test("an ember restores one lantern up to the maximum of three", () => {
  const rider = createRider(0, { x: 100, y: 100, lanterns: 2 });
  const once = resolveEmbers([rider], [emberAt(110, 110)]);
  assert.equal(rider.lanterns, 3);
  assert.equal(once.embers.length, 0);
  assert.ok(once.events.some((event) => event.type === "pickup"));

  const full = resolveEmbers([rider], [emberAt(110, 110)]);
  assert.equal(rider.lanterns, 3);
  assert.equal(full.embers.length, 1);
});

test("embers ignore eliminated riders", () => {
  const rider = createRider(0, { x: 100, y: 100, lanterns: 0, alive: false });
  const result = resolveEmbers([rider], [emberAt(110, 110)]);
  assert.equal(rider.lanterns, 0);
  assert.equal(result.embers.length, 1);
});

test("ember spawns are deterministic for a seed", () => {
  const slots = [0, 1, 2, 3].map(() => ({ active: false, bot: false }));
  const a = createMatch({ seed: 99, slots });
  const b = createMatch({ seed: 99, slots });
  a.phase = "playing";
  b.phase = "playing";
  a.emberTimer = DT;
  b.emberTimer = DT;
  updateMatch(a, []);
  updateMatch(b, []);
  assert.equal(a.embers.length, 1);
  assert.equal(a.embers[0].x, b.embers[0].x);
  assert.equal(a.embers[0].y, b.embers[0].y);
});
