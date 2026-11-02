/** Rider state and one tick of movement. */

import {
  AIR_DRAG,
  DASH_COOLDOWN,
  DASH_GRAVITY_SCALE,
  DASH_SPEED,
  DASH_TIME,
  DT,
  FLAP_COOLDOWN,
  FLAP_VY,
  GRAVITY,
  GROUND_DRAG,
  MAX_FALL,
  MAX_LANTERNS,
  MAX_RISE,
  MAX_SPEED,
  MOVE_ACCEL,
  RIDER_H,
  RIDER_W,
} from "./constants.js";
import { landOnPlatforms, wrapRider } from "./arena.js";
import { emptyInput } from "./inputmap.js";

export function createRider(id, opts = {}) {
  return {
    id,
    active: opts.active !== false,
    isBot: !!opts.isBot,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    w: RIDER_W,
    h: RIDER_H,
    facing: opts.facing ?? 1,
    lanterns: opts.lanterns ?? MAX_LANTERNS,
    pops: opts.pops ?? 0,
    roundWins: opts.roundWins ?? 0,
    alive: opts.alive !== false,
    onGround: !!opts.onGround,
    flapCd: 0,
    dashCd: 0,
    dashTime: 0,
    hitCd: 0,
    fogCd: 0,
    flapAnim: 0,
  };
}

function normalize(input) {
  const blank = emptyInput();
  if (!input) return blank;
  for (const key of Object.keys(blank)) blank[key] = !!input[key];
  return blank;
}

/**
 * Advance one rider by a single 60 Hz tick.
 * Returns whether a flap or dash began this tick (for audio).
 */
export function stepRider(rider, rawInput, arena, platforms) {
  if (!rider.active) return { flap: false, dash: false };
  const input = normalize(rawInput);

  rider.flapCd = Math.max(0, rider.flapCd - DT);
  rider.dashCd = Math.max(0, rider.dashCd - DT);
  rider.hitCd = Math.max(0, rider.hitCd - DT);
  rider.fogCd = Math.max(0, rider.fogCd - DT);
  rider.flapAnim = Math.max(0, rider.flapAnim - DT);

  if (!rider.alive) {
    if (rider.y > arena.height + 80) {
      rider.vy = 0;
      rider.vx = 0;
      rider.y = arena.height + 80;
      rider.onGround = false;
      return { flap: false, dash: false };
    }
    rider.vy = Math.min(rider.vy + GRAVITY * DT, MAX_FALL);
    rider.x += rider.vx * DT;
    rider.y += rider.vy * DT;
    wrapRider(rider, arena);
    rider.onGround = false;
    return { flap: false, dash: false };
  }

  if (input.left && !input.right) rider.facing = -1;
  if (input.right && !input.left) rider.facing = 1;

  let dashed = false;
  if (rider.dashTime <= 0 && input.secondary && rider.dashCd <= 0) {
    rider.dashTime = DASH_TIME;
    rider.dashCd = DASH_COOLDOWN;
    dashed = true;
  }

  const dashing = rider.dashTime > 0;
  if (dashing) {
    rider.dashTime = Math.max(0, rider.dashTime - DT);
    rider.vx = rider.facing * DASH_SPEED;
    rider.vy += GRAVITY * DASH_GRAVITY_SCALE * DT;
  } else {
    let accel = 0;
    if (input.left && !input.right) accel = -MOVE_ACCEL;
    else if (input.right && !input.left) accel = MOVE_ACCEL;
    if (accel !== 0) rider.vx += accel * DT;
    else rider.vx *= rider.onGround ? GROUND_DRAG : AIR_DRAG;
    if (rider.vx > MAX_SPEED) rider.vx = MAX_SPEED;
    if (rider.vx < -MAX_SPEED) rider.vx = -MAX_SPEED;
    rider.vy += GRAVITY * (input.down ? 1.75 : 1) * DT;
  }

  let flapped = false;
  if ((input.action || input.up) && !dashing && rider.flapCd <= 0) {
    rider.vy = FLAP_VY;
    rider.flapCd = FLAP_COOLDOWN;
    rider.flapAnim = 0.2;
    rider.onGround = false;
    flapped = true;
  }

  const fallCap = input.down ? MAX_FALL * 1.25 : MAX_FALL;
  if (rider.vy > fallCap) rider.vy = fallCap;
  if (rider.vy < MAX_RISE) rider.vy = MAX_RISE;

  const prevY = rider.y;
  rider.x += rider.vx * DT;
  rider.y += rider.vy * DT;
  wrapRider(rider, arena);

  if (rider.y < 76) {
    rider.y = 76;
    if (rider.vy < 0) rider.vy = 0;
  }

  const wasGrounded = rider.onGround;
  rider.onGround = false;
  if (!input.down) landOnPlatforms(rider, prevY, platforms);
  if (!rider.onGround && wasGrounded && !flapped && !dashing && input.down) {
    rider.onGround = false;
  }
  return { flap: flapped, dash: dashed };
}
