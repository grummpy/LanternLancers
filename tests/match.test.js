import test from "node:test";
import assert from "node:assert/strict";
import { createMatch, updateMatch, judgeByScore } from "../src/core/match.js";
import { createRider } from "../src/core/rider.js";
import { DT, ROUND_TIME } from "../src/core/constants.js";
import { blanks, humans } from "./helpers.js";

function playing(opts = {}) {
  const match = createMatch({ seed: 5, winsNeeded: opts.winsNeeded ?? 3, slots: humans(opts.humans ?? 2) });
  match.phase = "playing";
  match.phaseTimer = 0;
  match.timeLeft = opts.timeLeft ?? ROUND_TIME;
  return match;
}

test("judgeByScore prefers lanterns, then pops, and draws a full tie", () => {
  const riders = [
    createRider(0, { lanterns: 1, pops: 4 }),
    createRider(1, { lanterns: 3, pops: 0 }),
    createRider(2, { active: false, lanterns: 3, pops: 9 }),
  ];
  assert.equal(judgeByScore(riders), 1);

  riders[0].lanterns = 3;
  riders[0].pops = 2;
  riders[1].pops = 5;
  assert.equal(judgeByScore(riders), 1);

  riders[0].pops = 5;
  assert.equal(judgeByScore(riders), null);
});

test("the last rider aloft wins the round", () => {
  const match = playing({ humans: 4 });
  match.riders[1].alive = false;
  match.riders[1].lanterns = 0;
  match.riders[2].alive = false;
  match.riders[2].lanterns = 0;
  match.riders[3].alive = false;
  match.riders[3].lanterns = 0;
  updateMatch(match, blanks());
  assert.equal(match.phase, "roundover");
  assert.equal(match.endReason, "last");
  assert.equal(match.lastWinner, 0);
  assert.equal(match.riders[0].roundWins, 1);
});

test("a timeout awards the round to the most lanterns, then the most pops", () => {
  const byLanterns = playing();
  byLanterns.timeLeft = DT * 0.5;
  byLanterns.riders[0].lanterns = 1;
  byLanterns.riders[0].pops = 6;
  byLanterns.riders[1].lanterns = 3;
  byLanterns.riders[0].x = 40;
  byLanterns.riders[1].x = 700;
  updateMatch(byLanterns, blanks());
  assert.equal(byLanterns.phase, "roundover");
  assert.equal(byLanterns.endReason, "time");
  assert.equal(byLanterns.lastWinner, 1);

  const byPops = playing();
  byPops.timeLeft = DT * 0.5;
  byPops.riders[0].lanterns = 2;
  byPops.riders[1].lanterns = 2;
  byPops.riders[0].pops = 1;
  byPops.riders[1].pops = 4;
  byPops.riders[0].x = 40;
  byPops.riders[1].x = 700;
  updateMatch(byPops, blanks());
  assert.equal(byPops.lastWinner, 1);

  const draw = playing();
  draw.timeLeft = DT * 0.5;
  draw.riders[0].lanterns = 2;
  draw.riders[1].lanterns = 2;
  draw.riders[0].pops = 2;
  draw.riders[1].pops = 2;
  draw.riders[0].x = 40;
  draw.riders[1].x = 700;
  updateMatch(draw, blanks());
  assert.equal(draw.phase, "roundover");
  assert.equal(draw.lastWinner, null);
  assert.equal(draw.riders[0].roundWins, 0);
  assert.equal(draw.riders[1].roundWins, 0);
});

test("first to the configured round wins takes the match, then a new round resets bodies", () => {
  const match = playing({ humans: 2, winsNeeded: 1 });
  match.riders[1].alive = false;
  match.riders[1].lanterns = 0;
  updateMatch(match, blanks());
  assert.equal(match.riders[0].roundWins, 1);
  for (let i = 0; i < 200; i++) updateMatch(match, blanks());
  assert.equal(match.phase, "matchover");
  assert.equal(match.matchWinner, 0);

  const longer = playing({ humans: 2, winsNeeded: 3 });
  longer.riders[1].alive = false;
  longer.riders[1].lanterns = 0;
  updateMatch(longer, blanks());
  for (let i = 0; i < 200; i++) updateMatch(longer, blanks());
  assert.equal(longer.phase, "countdown");
  assert.equal(longer.round, 2);
  assert.equal(longer.riders[0].roundWins, 1);
  assert.equal(longer.riders[1].alive, true);
  assert.equal(longer.riders[1].lanterns, 3);
  assert.equal(longer.riders[1].pops, 0);
});
