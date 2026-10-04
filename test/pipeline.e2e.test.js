// Phase acceptance test: typed height plus a synthetic front and side body gives shoulder and bust in cm.
// It stays red until plan 01-06 Task 2 creates src/core/measure.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateHeightCm } from "../src/core/height.js";
import { measureView, bustCircumferenceCm } from "../src/core/measure.js";

const W = 480;
const H = 640;

function newMask(w, h) {
  return { w, h, data: new Uint8Array(w * h) };
}

// Fill columns c0..c1 and rows r0..r1 (inclusive) with 1.
function fillRect(mask, c0, c1, r0, r1) {
  for (let y = r0; y <= r1; y++) {
    for (let x = c0; x <= c1; x++) {
      mask.data[y * mask.w + x] = 1;
    }
  }
}

// Rectangles as [c0, c1, r0, r1].
const FRONT_RECTS = [
  [215, 264, 40, 119],  // head
  [196, 285, 120, 399], // torso, 90 px wide
  [190, 289, 210, 219], // bust bulge, 100 px wide
  [140, 164, 130, 379], // left arm
  [315, 339, 130, 379], // right arm
  [195, 234, 400, 599], // left leg
  [245, 284, 400, 599], // right leg
];

const SIDE_RECTS = [
  [215, 264, 20, 99],   // head
  [205, 274, 100, 420], // torso, 70 px deep
  [205, 279, 202, 211], // bust bulge, 75 px deep
  [215, 264, 421, 619], // legs
];

function buildMask(rects, scale) {
  const mask = scale === 1 ? newMask(W, H) : newMask(W / 2, H / 2);
  for (const [c0, c1, r0, r1] of rects) {
    if (scale === 1) fillRect(mask, c0, c1, r0, r1);
    else fillRect(mask, Math.floor(c0 / 2), Math.floor(c1 / 2), Math.floor(r0 / 2), Math.floor(r1 / 2));
  }
  return mask;
}

function buildLandmarks(points) {
  const lm = [];
  for (let i = 0; i < 33; i++) lm.push({ x: 240, y: 320, z: 0, v: 0.9 });
  for (const [i, x, y] of points) lm[i] = { x, y, z: 0, v: 0.99 };
  return lm;
}

function observation(mask, lm) {
  return { t: 0, image: { w: W, h: H }, lm, world: null, mask };
}

// Front body hand check: the shoulder midpoint is (240, 140) and the hip midpoint (240, 390),
// 250 pixels apart, so the bust band from 22% to 36% covers image rows 195 to 230. The widest
// midline run in the band is the 100-pixel bulge, first reached at row 210, 28% of the way down.
// The silhouette spans rows 40 to 599 (560 rows) so cmPerPx = 168 / 560 = 0.300.
const FRONT_LM = [[11, 300, 140], [12, 180, 140], [23, 260, 390], [24, 220, 390]];

// Side body hand check: shoulder midpoint (240, 125), hip midpoint (240, 400), 275 pixels apart,
// so the band covers rows 185.5 to 224; the deepest midline run is the bulge (75 px), first
// reached at row 202, 28% of the way down. Rows 20 to 619 (600 rows) so cmPerPx = 168 / 600 = 0.280.
const SIDE_LM = [[11, 242, 125], [12, 238, 125], [23, 242, 400], [24, 238, 400]];

function front(scale = 1) {
  return observation(buildMask(FRONT_RECTS, scale), buildLandmarks(FRONT_LM));
}

function side() {
  return observation(buildMask(SIDE_RECTS, 1), buildLandmarks(SIDE_LM));
}

function near(actual, expected, tol, label) {
  assert.ok(Math.abs(actual - expected) <= tol, `${label}: ${actual} is not within ${tol} of ${expected}`);
}

test("typed height plus synthetic front and side gives shoulder and bust in cm", () => {
  const h = validateHeightCm("168");
  assert.deepEqual(h, { ok: true, cm: 168 });

  const f = measureView(front(), "front", 168);
  assert.equal(f.ok, true);
  near(f.cmPerPx, 0.300, 0.002, "front cmPerPx");
  near(f.shoulderCm, 36.0, 0.5, "front shoulderCm");
  near(f.bustExtentCm, 30.0, 0.5, "front bustExtentCm");
  assert.equal(f.bustRowRuns, 3);
  near(f.bustRowY, 210, 0.5, "front bustRowY");
  near(f.bustRowFrac, 0.28, 0.005, "front bustRowFrac");
  near(f.bustBandTopY, 195, 0.5, "front bustBandTopY");
  near(f.bustBandBottomY, 230, 0.5, "front bustBandBottomY");

  const s = measureView(side(), "side", 168);
  assert.equal(s.ok, true);
  near(s.cmPerPx, 0.280, 0.002, "side cmPerPx");
  near(s.bustExtentCm, 21.0, 0.5, "side bustExtentCm");
  near(s.bustRowY, 202, 0.5, "side bustRowY");
  near(s.bustRowFrac, 0.28, 0.005, "side bustRowFrac");
  assert.equal(s.shoulderCm, null);

  near(bustCircumferenceCm(30.0, 21.0), 80.7, 0.5, "bust circumference");
});

test("mask at half resolution gives the same readings", () => {
  const f = measureView(front(2), "front", 168);
  assert.equal(f.ok, true);
  near(f.shoulderCm, 36.0, 0.5, "half-res shoulderCm");
  near(f.bustExtentCm, 30.0, 0.5, "half-res bustExtentCm");
  near(f.bustRowY, 210, 2, "half-res bustRowY");
});

test("a too-low height is rejected and measurement is never reached", () => {
  assert.deepEqual(validateHeightCm("20"), { ok: false, code: "too-low" });
});

test("unusable observations return reason codes", () => {
  const touching = front();
  fillRect(touching.mask, 215, 264, 0, 39);
  assert.deepEqual(measureView(touching, "front", 168), { ok: false, code: "body-touches-edge" });

  const noMask = front();
  noMask.mask = null;
  assert.deepEqual(measureView(noMask, "front", 168), { ok: false, code: "no-mask" });

  const noPose = front();
  noPose.lm = [];
  assert.deepEqual(measureView(noPose, "front", 168), { ok: false, code: "no-pose" });
});
