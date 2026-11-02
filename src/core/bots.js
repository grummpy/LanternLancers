/** Tiny deterministic joust AI. Uses only match state — no extra randomness. */

import { emptyInput } from "./inputmap.js";
import { shortestDir } from "./arena.js";
import { emberCenter, lanceY } from "./combat.js";

function centerX(rider) {
  return rider.x + rider.w / 2;
}

export function decideBot(rider, match) {
  const input = emptyInput();
  if (!rider.active || !rider.alive) return input;

  const width = match.arena.width;
  const bottom = rider.y + rider.h;
  const nearFog = bottom > match.arena.fogTop - 110;

  let foe = null;
  let foeScore = Infinity;
  for (const other of match.riders) {
    if (!other.active || !other.alive || other.id === rider.id) continue;
    const dx = Math.abs(shortestDir(centerX(rider), centerX(other), width));
    const score = dx + Math.abs(rider.y - other.y) * 0.7;
    if (score < foeScore) {
      foeScore = score;
      foe = other;
    }
  }

  let ember = null;
  let emberDist = Infinity;
  if (rider.lanterns < 3) {
    for (const item of match.embers) {
      const at = emberCenter(item);
      const dx = Math.abs(shortestDir(centerX(rider), at.x, width));
      const dist = dx + Math.abs(rider.y - at.y);
      if (dist < emberDist) {
        emberDist = dist;
        ember = at;
      }
    }
  }

  if (nearFog) {
    input.up = true;
    input.action = true;
    input.down = false;
  }

  const chaseEmber = ember && (!foe || emberDist < foeScore * 0.85);
  if (!foe && !chaseEmber) {
    if (rider.y > 220) input.up = true;
    return input;
  }

  const goalX = chaseEmber ? ember.x : centerX(foe);
  // Id bias keeps equal-height stalemates from lasting: one rider aims a little higher.
  const heightBias = (rider.id - (foe ? foe.id : 0)) * 6;
  const goalY = chaseEmber ? ember.y : foe.y - 8 - heightBias;
  const dx = shortestDir(centerX(rider), goalX, width);

  if (dx > 14) input.right = true;
  else if (dx < -14) input.left = true;

  // Two bots pinned to the ceiling bounce forever. The higher id dives so the other can score.
  const capped = !chaseEmber && foe && rider.y <= 88 && foe.y <= 120;
  if (capped && rider.id > foe.id && !nearFog) {
    input.down = true;
    input.up = false;
    input.action = false;
  } else if (nearFog || rider.y > goalY) {
    input.up = true;
    input.action = true;
    input.down = false;
  } else if (!nearFog && rider.y < goalY - 28 && bottom < match.arena.fogTop - 150) {
    input.down = true;
  }

  if (foe && !chaseEmber) {
    const gap = Math.abs(shortestDir(centerX(rider), centerX(foe), width));
    const higher = lanceY(rider) < lanceY(foe) - LANCE_MARGIN;
    if (gap < rider.w + 24 && higher && rider.dashCd <= 0 && !nearFog) {
      input.secondary = true;
    }
  }

  return input;
}

const LANCE_MARGIN = 2;
