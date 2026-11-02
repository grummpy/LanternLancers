/** Jousts, fog, and ember pickups. */

import { EMBER_R, FOG_BOUNCE, FOG_COOLDOWN, HIT_COOLDOWN, LANCE_TIE, MAX_LANTERNS } from "./constants.js";
import { overlapsWrap, shortestDir, wrapRider } from "./arena.js";

export function lanceY(rider) {
  return rider.y + rider.h * 0.45;
}

export function eliminate(rider) {
  rider.lanterns = 0;
  rider.alive = false;
  rider.onGround = false;
  rider.dashTime = 0;
  if (rider.vy < 60) rider.vy = 60;
}

function nudge(rider, dx, arena) {
  rider.x += dx;
  wrapRider(rider, arena);
}

function bounceApart(a, b, arena) {
  const dir = shortestDir(a.x, b.x, arena.width);
  const sign = dir === 0 ? a.facing || 1 : Math.sign(dir);
  a.vx = -sign * 170;
  b.vx = sign * 170;
  a.vy = -130;
  b.vy = -130;
  a.hitCd = HIT_COOLDOWN;
  b.hitCd = HIT_COOLDOWN;
  nudge(a, -sign * 10, arena);
  nudge(b, sign * 10, arena);
}

function popLantern(attacker, victim, arena) {
  victim.lanterns = Math.max(0, victim.lanterns - 1);
  attacker.pops += 1;
  attacker.hitCd = HIT_COOLDOWN;
  victim.hitCd = HIT_COOLDOWN;
  const dir = shortestDir(attacker.x, victim.x, arena.width);
  const sign = dir === 0 ? attacker.facing || 1 : Math.sign(dir);
  attacker.vy = Math.min(attacker.vy, -90);
  victim.vy = 150;
  victim.vx = sign * 160;
  attacker.vx = -sign * 40;
  nudge(victim, sign * 12, arena);
  nudge(attacker, -sign * 6, arena);
  const events = [{ type: "pop", attacker: attacker.id, victim: victim.id }];
  if (victim.lanterns <= 0) {
    eliminate(victim);
    events.push({ type: "ko", attacker: attacker.id, victim: victim.id });
  }
  return events;
}

/** Higher lance pops one lantern. Equal height (within LANCE_TIE) bounces both. */
export function resolveCombat(riders, arena) {
  const events = [];
  const alive = riders.filter((rider) => rider.active && rider.alive);
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i];
      const b = alive[j];
      if (a.hitCd > 0 || b.hitCd > 0) continue;
      if (!overlapsWrap(a, b, arena.width)) continue;
      const diff = lanceY(a) - lanceY(b);
      if (Math.abs(diff) <= LANCE_TIE) {
        bounceApart(a, b, arena);
        events.push({ type: "bounce", ids: [a.id, b.id] });
      } else if (diff < 0) {
        events.push(...popLantern(a, b, arena));
      } else {
        events.push(...popLantern(b, a, arena));
      }
    }
  }
  return events;
}

export function resolveFog(riders, arena) {
  const events = [];
  for (const rider of riders) {
    if (!rider.active || !rider.alive || rider.fogCd > 0) continue;
    if (rider.y + rider.h < arena.fogTop) continue;
    rider.lanterns = Math.max(0, rider.lanterns - 1);
    rider.fogCd = FOG_COOLDOWN;
    rider.vy = FOG_BOUNCE;
    rider.y = arena.fogTop - rider.h - 1;
    rider.onGround = false;
    events.push({ type: "fog", id: rider.id });
    if (rider.lanterns <= 0) {
      eliminate(rider);
      rider.y = arena.fogTop - rider.h + 8;
      events.push({ type: "ko", attacker: null, victim: rider.id });
    }
  }
  return events;
}

export function createEmber(rng, arena) {
  const pad = 40;
  return {
    x: pad + rng.next() * (arena.width - pad * 2),
    y: 78 + rng.next() * Math.max(40, arena.fogTop - 180),
    r: EMBER_R,
    phase: rng.next() * Math.PI * 2,
  };
}

export function emberCenter(ember) {
  return {
    x: ember.x,
    y: ember.y + Math.sin(ember.phase) * 8,
    r: ember.r,
  };
}

function circleHitsRect(circle, rect) {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return dx * dx + dy * dy <= circle.r * circle.r;
}

export function resolveEmbers(riders, embers) {
  const events = [];
  const kept = [];
  for (const ember of embers) {
    ember.phase += 0.08;
    const center = emberCenter(ember);
    let taken = false;
    for (const rider of riders) {
      if (!rider.active || !rider.alive || rider.lanterns >= MAX_LANTERNS) continue;
      if (!circleHitsRect(center, rider)) continue;
      rider.lanterns += 1;
      taken = true;
      events.push({ type: "pickup", id: rider.id });
      break;
    }
    if (!taken) kept.push(ember);
  }
  return { embers: kept, events };
}

/** Positive if `a` ranks above `b` on lanterns, then pops. Zero is a tie. */
export function compareScore(a, b) {
  if (a.lanterns !== b.lanterns) return a.lanterns - b.lanterns;
  if (a.pops !== b.pops) return a.pops - b.pops;
  return 0;
}

/** Winner id, or null when the top lanterns+pops score is shared. */
export function judgeByScore(riders) {
  const active = riders.filter((rider) => rider.active);
  if (active.length === 0) return null;
  let best = active[0];
  let ties = 1;
  for (let i = 1; i < active.length; i++) {
    const cmp = compareScore(active[i], best);
    if (cmp > 0) {
      best = active[i];
      ties = 1;
    } else if (cmp === 0) {
      ties += 1;
    }
  }
  return ties === 1 ? best.id : null;
}
