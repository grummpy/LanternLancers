/** Match / round flow. One `updateMatch` call is one 60 Hz tick. */

import {
  BANNER_TIME,
  COUNTDOWN_TIME,
  EMBER_EVERY,
  EMBER_MAX,
  MAX_LANTERNS,
  ROUND_TIME,
  SPAWN_PLATFORM,
  WINS_NEEDED,
} from "./constants.js";
import { createArena, createPlatforms } from "./arena.js";
import { createRng } from "./rng.js";
import { createRider, stepRider } from "./rider.js";
import { emptyInput } from "./inputmap.js";
import { createEmber, judgeByScore, resolveCombat, resolveEmbers, resolveFog } from "./combat.js";
import { decideBot } from "./bots.js";

function clampWins(value) {
  const n = value | 0;
  if (n < 1) return 1;
  if (n > 9) return 9;
  return n;
}

function placeRiders(match) {
  for (const rider of match.riders) {
    if (!rider.active) continue;
    const platform = match.platforms[SPAWN_PLATFORM[rider.id]];
    rider.x = platform.x + platform.w / 2 - rider.w / 2;
    rider.y = platform.y - rider.h;
    rider.vx = 0;
    rider.vy = 0;
    rider.facing = rider.id === 1 || rider.id === 3 ? -1 : 1;
    rider.lanterns = MAX_LANTERNS;
    rider.pops = 0;
    rider.alive = true;
    rider.onGround = true;
    rider.flapCd = 0;
    rider.dashCd = 0;
    rider.dashTime = 0;
    rider.hitCd = 0;
    rider.fogCd = 0.35;
    rider.flapAnim = 0;
  }
}

function beginCountdown(match) {
  match.phase = "countdown";
  match.phaseTimer = COUNTDOWN_TIME;
  match.timeLeft = ROUND_TIME;
  match.embers = [];
  match.emberTimer = 2.2;
  match.endReason = null;
  match.lastWinner = null;
  placeRiders(match);
}

export function createMatch(opts = {}) {
  const seed = opts.seed === undefined ? 1 : opts.seed >>> 0 || 1;
  const slots =
    opts.slots ??
    [0, 1, 2, 3].map(() => ({
      active: true,
      bot: true,
    }));
  const match = {
    seed,
    rng: createRng(seed),
    winsNeeded: clampWins(opts.winsNeeded ?? WINS_NEEDED),
    round: 1,
    phase: "countdown",
    phaseTimer: COUNTDOWN_TIME,
    timeLeft: ROUND_TIME,
    arena: createArena(),
    platforms: createPlatforms(),
    riders: [0, 1, 2, 3].map((id) => {
      const slot = slots[id] || { active: false, bot: false };
      return createRider(id, {
        active: slot.active !== false,
        isBot: !!slot.bot,
      });
    }),
    embers: [],
    emberTimer: 2.2,
    endReason: null,
    lastWinner: null,
    matchWinner: null,
    events: [],
  };
  beginCountdown(match);
  return match;
}

function finishRound(match, winner, reason) {
  if (winner != null) match.riders[winner].roundWins += 1;
  for (const rider of match.riders) rider.hitCd = 0;
  match.lastWinner = winner;
  match.endReason = reason;
  match.phase = "roundover";
  match.phaseTimer = BANNER_TIME;
  match.timeLeft = Math.max(0, match.timeLeft);
  match.events.push({ type: "round", id: winner, reason });
}

function championId(match) {
  const contenders = match.riders.filter((rider) => rider.active && rider.roundWins >= match.winsNeeded);
  if (contenders.length === 0) return null;
  contenders.sort((a, b) => b.roundWins - a.roundWins || a.id - b.id);
  return contenders[0].id;
}

export function updateMatch(match, inputList = []) {
  match.events = [];

  if (match.phase === "countdown") {
    const prev = Math.ceil(match.phaseTimer);
    match.phaseTimer -= 1 / 60;
    if (match.phaseTimer <= 0) {
      match.phase = "playing";
      match.phaseTimer = 0;
      match.events.push({ type: "go" });
    } else {
      const next = Math.ceil(match.phaseTimer);
      if (next !== prev && next > 0) match.events.push({ type: "tick", n: next });
    }
    return match;
  }

  if (match.phase === "roundover") {
    match.phaseTimer -= 1 / 60;
    if (match.phaseTimer <= 0) {
      const champ = championId(match);
      if (champ != null) {
        match.phase = "matchover";
        match.matchWinner = champ;
        match.events.push({ type: "match", id: champ });
      } else {
        match.round += 1;
        beginCountdown(match);
        match.events.push({ type: "tick", n: 3 });
      }
    }
    return match;
  }

  if (match.phase === "matchover") return match;

  for (let i = 0; i < match.riders.length; i++) {
    const rider = match.riders[i];
    if (!rider.active) continue;
    const input = !rider.alive ? emptyInput() : rider.isBot ? decideBot(rider, match) : inputList[i] || emptyInput();
    const motion = stepRider(rider, input, match.arena, match.platforms);
    if (motion.flap) match.events.push({ type: "flap", id: rider.id });
    if (motion.dash) match.events.push({ type: "dash", id: rider.id });
  }

  match.events.push(...resolveCombat(match.riders, match.arena));
  match.events.push(...resolveFog(match.riders, match.arena));

  match.emberTimer -= 1 / 60;
  if (match.emberTimer <= 0) {
    match.emberTimer = EMBER_EVERY;
    if (match.embers.length < EMBER_MAX) match.embers.push(createEmber(match.rng, match.arena));
  }
  const picked = resolveEmbers(match.riders, match.embers);
  match.embers = picked.embers;
  match.events.push(...picked.events);

  match.timeLeft -= 1 / 60;

  const active = match.riders.filter((rider) => rider.active);
  const alive = active.filter((rider) => rider.alive);
  if (active.length >= 2 && alive.length <= 1) {
    const winner = alive.length === 1 ? alive[0].id : judgeByScore(active);
    finishRound(match, winner, "last");
  } else if (match.timeLeft <= 0) {
    finishRound(match, judgeByScore(active), "time");
  }

  return match;
}

export { judgeByScore };
