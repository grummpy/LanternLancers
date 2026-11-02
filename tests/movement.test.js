import test from "node:test";
import assert from "node:assert/strict";
import { createArena, createPlatforms } from "../src/core/arena.js";
import { createRider, stepRider } from "../src/core/rider.js";
import { emptyInput } from "../src/core/inputmap.js";
import { DASH_COOLDOWN, DASH_SPEED, FLAP_VY, RIDER_H } from "../src/core/constants.js";

const arena = createArena();

function hold(partial) {
  return { ...emptyInput(), ...partial };
}

test("action flaps upward and respects flap cooldown", () => {
  const rider = createRider(0, { x: 200, y: 120, vy: 40 });
  stepRider(rider, hold({ action: true }), arena, []);
  assert.equal(rider.vy, FLAP_VY);
  assert.ok(rider.flapCd > 0);
  stepRider(rider, hold({ action: true }), arena, []);
  assert.ok(rider.vy > FLAP_VY);
});

test("up flaps the same way as action", () => {
  const rider = createRider(0, { x: 200, y: 120, vy: 20 });
  stepRider(rider, hold({ up: true }), arena, []);
  assert.equal(rider.vy, FLAP_VY);
});

test("gravity pulls a rider down", () => {
  const rider = createRider(0, { x: 200, y: 80, vy: 0 });
  stepRider(rider, emptyInput(), arena, []);
  assert.ok(rider.vy > 0);
  const y = rider.y;
  stepRider(rider, emptyInput(), arena, []);
  assert.ok(rider.y > y);
});

test("left and right steer and set facing", () => {
  const rider = createRider(0, { x: 200, y: 80 });
  for (let i = 0; i < 8; i++) stepRider(rider, hold({ left: true }), arena, []);
  assert.equal(rider.facing, -1);
  assert.ok(rider.vx < 0);

  const other = createRider(1, { x: 200, y: 80 });
  for (let i = 0; i < 8; i++) stepRider(other, hold({ right: true }), arena, []);
  assert.equal(other.facing, 1);
  assert.ok(other.vx > 0);
});

test("horizontal edges wrap", () => {
  const right = createRider(0, { x: 958, y: 120, vx: 230 });
  stepRider(right, emptyInput(), arena, []);
  assert.ok(right.x < 20, `expected wrap to the left side, got ${right.x}`);

  const left = createRider(1, { x: 2, y: 120, vx: -230 });
  stepRider(left, emptyInput(), arena, []);
  assert.ok(left.x > 900, `expected wrap to the right side, got ${left.x}`);
});

test("riders land on platforms and can dive through them", () => {
  const platform = createPlatforms()[0];
  const rider = createRider(0, {
    x: platform.x + 30,
    y: platform.y - RIDER_H - 1,
    vy: 30,
  });
  for (let i = 0; i < 20; i++) stepRider(rider, emptyInput(), arena, [platform]);
  assert.equal(rider.onGround, true);
  assert.ok(Math.abs(rider.y - (platform.y - RIDER_H)) < 0.001);

  const perched = rider.y;
  for (let i = 0; i < 12; i++) stepRider(rider, hold({ down: true }), arena, [platform]);
  assert.equal(rider.onGround, false);
  assert.ok(rider.y > perched + 4);
});

test("lance dash bursts forward and then waits out a 1.5s cooldown", () => {
  const rider = createRider(0, { x: 200, y: 80, facing: 1 });
  const started = stepRider(rider, hold({ secondary: true, right: true }), arena, []);
  assert.equal(started.dash, true);
  assert.equal(rider.dashCd, DASH_COOLDOWN);
  assert.equal(rider.vx, DASH_SPEED);
  assert.equal(rider.facing, 1);

  stepRider(rider, hold({ secondary: true }), arena, []);
  assert.ok(rider.dashCd < DASH_COOLDOWN);

  rider.dashTime = 0;
  rider.dashCd = 0.05;
  const blocked = stepRider(rider, hold({ secondary: true }), arena, []);
  assert.equal(blocked.dash, false);
  assert.ok(rider.dashCd > 0 && rider.dashCd < 0.05);

  const ready = createRider(2, { x: 200, y: 80 });
  stepRider(ready, hold({ secondary: true }), arena, []);
  for (let i = 0; i < 89; i++) stepRider(ready, emptyInput(), arena, []);
  assert.ok(ready.dashCd > 0);
  stepRider(ready, emptyInput(), arena, []);
  assert.ok(ready.dashCd <= 1e-6);
});
