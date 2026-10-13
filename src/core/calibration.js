// One calibration table for every scanned value: value = rawCm * scale + offsetCm. Pure data and maths.
// Plan 03-05 replaces the priors with tape-fitted entries (source "fitted"); the pipeline does not change.

export const CALIBRATION = {
  // validation/DEFINITIONS.md: shoulder joint centres read 1 to 3 cm inside the acromion points, so +2.0 cm.
  shoulderCm: { scale: 1, offsetCm: 2.0, source: "prior" },
  // Ellipse baseline from front width and side depth; no prior correction until tape data exists.
  chestCm: { scale: 1, offsetCm: 0, source: "prior" },
  // Ellipse of the narrowest torso run; estimate, identity until tape data exists.
  waistCm: { scale: 1, offsetCm: 0, source: "prior" },
  // Shoulder midpoint to hip midpoint; neck base and hip bone offsets roughly cancel (P3-D3).
  torsoCm: { scale: 1, offsetCm: 0, source: "prior" },
  // Shoulder to elbow to wrist joint centres; identity until tape data exists.
  armCm: { scale: 1, offsetCm: 0, source: "prior" },
};

/**
 * Apply the calibration entry for one measurement.
 * @param {"shoulderCm" | "chestCm" | "waistCm" | "torsoCm" | "armCm"} key
 * @param {number} rawCm
 * @returns {number}
 */
export function calibrate(key, rawCm) {
  const entry = Object.prototype.hasOwnProperty.call(CALIBRATION, key) ? CALIBRATION[key] : null;
  if (!entry) throw new Error(`Unknown calibration key: ${key}`);
  return rawCm * entry.scale + entry.offsetCm;
}
