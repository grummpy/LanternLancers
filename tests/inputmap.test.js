import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BINDINGS,
  actionsFromGamepad,
  actionsFromKeys,
  labelForCode,
  resolvePlayerInput,
} from "../src/core/inputmap.js";

function pad(partial = {}) {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  for (const index of partial.pressed ?? []) buttons[index].pressed = true;
  return { connected: true, axes: partial.axes ?? [0, 0], buttons };
}

test("default keyboard bindings map all four players", () => {
  const expectations = [
    ["KeyA", "left"],
    ["KeyD", "right"],
    ["KeyW", "up"],
    ["KeyS", "down"],
    ["KeyF", "action"],
    ["KeyG", "secondary"],
  ];
  for (const [code, field] of expectations) {
    assert.equal(actionsFromKeys(DEFAULT_BINDINGS[0], new Set([code]))[field], true);
  }

  const p2 = actionsFromKeys(DEFAULT_BINDINGS[1], new Set(["ArrowLeft", "Slash", "Period"]));
  assert.equal(p2.left, true);
  assert.equal(p2.action, true);
  assert.equal(p2.secondary, true);

  const p3 = actionsFromKeys(DEFAULT_BINDINGS[2], new Set(["KeyI", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"]));
  assert.deepEqual(
    [p3.up, p3.left, p3.down, p3.right, p3.action, p3.secondary],
    [true, true, true, true, true, true],
  );

  const p4 = actionsFromKeys(
    DEFAULT_BINDINGS[3],
    new Set(["Numpad8", "Numpad4", "Numpad5", "Numpad6", "Numpad0", "NumpadEnter"]),
  );
  assert.deepEqual(
    [p4.up, p4.left, p4.down, p4.right, p4.action, p4.secondary],
    [true, true, true, true, true, true],
  );

  assert.equal(actionsFromKeys(DEFAULT_BINDINGS[2], new Set(["Escape"])).pause, true);
});

test("gamepad stick, d-pad, A, B, and Start map to actions", () => {
  assert.equal(actionsFromGamepad(pad({ pressed: [0] })).action, true);
  assert.equal(actionsFromGamepad(pad({ pressed: [1] })).secondary, true);
  assert.equal(actionsFromGamepad(pad({ pressed: [9] })).pause, true);
  assert.equal(actionsFromGamepad(pad({ pressed: [14] })).left, true);
  assert.equal(actionsFromGamepad(pad({ pressed: [15] })).right, true);
  assert.equal(actionsFromGamepad(pad({ pressed: [12] })).up, true);
  assert.equal(actionsFromGamepad(pad({ pressed: [13] })).down, true);
  assert.equal(actionsFromGamepad(pad({ axes: [-0.8, 0] })).left, true);
  assert.equal(actionsFromGamepad(pad({ axes: [0.8, 0] })).right, true);
  assert.equal(actionsFromGamepad(pad({ axes: [0, -0.8] })).up, true);
  assert.equal(actionsFromGamepad(pad({ axes: [0, 0.8] })).down, true);
  assert.equal(actionsFromGamepad(pad({ axes: [0.2, -0.2] })).left, false);
  assert.equal(actionsFromGamepad(pad({ axes: [0.2, -0.2] })).up, false);
  assert.equal(actionsFromGamepad({ connected: true, axes: [0, 0], buttons: [true, false] }).action, true);
});

test("a connected gamepad overrides that player's keyboard", () => {
  const pressed = new Set(["KeyD", "KeyF"]);
  const keyboard = resolvePlayerInput(DEFAULT_BINDINGS[0], pressed, null);
  assert.equal(keyboard.right, true);
  assert.equal(keyboard.action, true);

  const overridden = resolvePlayerInput(DEFAULT_BINDINGS[0], pressed, pad({ axes: [-1, 0] }));
  assert.equal(overridden.left, true);
  assert.equal(overridden.right, false);
  assert.equal(overridden.action, false);

  const disconnected = resolvePlayerInput(DEFAULT_BINDINGS[0], pressed, { connected: false, axes: [-1, 0], buttons: [] });
  assert.equal(disconnected.right, true);
  assert.equal(disconnected.action, true);
});

test("key labels stay readable on the controls screen", () => {
  assert.equal(labelForCode("Slash"), "/");
  assert.equal(labelForCode("Period"), ".");
  assert.equal(labelForCode("Semicolon"), ";");
  assert.equal(labelForCode("Quote"), "'");
  assert.equal(labelForCode("Numpad0"), "Num 0");
  assert.equal(labelForCode("NumpadEnter"), "Num Enter");
  assert.equal(labelForCode("KeyF"), "F");
});
