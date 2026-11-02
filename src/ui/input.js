/** DOM keyboard + Gamepad API polling. Hot-plug is just the next poll. */

import { actionsFromGamepad, resolvePlayerInput } from "../core/inputmap.js";

function blankEdges() {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    action: false,
    secondary: false,
    pause: false,
  };
}

function snapshotPad(raw) {
  const buttons = [];
  for (let i = 0; i < 16; i++) {
    const button = raw.buttons[i];
    buttons.push(button ? !!button.pressed : false);
  }
  return {
    connected: true,
    axes: [raw.axes?.[0] || 0, raw.axes?.[1] || 0],
    buttons,
  };
}

export function createInput(initialBindings) {
  const held = new Set();
  let edges = new Set();
  let bindings = initialBindings;
  let pads = [null, null, null, null];
  let prevPads = [null, null, null, null];
  let padEdges = [blankEdges(), blankEdges(), blankEdges(), blankEdges()];

  function isBound(code) {
    return bindings.some((binding) => Object.values(binding).includes(code));
  }

  function onKeyDown(event) {
    if (
      event.code === "Escape" ||
      event.code.startsWith("Arrow") ||
      event.code === "Space" ||
      event.code === "Tab" ||
      event.code.startsWith("Numpad") ||
      isBound(event.code)
    ) {
      event.preventDefault();
    }
    if (event.repeat || held.has(event.code)) return;
    held.add(event.code);
    edges.add(event.code);
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => held.clear());

  return {
    setBindings(next) {
      bindings = next;
    },
    poll() {
      const list = navigator.getGamepads ? navigator.getGamepads() : [];
      for (let i = 0; i < 4; i++) {
        const raw = list && list[i];
        const snap = raw && raw.connected ? snapshotPad(raw) : null;
        const now = snap ? actionsFromGamepad(snap) : blankEdges();
        const was = prevPads[i] ? actionsFromGamepad(prevPads[i]) : blankEdges();
        const edge = blankEdges();
        for (const key of Object.keys(edge)) edge[key] = now[key] && !was[key];
        padEdges[i] = edge;
        prevPads[i] = snap;
        pads[i] = snap;
      }
    },
    takeKeyEdges() {
      const taken = edges;
      edges = new Set();
      return taken;
    },
    padEdges() {
      return padEdges;
    },
    connected() {
      return pads.map((pad) => !!(pad && pad.connected));
    },
    playerInputs() {
      return [0, 1, 2, 3].map((index) => resolvePlayerInput(bindings[index], held, pads[index]));
    },
  };
}
