/** Canvas drawing for every screen. Reads state; never mutates the sim. */

import { PLAYER_NAMES } from "../core/constants.js";
import { emberCenter } from "../core/combat.js";
import { labelForCode } from "../core/inputmap.js";

const COLORS = [
  { body: "#ffb020", wing: "#ffe1a8", glow: "#ffd56a", dark: "#8a4b00" },
  { body: "#ff4d5a", wing: "#ffc1c6", glow: "#ff8b94", dark: "#6e1020" },
  { body: "#2ad4c5", wing: "#c8fff6", glow: "#7dffe8", dark: "#0c4f4a" },
  { body: "#c084fc", wing: "#ead9ff", glow: "#d8b4fe", dark: "#3b0764" },
];

const STARS = [
  [40, 30, 1.2], [90, 80, 1], [140, 24, 1.4], [210, 70, 1], [260, 36, 1.1],
  [320, 90, 1.3], [380, 28, 1], [450, 64, 1.5], [520, 22, 1], [580, 88, 1.2],
  [640, 40, 1], [700, 18, 1.4], [860, 50, 1.1], [910, 96, 1.3], [180, 120, 1],
  [800, 130, 1], [70, 150, 1.2], [500, 110, 1],
];

const FIELDS = [
  ["left", "Left"],
  ["right", "Right"],
  ["up", "Up / flap"],
  ["down", "Dive"],
  ["action", "Flap"],
  ["secondary", "Dash"],
];

export function playerColor(id) {
  return COLORS[id];
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function glow(ctx, x, y, radius, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds - 1e-6));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function drawSky(ctx, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, 540);
  sky.addColorStop(0, "#070814");
  sky.addColorStop(0.55, "#171232");
  sky.addColorStop(1, "#2a1238");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 960, 540);

  ctx.fillStyle = "#f3e2b6";
  ctx.beginPath();
  ctx.arc(780, 78, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#171232";
  ctx.beginPath();
  ctx.arc(792, 72, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff6d8";
  for (const [x, y, r] of STARS) {
    const twinkle = 0.45 + Math.sin(time * 2 + x) * 0.35;
    ctx.globalAlpha = twinkle;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#120c22";
  ctx.beginPath();
  ctx.moveTo(0, 470);
  ctx.lineTo(80, 430);
  ctx.lineTo(180, 458);
  ctx.lineTo(300, 420);
  ctx.lineTo(430, 460);
  ctx.lineTo(560, 418);
  ctx.lineTo(700, 455);
  ctx.lineTo(820, 424);
  ctx.lineTo(960, 462);
  ctx.lineTo(960, 540);
  ctx.lineTo(0, 540);
  ctx.fill();
}

function drawPlatforms(ctx, platforms) {
  for (const platform of platforms) {
    ctx.fillStyle = "#2c2418";
    roundRect(ctx, platform.x, platform.y, platform.w, platform.h, 5);
    ctx.fill();
    ctx.fillStyle = "#6f8f45";
    roundRect(ctx, platform.x + 2, platform.y, platform.w - 4, 5, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 198, 110, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(platform.x + 0.5, platform.y + 0.5, platform.w - 1, platform.h - 1);
    glow(ctx, platform.x + platform.w * 0.5, platform.y - 2, 4, "#ffc857");
  }
}

function drawFog(ctx, fogTop, time) {
  const fog = ctx.createLinearGradient(0, fogTop - 16, 0, 540);
  fog.addColorStop(0, "rgba(120, 50, 160, 0)");
  fog.addColorStop(0.35, "rgba(130, 60, 170, 0.35)");
  fog.addColorStop(1, "rgba(28, 8, 40, 0.92)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, fogTop - 16, 960, 540 - fogTop + 16);
  ctx.strokeStyle = "rgba(230, 190, 255, 0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= 960; x += 6) {
    const y = fogTop + 8 + Math.sin(x * 0.02 + time * 1.4) * 5;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawEmber(ctx, ember) {
  const at = emberCenter(ember);
  glow(ctx, at.x, at.y, at.r, "#ff9f1c");
  ctx.fillStyle = "#fff4cf";
  ctx.beginPath();
  ctx.arc(at.x, at.y, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawRider(ctx, rider, time, arenaWidth) {
  const copies = [rider.x];
  if (rider.x + rider.w > arenaWidth) copies.push(rider.x - arenaWidth);
  for (const x of copies) drawRiderAt(ctx, rider, x, time);
}

function drawRiderAt(ctx, rider, x, time) {
  const color = COLORS[rider.id];
  const cx = x + rider.w / 2;
  const cy = rider.y + rider.h / 2;
  ctx.save();
  ctx.globalAlpha = rider.alive ? 1 : 0.55;
  if (rider.dashTime > 0) {
    ctx.strokeStyle = color.glow;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - rider.facing * 36, cy + 4);
    ctx.stroke();
    ctx.globalAlpha = rider.alive ? 1 : 0.55;
  }
  ctx.translate(cx, cy);
  if (!rider.alive) ctx.rotate(rider.facing * 0.5);
  ctx.scale(rider.facing, 1);

  const wing = rider.flapAnim > 0 ? -1.15 + (0.2 - rider.flapAnim) * 7 : Math.sin(time * 7 + rider.id) * 0.22;
  ctx.fillStyle = color.wing;
  ctx.beginPath();
  ctx.ellipse(-2, 5, 18, 6.5, wing, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(1, 3, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color.body;
  ctx.beginPath();
  ctx.ellipse(13, -5, 7, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1020";
  ctx.beginPath();
  ctx.arc(15, -6, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#f8f1c8";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(18, -3);
  ctx.lineTo(33, -8);
  ctx.stroke();
  ctx.fillStyle = color.glow;
  ctx.beginPath();
  ctx.arc(34, -8, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (rider.hitCd > 0.28) {
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.strokeRect(x - 2, rider.y - 2, rider.w + 4, rider.h + 4);
  }

  const lit = rider.alive ? rider.lanterns : 0;
  for (let i = 0; i < lit; i++) {
    const lx = x + rider.w / 2 + (i - (lit - 1) / 2) * 11;
    const ly = rider.y + rider.h + 10 + Math.sin(time * 3 + i + rider.id) * 1.6;
    ctx.strokeStyle = "rgba(255, 214, 150, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + rider.w / 2, rider.y + rider.h - 2);
    ctx.lineTo(lx, ly - 4);
    ctx.stroke();
    glow(ctx, lx, ly, 5, color.glow);
  }

  if (rider.alive && rider.dashCd > 0) {
    const frac = Math.max(0, 1 - rider.dashCd / 1.5);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + rider.w / 2, rider.y - 8, 5, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
}

function drawPadIcon(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#fff1cf";
  ctx.lineWidth = 1.4;
  roundRect(ctx, 0, 0, 18, 12, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, 6);
  ctx.lineTo(8, 6);
  ctx.moveTo(6, 4);
  ctx.lineTo(6, 8);
  ctx.arc(13.5, 4.5, 1.1, 0, Math.PI * 2);
  ctx.moveTo(13.5, 8.5);
  ctx.arc(13.5, 8.5, 1.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHud(ctx, match, pads) {
  const slots = [
    { x: 8, id: 0 },
    { x: 164, id: 1 },
    { x: 644, id: 2 },
    { x: 800, id: 3 },
  ];
  for (const slot of slots) {
    const rider = match.riders[slot.id];
    const color = COLORS[slot.id];
    ctx.fillStyle = "rgba(8, 6, 16, 0.72)";
    roundRect(ctx, slot.x, 8, 152, 62, 8);
    ctx.fill();
    ctx.fillStyle = rider.active ? color.body : "#3a3344";
    ctx.fillRect(slot.x, 8, 6, 62);
    ctx.fillStyle = rider.active ? "#fff6e4" : "#8d8494";
    ctx.font = "15px Georgia, Palatino, serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const tag = !rider.active ? "Off" : rider.isBot ? "Bot" : "You";
    ctx.fillText(`${PLAYER_NAMES[slot.id]}`, slot.x + 14, 12);
    ctx.font = "11px Georgia, Palatino, serif";
    ctx.fillStyle = "#d9cbb0";
    ctx.fillText(tag, slot.x + 14, 30);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.fillStyle = rider.active && rider.alive && i < rider.lanterns ? color.glow : "rgba(255,255,255,0.18)";
      ctx.arc(slot.x + 58 + i * 12, 36, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffe29a";
    for (let i = 0; i < match.winsNeeded; i++) {
      ctx.globalAlpha = i < rider.roundWins ? 1 : 0.25;
      ctx.fillRect(slot.x + 14 + i * 10, 50, 7, 7);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#f0e2c4";
    ctx.font = "11px Georgia, Palatino, serif";
    ctx.textAlign = "right";
    ctx.fillText(rider.active ? `${rider.pops}` : "", slot.x + 142, 46);
    if (pads[slot.id]) drawPadIcon(ctx, slot.x + 128, 12);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fff6e4";
  ctx.font = "28px Georgia, Palatino, serif";
  ctx.fillText(formatTime(match.timeLeft), 480, 12);
  ctx.font = "14px Georgia, Palatino, serif";
  ctx.fillStyle = "#f0d7a2";
  ctx.fillText(`Round ${match.round}`, 480, 44);
}

function drawArena(ctx, match, time, pads) {
  drawSky(ctx, time);
  drawPlatforms(ctx, match.platforms);
  for (const ember of match.embers) drawEmber(ctx, ember);
  for (const rider of match.riders) {
    if (!rider.active) continue;
    drawRider(ctx, rider, time, match.arena.width);
  }
  drawFog(ctx, match.arena.fogTop, time);
  drawHud(ctx, match, pads);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = "rgba(10, 8, 18, 0.82)";
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 206, 130, 0.45)";
  ctx.stroke();
}

function menuLine(ctx, label, x, y, selected) {
  ctx.textAlign = "center";
  ctx.font = selected ? "bold 26px Georgia, Palatino, serif" : "22px Georgia, Palatino, serif";
  ctx.fillStyle = selected ? "#ffd56a" : "#fff6e4";
  ctx.fillText(selected ? `▸ ${label}` : label, x, y);
}

export function render(ctx, view) {
  const time = view.time;
  ctx.clearRect(0, 0, 960, 540);
  if (view.screen === "title") drawTitle(ctx, view, time);
  else if (view.screen === "join") drawJoin(ctx, view, time);
  else if (view.screen === "settings") drawSettings(ctx, view);
  else if (view.screen === "controls") drawControls(ctx, view);
  else if (view.screen === "match") drawMatch(ctx, view, time);
  else drawPlay(ctx, view, time);
}

function drawTitle(ctx, view, time) {
  if (view.cover && view.cover.complete && view.cover.naturalWidth) {
    const image = view.cover;
    const scale = Math.max(960 / image.naturalWidth, 540 / image.naturalHeight);
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    ctx.drawImage(image, (960 - dw) / 2, (540 - dh) / 2, dw, dh);
  } else {
    drawSky(ctx, time);
  }
  const veil = ctx.createLinearGradient(0, 180, 0, 540);
  veil.addColorStop(0, "rgba(6, 4, 12, 0.05)");
  veil.addColorStop(1, "rgba(6, 4, 12, 0.78)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, 960, 540);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe7a8";
  ctx.font = "64px Georgia, Palatino, serif";
  ctx.shadowColor = "rgba(255, 170, 50, 0.85)";
  ctx.shadowBlur = 18;
  ctx.fillText("Lantern Lancers", 480, 300);
  ctx.shadowBlur = 0;
  ctx.font = "20px Georgia, Palatino, serif";
  ctx.fillStyle = "#fff6e4";
  ctx.fillText("Joust on glowing lantern-birds", 480, 360);
  const blink = 0.45 + Math.sin(time * 4) * 0.45;
  ctx.globalAlpha = 0.35 + blink * 0.65;
  ctx.font = "22px Georgia, Palatino, serif";
  ctx.fillStyle = "#ffd56a";
  ctx.fillText("Press Enter / Start", 480, 430);
  ctx.globalAlpha = 0.8;
  ctx.font = "14px Georgia, Palatino, serif";
  ctx.fillStyle = "#f0e2c4";
  ctx.fillText("C  settings     M  mute", 480, 470);
  ctx.globalAlpha = 1;
}

function drawJoin(ctx, view, time) {
  drawSky(ctx, time);
  ctx.fillStyle = "#fff6e4";
  ctx.textAlign = "center";
  ctx.font = "36px Georgia, Palatino, serif";
  ctx.fillText("Who rides?", 480, 36);
  ctx.font = "15px Georgia, Palatino, serif";
  ctx.fillStyle = "#f0d7a2";
  ctx.fillText("Action joins  ·  Secondary toggles bot / off  ·  Enter starts", 480, 78);

  const cards = [
    [48, 108],
    [508, 108],
    [48, 292],
    [508, 292],
  ];
  cards.forEach(([x, y], id) => {
    const color = COLORS[id];
    const state = view.slots[id];
    ctx.fillStyle = "rgba(8, 6, 16, 0.78)";
    roundRect(ctx, x, y, 404, 160, 12);
    ctx.fill();
    ctx.fillStyle = color.body;
    ctx.fillRect(x, y, 8, 160);
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff6e4";
    ctx.font = "26px Georgia, Palatino, serif";
    ctx.fillText(`P${id + 1}  ${PLAYER_NAMES[id]}`, x + 24, y + 18);
    ctx.font = "18px Georgia, Palatino, serif";
    ctx.fillStyle = state === "human" ? color.glow : state === "bot" ? "#f0d7a2" : "#8d8494";
    ctx.fillText(state === "human" ? "Human" : state === "bot" ? "Bot" : "Off", x + 24, y + 56);
    const binding = view.bindings[id];
    ctx.fillStyle = "#e7dcc6";
    ctx.font = "15px Georgia, Palatino, serif";
    ctx.fillText(
      `${labelForCode(binding.left)} ${labelForCode(binding.right)} ${labelForCode(binding.up)} ${labelForCode(binding.down)}   flap ${labelForCode(binding.action)}   dash ${labelForCode(binding.secondary)}`,
      x + 24,
      y + 98,
    );
    if (view.pads[id]) {
      drawPadIcon(ctx, x + 360, y + 22);
      ctx.fillStyle = "#f0d7a2";
      ctx.font = "13px Georgia, Palatino, serif";
      ctx.fillText("Pad", x + 328, y + 24);
    }
  });

  ctx.textAlign = "center";
  ctx.font = "16px Georgia, Palatino, serif";
  ctx.fillStyle = view.message ? "#ffb4a2" : "#d9cbb0";
  ctx.fillText(view.message || "Empty slots can ride as bots. One rider is enough to start.", 480, 490);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#ffd56a";
  ctx.fillText("Esc  title", 480, 514);
  ctx.globalAlpha = 1;
}

function drawPlay(ctx, view, time) {
  drawArena(ctx, view.match, time, view.pads);
  const match = view.match;
  if (match.phase === "countdown") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff6e4";
    ctx.font = "92px Georgia, Palatino, serif";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 12;
    ctx.fillText(String(Math.max(1, Math.ceil(match.phaseTimer))), 480, 220);
    ctx.shadowBlur = 0;
  } else if (view.now < view.goUntil) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd56a";
    ctx.font = "80px Georgia, Palatino, serif";
    ctx.fillText("GO", 480, 230);
  }
  if (match.phase === "roundover") drawRoundBanner(ctx, match);
  if (view.screen === "pause") drawPause(ctx, view);
}

function drawRoundBanner(ctx, match) {
  panel(ctx, 230, 150, 500, 180);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff6e4";
  ctx.font = "32px Georgia, Palatino, serif";
  const winner = match.lastWinner;
  const title = winner == null ? "Draw" : `${PLAYER_NAMES[winner]} takes the round`;
  ctx.fillText(title, 480, 180);
  ctx.font = "16px Georgia, Palatino, serif";
  ctx.fillStyle = "#f0d7a2";
  const reason = match.endReason === "time" ? "Time    most lanterns, then most pops" : "Last rider aloft";
  ctx.fillText(reason, 480, 224);
  const bits = match.riders
    .filter((rider) => rider.active)
    .map((rider) => `${PLAYER_NAMES[rider.id]} ${rider.roundWins}`)
    .join("    ");
  ctx.fillStyle = "#fff6e4";
  ctx.fillText(bits, 480, 268);
}

function drawPause(ctx, view) {
  ctx.fillStyle = "rgba(4, 2, 10, 0.55)";
  ctx.fillRect(0, 0, 960, 540);
  panel(ctx, 330, 140, 300, 250);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd56a";
  ctx.font = "28px Georgia, Palatino, serif";
  ctx.fillText("Paused", 480, 164);
  const items = ["Resume", "Settings", "Quit to title"];
  items.forEach((label, index) => menuLine(ctx, label, 480, 220 + index * 42, index === view.menuIndex));
}

function drawSettings(ctx, view) {
  drawSky(ctx, view.time);
  panel(ctx, 250, 80, 460, 380);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd56a";
  ctx.font = "32px Georgia, Palatino, serif";
  ctx.fillText("Settings", 480, 108);
  const rows = [
    `Volume    ${Math.round(view.volume * 100)}%`,
    `Round wins    ${view.winsNeeded}`,
    "Controls",
    "Back",
  ];
  rows.forEach((label, index) => menuLine(ctx, label, 480, 180 + index * 52, index === view.menuIndex));
  ctx.font = "14px Georgia, Palatino, serif";
  ctx.fillStyle = "#d9cbb0";
  ctx.fillText("Left / right change a value    Enter opens controls", 480, 410);
}

function drawControls(ctx, view) {
  drawSky(ctx, view.time);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd56a";
  ctx.font = "30px Georgia, Palatino, serif";
  ctx.fillText("Controls", 480, 28);
  ctx.font = "14px Georgia, Palatino, serif";
  ctx.fillStyle = "#f0d7a2";
  ctx.fillText(view.capturing ? "Press a new key    Esc cancels" : "Arrows move    Enter rebinds    Esc back", 480, 58);

  for (let p = 0; p < 4; p++) {
    const x = 30 + p * 234;
    const selected = p === view.controlPlayer;
    ctx.fillStyle = selected ? "rgba(255, 210, 120, 0.16)" : "rgba(8, 6, 16, 0.72)";
    roundRect(ctx, x, 84, 220, 400, 10);
    ctx.fill();
    ctx.strokeStyle = COLORS[p].body;
    ctx.stroke();
    ctx.fillStyle = COLORS[p].glow;
    ctx.font = "18px Georgia, Palatino, serif";
    ctx.textAlign = "center";
    ctx.fillText(`P${p + 1} ${PLAYER_NAMES[p]}`, x + 110, 100);
    FIELDS.forEach(([field, label], row) => {
      const here = selected && row === view.controlRow;
      const y = 150 + row * 48;
      if (here) {
        ctx.fillStyle = "rgba(255, 213, 106, 0.18)";
        roundRect(ctx, x + 12, y - 8, 196, 40, 6);
        ctx.fill();
      }
      ctx.textAlign = "left";
      ctx.font = "14px Georgia, Palatino, serif";
      ctx.fillStyle = "#f0e2c4";
      ctx.fillText(label, x + 22, y);
      ctx.textAlign = "right";
      ctx.fillStyle = here && view.capturing ? "#ffd56a" : "#fff6e4";
      const value = here && view.capturing ? "…" : labelForCode(view.bindings[p][field]);
      ctx.fillText(value, x + 198, y);
    });
  }
  if (view.message) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffb4a2";
    ctx.font = "16px Georgia, Palatino, serif";
    ctx.fillText(view.message, 480, 510);
  }
}

function drawMatch(ctx, view, time) {
  drawArena(ctx, view.match, time, view.pads);
  ctx.fillStyle = "rgba(4, 2, 10, 0.62)";
  ctx.fillRect(0, 0, 960, 540);
  panel(ctx, 180, 70, 600, 400);
  const match = view.match;
  const winner = match.matchWinner;
  ctx.textAlign = "center";
  ctx.fillStyle = winner == null ? "#fff6e4" : COLORS[winner].glow;
  ctx.font = "40px Georgia, Palatino, serif";
  ctx.fillText(winner == null ? "No champion" : `${PLAYER_NAMES[winner]} wins the match`, 480, 100);
  const ranked = match.riders
    .filter((rider) => rider.active)
    .slice()
    .sort((a, b) => b.roundWins - a.roundWins || a.id - b.id);
  ranked.forEach((rider, index) => {
    ctx.fillStyle = COLORS[rider.id].body;
    ctx.font = "24px Georgia, Palatino, serif";
    ctx.fillText(
      `${index + 1}.  ${PLAYER_NAMES[rider.id]}    ${rider.roundWins} round ${rider.roundWins === 1 ? "win" : "wins"}`,
      480,
      170 + index * 42,
    );
  });
  ctx.font = "18px Georgia, Palatino, serif";
  ctx.fillStyle = "#ffd56a";
  ctx.fillText("Enter  rematch     Esc  title", 480, 420);
}
