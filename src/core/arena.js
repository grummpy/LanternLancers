/** Arena geometry: wrap, platforms, overlap. No rendering. */

import { ARENA_H, ARENA_W, FOG_H } from "./constants.js";

export function createArena() {
  return {
    width: ARENA_W,
    height: ARENA_H,
    fogHeight: FOG_H,
    fogTop: ARENA_H - FOG_H,
  };
}

export function createPlatforms() {
  return [
    { x: 36, y: 424, w: 230, h: 16 },
    { x: 694, y: 424, w: 230, h: 16 },
    { x: 360, y: 316, w: 240, h: 16 },
    { x: 150, y: 210, w: 190, h: 16 },
    { x: 620, y: 210, w: 190, h: 16 },
  ];
}

export function shortestDir(fromX, toX, width) {
  let delta = toX - fromX;
  delta %= width;
  if (delta > width / 2) delta -= width;
  if (delta < -width / 2) delta += width;
  return delta;
}

export function wrapRider(rider, arena) {
  const width = arena.width;
  if (rider.x >= 0 && rider.x < width) return;
  rider.x = ((rider.x % width) + width) % width;
}

function rangesOverlap(ax, aw, bx, bw) {
  return ax < bx + bw && ax + aw > bx;
}

export function overlapsWrap(a, b, width) {
  if (a.y + a.h <= b.y || b.y + b.h <= a.y) return false;
  return (
    rangesOverlap(a.x, a.w, b.x, b.w) ||
    rangesOverlap(a.x + width, a.w, b.x, b.w) ||
    rangesOverlap(a.x - width, a.w, b.x, b.w)
  );
}

/** Land when falling onto a platform top. Down-dives skip this. */
export function landOnPlatforms(rider, prevY, platforms) {
  if (rider.vy < 0) return false;
  const prevBottom = prevY + rider.h;
  const bottom = rider.y + rider.h;
  for (const platform of platforms) {
    if (rider.x + rider.w <= platform.x || rider.x >= platform.x + platform.w) continue;
    if (prevBottom <= platform.y + 2 && bottom >= platform.y) {
      rider.y = platform.y - rider.h;
      rider.vy = 0;
      rider.onGround = true;
      return true;
    }
  }
  return false;
}
