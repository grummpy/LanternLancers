import test from "node:test";
import assert from "node:assert/strict";
import { createMatch, updateMatch } from "../src/core/match.js";
import { decideBot } from "../src/core/bots.js";
import { allBots } from "./helpers.js";

function botMatch() {
  const match = createMatch({ seed: 4, slots: allBots() });
  match.phase = "playing";
  match.riders[2].active = false;
  match.riders[3].active = false;
  return match;
}

test("a bot flaps away from the fog", () => {
  const match = botMatch();
  const rider = match.riders[0];
  rider.y = match.arena.fogTop - rider.h - 10;
  const input = decideBot(rider, match);
  assert.equal(input.up || input.action, true);
  assert.equal(input.down, false);
});

test("a bot closes on a foe and dashes when its lance is higher", () => {
  const match = botMatch();
  const rider = match.riders[0];
  const foe = match.riders[1];
  rider.x = 100;
  rider.y = 150;
  rider.dashCd = 0;
  foe.x = 420;
  foe.y = 150;
  foe.alive = true;
  const chase = decideBot(rider, match);
  assert.equal(chase.right, true);

  foe.x = 112;
  foe.y = 210;
  const dash = decideBot(rider, match);
  assert.equal(dash.secondary, true);
});

test("bot decisions and a four-bot joust are deterministic", () => {
  const first = createMatch({ seed: 42, winsNeeded: 3, slots: allBots() });
  const second = createMatch({ seed: 42, winsNeeded: 3, slots: allBots() });
  for (let i = 0; i < 60 * 25; i++) {
    updateMatch(first, []);
    updateMatch(second, []);
  }
  const snap = (match) =>
    match.riders.map((rider) => ({
      x: rider.x,
      y: rider.y,
      lanterns: rider.lanterns,
      pops: rider.pops,
      alive: rider.alive,
      roundWins: rider.roundWins,
    }));
  assert.deepEqual(snap(first), snap(second));
  for (const rider of first.riders) {
    assert.ok(Number.isFinite(rider.x) && Number.isFinite(rider.y));
    assert.ok(rider.lanterns >= 0 && rider.lanterns <= 3);
  }
  const pops = first.riders.reduce((sum, rider) => sum + rider.pops, 0);
  assert.ok(pops > 0, "bots should pop at least one lantern");
});
