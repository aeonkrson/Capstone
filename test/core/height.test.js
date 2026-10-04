import { test } from "node:test";
import assert from "node:assert/strict";
import { validateHeightCm, HEIGHT_MIN_CM, HEIGHT_MAX_CM } from "../../src/core/height.js";

const CODE_CASES = [
  ["", "empty"],
  ["   ", "empty"],
  ["abc", "not-a-number"],
  ["1,725.5", "not-a-number"],
  ["-170", "not-a-number"],
  ["170cm", "not-a-number"],
  ["1e2", "not-a-number"],
  ["20", "too-low"],
  ["119.9", "too-low"],
  ["220.1", "too-high"],
  ["400", "too-high"],
];

const OK_CASES = [
  ["120", 120],
  ["220", 220],
  ["172.5", 172.5],
  ["172,5", 172.5],
  [" 165 ", 165],
];

test("range constants", () => {
  assert.equal(HEIGHT_MIN_CM, 120);
  assert.equal(HEIGHT_MAX_CM, 220);
});

for (const [input, code] of CODE_CASES) {
  test(`rejects ${JSON.stringify(input)} with ${code}`, () => {
    assert.deepEqual(validateHeightCm(input), { ok: false, code });
  });
}

for (const [input, cm] of OK_CASES) {
  test(`accepts ${JSON.stringify(input)} as ${cm}`, () => {
    assert.deepEqual(validateHeightCm(input), { ok: true, cm });
  });
}
