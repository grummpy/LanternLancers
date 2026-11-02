import test from "node:test";
import assert from "node:assert/strict";
import { createRng } from "../src/core/rng.js";

test("same seed yields the same stream", () => {
  const a = createRng(123456);
  const b = createRng(123456);
  const seqA = Array.from({ length: 8 }, () => a.next());
  const seqB = Array.from({ length: 8 }, () => b.next());
  assert.deepEqual(seqA, seqB);
  for (const value of seqA) {
    assert.ok(value >= 0 && value < 1);
  }
});

test("different seeds diverge", () => {
  const a = createRng(1);
  const b = createRng(2);
  assert.notEqual(a.next(), b.next());
});

test("seed zero is remapped to a stable stream", () => {
  const a = createRng(0);
  const b = createRng(0);
  assert.equal(a.next(), b.next());
});

test("int stays inside the requested range", () => {
  const rng = createRng(99);
  for (let i = 0; i < 40; i++) {
    const n = rng.int(5);
    assert.ok(Number.isInteger(n));
    assert.ok(n >= 0 && n < 5);
  }
});

test("known mulberry32 prefix", () => {
  const rng = createRng(1);
  const first = Array.from({ length: 4 }, () => rng.next());
  assert.deepEqual(
    first.map((n) => n.toFixed(10)),
    ["0.6270739406", "0.0027357212", "0.5274470400", "0.9810509675"],
  );
});
