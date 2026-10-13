import { test } from "node:test";
import assert from "node:assert/strict";
import { frameRateFps } from "../../src/core/frameRate.js";

test("fewer than two timestamps gives null", () => {
  assert.equal(frameRateFps([]), null);
  assert.equal(frameRateFps([5]), null);
  assert.equal(frameRateFps(undefined), null);
});

test("evenly spaced timestamps give about 30 fps, rounded to 1 decimal", () => {
  assert.equal(frameRateFps([0, 33.3, 66.6, 100]), 30);
  assert.equal(frameRateFps([0, 40, 80]), 25);
  assert.equal(frameRateFps([0, 30, 70]), 28.6);
});

test("non-increasing and non-finite timestamps are ignored", () => {
  assert.equal(frameRateFps([0, 50, 50, 40, NaN, Infinity, 100]), 20);
  assert.equal(frameRateFps(["x", 0, null, 100]), 10);
});

test("zero span gives null", () => {
  assert.equal(frameRateFps([10, 10, 10]), null);
});
