/** Keyboard and gamepad state → player actions. No DOM. */

import { BIND_FIELDS, PAD_DEADZONE } from "./constants.js";

export const DEFAULT_BINDINGS = [
  {
    left: "KeyA",
    right: "KeyD",
    up: "KeyW",
    down: "KeyS",
    action: "KeyF",
    secondary: "KeyG",
    pause: "Escape",
  },
  {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    action: "Slash",
    secondary: "Period",
    pause: "Escape",
  },
  {
    left: "KeyJ",
    right: "KeyL",
    up: "KeyI",
    down: "KeyK",
    action: "Semicolon",
    secondary: "Quote",
    pause: "Escape",
  },
  {
    left: "Numpad4",
    right: "Numpad6",
    up: "Numpad8",
    down: "Numpad5",
    action: "Numpad0",
    secondary: "NumpadEnter",
    pause: "Escape",
  },
];

const CODE_LABELS = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Slash: "/",
  Period: ".",
  Semicolon: ";",
  Quote: "'",
  Space: "Space",
  Escape: "Esc",
  Enter: "Enter",
  NumpadEnter: "Num Enter",
  NumpadAdd: "Num +",
  NumpadSubtract: "Num -",
  NumpadMultiply: "Num *",
  NumpadDivide: "Num /",
  NumpadDecimal: "Num .",
};

export function emptyInput() {
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

export function cloneBindings(bindings = DEFAULT_BINDINGS) {
  return bindings.map((binding) => ({ ...binding }));
}

function isDown(pressed, code) {
  if (!code) return false;
  if (pressed instanceof Set) return pressed.has(code);
  if (Array.isArray(pressed)) return pressed.includes(code);
  return !!pressed[code];
}

export function actionsFromKeys(binding, pressed) {
  const actions = emptyInput();
  for (const field of [...BIND_FIELDS, "pause"]) {
    actions[field] = isDown(pressed, binding[field]);
  }
  if (isDown(pressed, "Escape")) actions.pause = true;
  return actions;
}

function buttonPressed(pad, index) {
  const button = pad.buttons?.[index];
  if (!button) return false;
  if (typeof button === "object") return !!button.pressed;
  return !!button;
}

export function actionsFromGamepad(pad) {
  const actions = emptyInput();
  if (!pad) return actions;
  const x = pad.axes?.[0] ?? 0;
  const y = pad.axes?.[1] ?? 0;
  actions.left = x < -PAD_DEADZONE || buttonPressed(pad, 14);
  actions.right = x > PAD_DEADZONE || buttonPressed(pad, 15);
  actions.up = y < -PAD_DEADZONE || buttonPressed(pad, 12);
  actions.down = y > PAD_DEADZONE || buttonPressed(pad, 13);
  actions.action = buttonPressed(pad, 0);
  actions.secondary = buttonPressed(pad, 1);
  actions.pause = buttonPressed(pad, 9);
  return actions;
}

/**
 * A connected pad replaces that player's keyboard bindings.
 * `gamepad` is either a live Gamepad, a snapshot `{connected, axes, buttons}`, or null.
 */
export function resolvePlayerInput(binding, pressed, gamepad) {
  if (gamepad && gamepad.connected) return actionsFromGamepad(gamepad);
  return actionsFromKeys(binding, pressed);
}

export function labelForCode(code) {
  if (!code) return "—";
  if (CODE_LABELS[code]) return CODE_LABELS[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return code;
}

export function bindingsConflict(bindings, playerIndex, field, code) {
  if (!code || code === "Escape") return true;
  for (let i = 0; i < bindings.length; i++) {
    for (const key of BIND_FIELDS) {
      if (i === playerIndex && key === field) continue;
      if (bindings[i][key] === code) return true;
    }
  }
  return false;
}
