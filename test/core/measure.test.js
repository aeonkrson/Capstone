import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MEASUREMENTS, BUST_BAND_MIN_FRAC, BUST_BAND_MAX_FRAC, measureView,
} from "../../src/core/measure.js";

const W = 480;
const H = 640;

function fillRect(mask, c0, c1, r0, r1, v = 1) {
  for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) mask.data[y * mask.w + x] = v;
}

const FRONT_RECTS = [
  [215, 264, 40, 119], [196, 285, 120, 399], [190, 289, 210, 219],
  [140, 164, 130, 379], [315, 339, 130, 379], [195, 234, 400, 599], [245, 284, 400, 599],
];
const SIDE_RECTS = [[215, 264, 20, 99], [205, 274, 100, 420], [205, 279, 202, 211], [215, 264, 421, 619]];

function mk(rects) {
  const mask = { w: W, h: H, data: new Uint8Array(W * H) };
  for (const r of rects) fillRect(mask, ...r);
  return mask;
}

function lms(points, v = 0.99) {
  const lm = [];
  for (let i = 0; i < 33; i++) lm.push({ x: 240, y: 320, z: 0, v: 0.9 });
  for (const [i, x, y] of points) lm[i] = { x, y, z: 0, v };
  return lm;
}

const FRONT_LM = [[11, 300, 140], [12, 180, 140], [23, 260, 390], [24, 220, 390]];
const SIDE_LM = [[11, 242, 125], [12, 238, 125], [23, 242, 400], [24, 238, 400]];

const obs = (mask, lm) => ({ t: 0, image: { w: W, h: H }, lm, world: null, mask });
const front = (rects = FRONT_RECTS) => obs(mk(rects), lms(FRONT_LM));
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: ${a} vs ${b}`);

test("registry has exactly shoulder and bust, no waist", () => {
  assert.deepEqual(Object.keys(MEASUREMENTS), ["shoulder", "bust"]);
  assert.ok(!/waist/i.test(JSON.stringify(MEASUREMENTS)));
});

test("bust band constants are frozen", () => {
  assert.equal(BUST_BAND_MIN_FRAC, 0.22);
  assert.equal(BUST_BAND_MAX_FRAC, 0.36);
  assert.deepEqual(MEASUREMENTS.bust.level, {
    from: "shoulderMidY", to: "hipMidY", bandMinFrac: 0.22, bandMaxFrac: 0.36, pick: "widestTorsoRun",
  });
});

test("front phantom", () => {
  const r = measureView(front(), "front", 168);
  assert.equal(r.ok, true);
  near(r.bustRowY, 210, 0.5, "row");
  near(r.bustRowFrac, 0.28, 0.005, "frac");
  near(r.bustBandTopY, 195, 0.5, "top");
  near(r.bustBandBottomY, 230, 0.5, "bottom");
  assert.equal(r.bustRowRuns, 3);
  near(r.bustExtentCm, 30, 0.5, "extent");
  assert.equal(r.headTopY, 40);
  assert.equal(r.soleY, 599);
});

test("wider rows outside the band are ignored", () => {
  const r = measureView(front([...FRONT_RECTS, [170, 309, 150, 170], [170, 309, 240, 250]]), "front", 168);
  assert.equal(r.ok, true);
  near(r.bustRowY, 210, 0.5, "row");
  near(r.bustExtentCm, 30, 0.5, "extent");
});

test("arms touching on both sides merge into one run", () => {
  const rects = FRONT_RECTS.filter((q) => q[0] !== 140 && q[0] !== 315).concat([[140, 195, 130, 379], [284, 339, 130, 379]]);
  const r = measureView(front(rects), "front", 168);
  assert.equal(r.ok, true);
  assert.equal(r.bustRowRuns, 1);
  near(r.bustExtentCm, 60, 0.5, "extent");
  near(r.bustRowY, 195, 0.5, "row");
});

test("arm touching on the left only", () => {
  const rects = FRONT_RECTS.filter((q) => q[0] !== 140).concat([[140, 195, 130, 379]]);
  const r = measureView(front(rects), "front", 168);
  assert.equal(r.ok, true);
  assert.equal(r.bustRowRuns, 2);
  near(r.bustExtentCm, 45, 0.5, "extent");
  near(r.bustRowY, 210, 0.5, "row");
});

test("low visibility and empty band give codes", () => {
  const o = front();
  o.lm[11] = { ...o.lm[11], v: 0.2 };
  assert.deepEqual(measureView(o, "front", 168), { ok: false, code: "low-visibility" });
  const e = front();
  fillRect(e.mask, 0, W - 1, 190, 235, 0);
  assert.deepEqual(measureView(e, "front", 168), { ok: false, code: "no-torso-run" });
});

test("side phantom", () => {
  const r = measureView(obs(mk(SIDE_RECTS), lms(SIDE_LM)), "side", 168);
  assert.equal(r.ok, true);
  assert.equal(r.shoulderCm, null);
  near(r.bustRowY, 202, 0.5, "row");
  near(r.bustRowFrac, 0.28, 0.005, "frac");
  near(r.bustExtentCm, 21, 0.5, "extent");
});

test("shoulder distance is in pixel space on a non-square image", () => {
  const w = 1280;
  const h = 720;
  const mask = { w, h, data: new Uint8Array(w * h) };
  fillRect(mask, 590, 689, 50, 669);
  const lm = lms([[11, 700, 200], [12, 580, 200], [23, 660, 450], [24, 620, 450]]);
  const r = measureView({ t: 0, image: { w, h }, lm, world: null, mask }, "front", 170);
  assert.equal(r.ok, true);
  near(r.shoulderCm, 120 * r.cmPerPx, 1e-9, "shoulder");
});
