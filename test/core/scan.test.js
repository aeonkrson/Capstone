import { test } from "node:test";
import assert from "node:assert/strict";
import { CALIBRATION, calibrate } from "../../src/core/calibration.js";
import {
  SCAN_KEYS,
  ESTIMATE_KEYS,
  WAIST_BAND_MIN_FRAC,
  WAIST_BAND_MAX_FRAC,
  SCAN_MIN_OK_FRAMES,
  summariseBurst,
} from "../../src/core/scan.js";

test("calibrate applies scale and offset", () => {
  assert.equal(calibrate("shoulderCm", 36), 38);
  assert.equal(calibrate("chestCm", 80), 80);
  const saved = { ...CALIBRATION.armCm };
  CALIBRATION.armCm.scale = 1.5;
  CALIBRATION.armCm.offsetCm = -1;
  try {
    assert.equal(calibrate("armCm", 10), 14);
  } finally {
    Object.assign(CALIBRATION.armCm, saved);
  }
});

test("calibrate throws on an unknown key", () => {
  assert.throws(() => calibrate("hipCm", 90));
});

test("CALIBRATION has exactly the scan keys, all priors", () => {
  assert.deepEqual(Object.keys(CALIBRATION).sort(), SCAN_KEYS.slice().sort());
  for (const key of SCAN_KEYS) {
    assert.equal(CALIBRATION[key].source, "prior");
    assert.equal(typeof CALIBRATION[key].scale, "number");
    assert.equal(typeof CALIBRATION[key].offsetCm, "number");
  }
  assert.equal(CALIBRATION.shoulderCm.offsetCm, 2.0);
  assert.equal(CALIBRATION.shoulderCm.scale, 1);
});

test("scan constants", () => {
  assert.deepEqual(SCAN_KEYS, ["shoulderCm", "chestCm", "waistCm", "torsoCm", "armCm"]);
  assert.deepEqual(ESTIMATE_KEYS, ["waistCm", "torsoCm", "armCm"]);
  assert.equal(WAIST_BAND_MIN_FRAC, 0.55);
  assert.equal(WAIST_BAND_MAX_FRAC, 0.80);
  assert.equal(SCAN_MIN_OK_FRAMES, 8);
});

test("summariseBurst reason is the most frequent failure, ties first seen, null with no failures", () => {
  const fails = [
    { ok: false, code: "no-pose" },
    { ok: false, code: "no-mask" },
    { ok: false, code: "no-mask" },
    { ok: false, code: "no-pose" },
  ];
  assert.deepEqual(summariseBurst(fails, "front"), { ok: false, code: "burst-too-few", n: 0, reason: "no-pose" });
  fails.push({ ok: false, code: "no-mask" });
  assert.equal(summariseBurst(fails, "front").reason, "no-mask");
  assert.deepEqual(summariseBurst([], "side"), { ok: false, code: "burst-too-few", n: 0, reason: null });
});
