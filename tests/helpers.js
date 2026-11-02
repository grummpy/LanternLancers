import { emptyInput } from "../src/core/inputmap.js";

export function blanks() {
  return [emptyInput(), emptyInput(), emptyInput(), emptyInput()];
}

export function allBots() {
  return [0, 1, 2, 3].map(() => ({ active: true, bot: true }));
}

export function humans(n = 4) {
  return [0, 1, 2, 3].map((id) => ({ active: id < n, bot: false }));
}
