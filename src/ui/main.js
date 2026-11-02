/** Screen flow, fixed-timestep loop, and the DOM shell around the sim. */

import { BIND_FIELDS, DT, PLAYER_NAMES } from "../core/constants.js";
import { bindingsConflict, cloneBindings, DEFAULT_BINDINGS } from "../core/inputmap.js";
import { createMatch, updateMatch } from "../core/match.js";
import { createAudio } from "./audio.js";
import { createInput } from "./input.js";
import { render } from "./render.js";

const STORAGE_KEY = "lanternlancers.settings";
const WIN_OPTIONS = [1, 2, 3, 4, 5];

const canvas = document.getElementById("view");
const statusEl = document.getElementById("status");
const ctx = canvas.getContext("2d");

const cover = new Image();
cover.src = "assets/cover.jpg";

const audio = createAudio();
const stored = loadSettings();
const ui = {
  screen: "title",
  slots: ["bot", "bot", "bot", "bot"],
  bindings: stored.bindings,
  volume: stored.volume,
  muted: stored.muted,
  winsNeeded: stored.winsNeeded,
  menuIndex: 0,
  controlPlayer: 0,
  controlRow: 0,
  capturing: false,
  message: "",
  messageUntil: 0,
  match: null,
  goUntil: 0,
  returnTo: "title",
  now: 0,
};

const input = createInput(ui.bindings);
audio.setVolume(ui.volume);
audio.setMuted(ui.muted);

let audioOn = false;
let last = performance.now();
let accumulator = 0;

function loadSettings() {
  const fallback = {
    bindings: cloneBindings(DEFAULT_BINDINGS),
    volume: 0.7,
    muted: false,
    winsNeeded: 3,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    const bindings = sanitizeBindings(data.bindings);
    return {
      bindings: bindings || fallback.bindings,
      volume: clamp(Number(data.volume), 0, 1, 0.7),
      muted: !!data.muted,
      winsNeeded: WIN_OPTIONS.includes(data.winsNeeded) ? data.winsNeeded : 3,
    };
  } catch {
    return fallback;
  }
}

function sanitizeBindings(value) {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const bindings = value.map((entry, index) => {
    const next = { ...DEFAULT_BINDINGS[index] };
    if (!entry || typeof entry !== "object") return next;
    for (const field of BIND_FIELDS) {
      if (typeof entry[field] === "string" && entry[field] && entry[field] !== "Escape") {
        next[field] = entry[field];
      }
    }
    return next;
  });
  const seen = new Set();
  for (const binding of bindings) {
    for (const field of BIND_FIELDS) {
      if (seen.has(binding[field])) return null;
      seen.add(binding[field]);
    }
  }
  return bindings;
}

function saveSettings() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        bindings: ui.bindings,
        volume: ui.volume,
        muted: ui.muted,
        winsNeeded: ui.winsNeeded,
      }),
    );
  } catch {
    /* private mode and full storage still leave the match playable */
  }
}

function clamp(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function pokeAudio() {
  audio.unlock();
  if (!audioOn) {
    audio.startTheme();
    audioOn = true;
  }
}

function note(text) {
  ui.message = text;
  ui.messageUntil = performance.now() + 1600;
}

function anyPad(edges, field) {
  return edges.some((edge) => edge[field]);
}

function edgeAction(keys, padEdges, player) {
  const code = ui.bindings[player].action;
  return keys.has(code) || padEdges[player].action;
}

function edgeSecondary(keys, padEdges, player) {
  const code = ui.bindings[player].secondary;
  return keys.has(code) || padEdges[player].secondary;
}

function menuDirection(keys, padEdges) {
  return {
    up: keys.has("ArrowUp") || keys.has("KeyW") || anyPad(padEdges, "up"),
    down: keys.has("ArrowDown") || keys.has("KeyS") || anyPad(padEdges, "down"),
    left: keys.has("ArrowLeft") || keys.has("KeyA") || anyPad(padEdges, "left"),
    right: keys.has("ArrowRight") || keys.has("KeyD") || anyPad(padEdges, "right"),
    confirm: keys.has("Enter") || keys.has("NumpadEnter") || keys.has("Space") || anyPad(padEdges, "action"),
    back: keys.has("Escape") || anyPad(padEdges, "secondary"),
    start: keys.has("Enter") || keys.has("NumpadEnter") || keys.has("Space") || anyPad(padEdges, "pause"),
  };
}

function startMatch() {
  const active = ui.slots.filter((slot) => slot !== "off").length;
  if (active < 1) {
    note("Enable at least one rider");
    return;
  }
  const slots = ui.slots.map((slot) => ({
    active: slot !== "off",
    bot: slot === "bot",
  }));
  const seed = (Date.now() ^ (performance.now() * 997)) >>> 0;
  ui.match = createMatch({ seed, winsNeeded: ui.winsNeeded, slots });
  ui.screen = "play";
  ui.menuIndex = 0;
  ui.goUntil = 0;
  accumulator = 0;
  audio.tick();
}

function rematch() {
  const slots = ui.slots.map((slot) => ({
    active: slot !== "off",
    bot: slot === "bot",
  }));
  const seed = (Date.now() ^ (performance.now() * 997)) >>> 0;
  ui.match = createMatch({ seed, winsNeeded: ui.winsNeeded, slots });
  ui.screen = "play";
  accumulator = 0;
  audio.tick();
}

function openSettings(from) {
  ui.returnTo = from;
  ui.screen = "settings";
  ui.menuIndex = 0;
  ui.message = "";
}

function handleTitle(nav, keys, padEdges) {
  const actionJoin = [0, 1, 2, 3].some((player) => edgeAction(keys, padEdges, player));
  if (nav.start || actionJoin) {
    ui.screen = "join";
    ui.message = "";
    return;
  }
  if (keys.has("KeyC")) openSettings("title");
}

function handleJoin(nav, keys, padEdges) {
  if (keys.has("Escape")) {
    ui.screen = "title";
    return;
  }
  for (let player = 0; player < 4; player++) {
    if (edgeAction(keys, padEdges, player)) ui.slots[player] = "human";
    else if (edgeSecondary(keys, padEdges, player)) {
      const slot = ui.slots[player];
      ui.slots[player] = slot === "human" ? "bot" : slot === "bot" ? "off" : "bot";
    }
  }
  if (nav.start) startMatch();
}

function handlePause(nav, keys, padEdges) {
  if (nav.up) ui.menuIndex = (ui.menuIndex + 2) % 3;
  if (nav.down) ui.menuIndex = (ui.menuIndex + 1) % 3;
  if (keys.has("Escape") || anyPad(padEdges, "pause")) {
    ui.screen = "play";
    return;
  }
  if (!nav.confirm) return;
  if (ui.menuIndex === 0) ui.screen = "play";
  else if (ui.menuIndex === 1) openSettings("pause");
  else {
    ui.screen = "title";
    ui.match = null;
  }
}

function handleSettings(nav) {
  if (nav.up) ui.menuIndex = (ui.menuIndex + 3) % 4;
  if (nav.down) ui.menuIndex = (ui.menuIndex + 1) % 4;
  if (ui.menuIndex === 0 && (nav.left || nav.right)) {
    const step = nav.left ? -0.1 : 0.1;
    ui.volume = Math.round(clamp(ui.volume + step, 0, 1, 0.7) * 10) / 10;
    audio.setVolume(ui.volume);
    saveSettings();
  }
  if (ui.menuIndex === 1 && (nav.left || nav.right)) {
    const index = WIN_OPTIONS.indexOf(ui.winsNeeded);
    const next = (index + (nav.right ? 1 : WIN_OPTIONS.length - 1)) % WIN_OPTIONS.length;
    ui.winsNeeded = WIN_OPTIONS[next];
    if (ui.match) ui.match.winsNeeded = ui.winsNeeded;
    saveSettings();
  }
  if (nav.back) {
    closeSettings();
    return;
  }
  if (!nav.confirm) return;
  if (ui.menuIndex === 2) {
    ui.screen = "controls";
    ui.capturing = false;
    ui.message = "";
  } else if (ui.menuIndex === 3) {
    closeSettings();
  }
}

function closeSettings() {
  ui.screen = ui.returnTo === "pause" ? "pause" : "title";
  ui.menuIndex = 0;
}

function handleControls(nav, keys) {
  if (ui.capturing) {
    const code = [...keys][0];
    if (!code) return;
    if (code === "Escape") {
      ui.capturing = false;
      return;
    }
    const field = BIND_FIELDS[ui.controlRow];
    if (bindingsConflict(ui.bindings, ui.controlPlayer, field, code)) {
      note(code === "Escape" ? "Escape stays pause" : "That key is already used");
      ui.capturing = false;
      return;
    }
    ui.bindings[ui.controlPlayer] = { ...ui.bindings[ui.controlPlayer], [field]: code };
    input.setBindings(ui.bindings);
    saveSettings();
    ui.capturing = false;
    ui.message = "";
    return;
  }
  if (nav.back) {
    ui.screen = "settings";
    return;
  }
  if (nav.left) ui.controlPlayer = (ui.controlPlayer + 3) % 4;
  if (nav.right) ui.controlPlayer = (ui.controlPlayer + 1) % 4;
  if (nav.up) ui.controlRow = (ui.controlRow + FIELD_COUNT - 1) % FIELD_COUNT;
  if (nav.down) ui.controlRow = (ui.controlRow + 1) % FIELD_COUNT;
  if (nav.confirm) ui.capturing = true;
}

const FIELD_COUNT = BIND_FIELDS.length;

function handleMatch(nav) {
  if (nav.confirm || nav.start) rematch();
  else if (nav.back) {
    ui.screen = "title";
    ui.match = null;
  }
}

function pumpEvents(events) {
  for (const event of events) {
    if (event.type === "flap") audio.flap();
    else if (event.type === "dash") audio.dash();
    else if (event.type === "pop") audio.pop();
    else if (event.type === "bounce") audio.bounce();
    else if (event.type === "pickup") audio.pickup();
    else if (event.type === "ko") audio.ko();
    else if (event.type === "fog") audio.fog();
    else if (event.type === "tick") audio.tick();
    else if (event.type === "go") {
      audio.go();
      ui.goUntil = performance.now() + 700;
    } else if (event.type === "round") {
      if (event.id == null) audio.bounce();
      else audio.roundWin();
    } else if (event.type === "match") audio.matchWin();
  }
}

function stepSim() {
  if (ui.screen !== "play" || !ui.match) return;
  updateMatch(ui.match, input.playerInputs());
  pumpEvents(ui.match.events);
  if (ui.match.phase === "matchover") ui.screen = "match";
}

function syncStatus() {
  if (ui.message && performance.now() > ui.messageUntil) ui.message = "";
  let text = "Lantern Lancers.";
  if (ui.screen === "title") text = "Lantern Lancers. Press Enter to start.";
  else if (ui.screen === "join") {
    const parts = ui.slots.map((slot, id) => `P${id + 1} ${PLAYER_NAMES[id]} ${slot}`);
    text = `Join. ${parts.join(", ")}. ${ui.message || "Press Enter to start."}`;
  } else if (ui.screen === "settings") text = "Settings.";
  else if (ui.screen === "controls") text = ui.capturing ? "Press a key to rebind." : "Controls.";
  else if (ui.screen === "pause") text = "Paused.";
  else if (ui.screen === "match" && ui.match) {
    const winner = ui.match.matchWinner;
    text = winner == null ? "Match over." : `${PLAYER_NAMES[winner]} wins the match.`;
  } else if (ui.match) {
    const match = ui.match;
    const riders = match.riders
      .filter((rider) => rider.active)
      .map((rider) => `${PLAYER_NAMES[rider.id]} ${rider.alive ? rider.lanterns : 0} lanterns, ${rider.roundWins} wins`)
      .join("; ");
    if (match.phase === "roundover") {
      text = match.lastWinner == null ? `Draw. ${riders}` : `${PLAYER_NAMES[match.lastWinner]} takes the round. ${riders}`;
    } else if (match.phase === "countdown") text = `Round ${match.round} countdown. ${riders}`;
    else text = `Round ${match.round} playing. ${riders}`;
  }
  if (statusEl.textContent !== text) statusEl.textContent = text;
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  ui.now = now;
  input.poll();
  const keys = input.takeKeyEdges();
  const padEdges = input.padEdges();
  if (keys.size || padEdges.some((edge) => Object.values(edge).some(Boolean))) pokeAudio();
  if (keys.has("KeyM") && !(ui.screen === "controls" && ui.capturing)) {
    ui.muted = !ui.muted;
    audio.setMuted(ui.muted);
    saveSettings();
  }

  const nav = menuDirection(keys, padEdges);
  if (ui.screen === "title") handleTitle(nav, keys, padEdges);
  else if (ui.screen === "join") handleJoin(nav, keys, padEdges);
  else if (ui.screen === "settings") handleSettings(nav);
  else if (ui.screen === "controls") handleControls(nav, keys);
  else if (ui.screen === "pause") handlePause(nav, keys, padEdges);
  else if (ui.screen === "match") handleMatch(nav);
  else if (ui.screen === "play" && (keys.has("Escape") || anyPad(padEdges, "pause"))) {
    ui.screen = "pause";
    ui.menuIndex = 0;
  }

  if (ui.screen === "play" && ui.match) {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= DT && steps < 5 && ui.screen === "play") {
      stepSim();
      accumulator -= DT;
      steps += 1;
    }
  } else {
    accumulator = 0;
  }

  audio.update();
  render(ctx, {
    screen: ui.screen,
    time: now / 1000,
    now,
    cover,
    match: ui.match,
    slots: ui.slots,
    bindings: ui.bindings,
    pads: input.connected(),
    volume: ui.volume,
    muted: ui.muted,
    winsNeeded: ui.winsNeeded,
    menuIndex: ui.menuIndex,
    controlPlayer: ui.controlPlayer,
    controlRow: ui.controlRow,
    capturing: ui.capturing,
    message: ui.message,
    goUntil: ui.goUntil,
  });
  syncStatus();
  requestAnimationFrame(frame);
}

function fit() {
  const scale = Math.min(window.innerWidth / 960, window.innerHeight / 540);
  canvas.style.width = `${Math.floor(960 * scale)}px`;
  canvas.style.height = `${Math.floor(540 * scale)}px`;
}

window.addEventListener("resize", fit);
fit();
canvas.focus();

globalThis.__LANTERN__ = {
  snapshot() {
    const match = ui.match;
    return {
      screen: ui.screen,
      phase: match ? match.phase : null,
      round: match ? match.round : null,
      timeLeft: match ? match.timeLeft : null,
      winsNeeded: ui.winsNeeded,
      volume: ui.volume,
      muted: ui.muted,
      slots: ui.slots.slice(),
      menuIndex: ui.menuIndex,
      capturing: ui.capturing,
      controlPlayer: ui.controlPlayer,
      controlRow: ui.controlRow,
      bindings: ui.bindings.map((binding) => ({ ...binding })),
      pads: input.connected(),
      lastWinner: match ? match.lastWinner : null,
      endReason: match ? match.endReason : null,
      matchWinner: match ? match.matchWinner : null,
      message: ui.message,
      riders: match
        ? match.riders.map((rider) => ({
            id: rider.id,
            active: rider.active,
            isBot: rider.isBot,
            alive: rider.alive,
            lanterns: rider.lanterns,
            pops: rider.pops,
            roundWins: rider.roundWins,
            x: rider.x,
            y: rider.y,
            facing: rider.facing,
          }))
        : [],
    };
  },
};

requestAnimationFrame(frame);
