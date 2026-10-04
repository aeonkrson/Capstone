// Shoulder and bust readings from one observation. Returns numbers and reason codes only. Pure.

import { LM } from "./landmarks.js";
import { dist, ellipsePerimeter } from "./geometry.js";
import { rowRuns, widestTorsoRun } from "./mask.js";
import { cmPerPxFromMask } from "./scale.js";

// Frozen with validation/PASS-CRITERIA.md (user decision at plan approval, 2026-10-03).
export const BUST_BAND_MIN_FRAC = 0.22;
// Frozen with validation/PASS-CRITERIA.md. Changing either band edge after the first reading is a post-hoc change.
export const BUST_BAND_MAX_FRAC = 0.36;
export const MIN_VISIBILITY = 0.5;

// Adding a measurement later is one new entry here (waist was left out per D-06).
export const MEASUREMENTS = {
  shoulder: { views: ["front"], model: "landmarkPair", pair: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER] },
  bust: {
    views: ["front", "side"],
    level: {
      from: "shoulderMidY",
      to: "hipMidY",
      bandMinFrac: BUST_BAND_MIN_FRAC,
      bandMaxFrac: BUST_BAND_MAX_FRAC,
      pick: "widestTorsoRun",
    },
    model: "ellipse",
  },
};

/**
 * Measure one view in cm.
 * @param {import("./types.js").FrameObservation | null} obs
 * @param {import("./types.js").ViewKind} view
 * @param {number} heightCm
 * @returns {import("./types.js").ViewReading}
 */
export function measureView(obs, view, heightCm) {
  if (!obs || !obs.lm || obs.lm.length < 33) return { ok: false, code: "no-pose" };
  const scale = cmPerPxFromMask(heightCm, obs.mask, obs.image);
  if (!scale.ok) return { ok: false, code: scale.code };

  const ls = obs.lm[LM.LEFT_SHOULDER];
  const rs = obs.lm[LM.RIGHT_SHOULDER];
  const lh = obs.lm[LM.LEFT_HIP];
  const rh = obs.lm[LM.RIGHT_HIP];
  if ([ls, rs, lh, rh].some((p) => p.v < MIN_VISIBILITY)) return { ok: false, code: "low-visibility" };

  const shoulderMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  const span = hipMid.y - shoulderMid.y;
  if (span <= 0) return { ok: false, code: "no-torso-run" };

  const { level } = MEASUREMENTS.bust;
  const bustBandTopY = shoulderMid.y + level.bandMinFrac * span;
  const bustBandBottomY = shoulderMid.y + level.bandMaxFrac * span;

  const mask = obs.mask;
  const sy = mask.h / obs.image.h;
  const sx = mask.w / obs.image.w;
  const centerXForRow = (row) => {
    const f = (row / sy - shoulderMid.y) / span;
    return (shoulderMid.x + f * (hipMid.x - shoulderMid.x)) * sx;
  };
  const best = widestTorsoRun(mask, Math.round(bustBandTopY * sy), Math.round(bustBandBottomY * sy), centerXForRow);
  if (!best) return { ok: false, code: "no-torso-run" };

  const bustRowY = best.row / sy;
  return {
    ok: true,
    view,
    cmPerPx: scale.cmPerPx,
    shoulderCm: view === "front" ? dist(ls, rs) * scale.cmPerPx : null,
    bustExtentCm: (best.width / sx) * scale.cmPerPx,
    bustRowY,
    bustRowFrac: (bustRowY - shoulderMid.y) / span,
    bustRowRuns: rowRuns(mask, best.row).length,
    bustBandTopY,
    bustBandBottomY,
    headTopY: scale.headTopY,
    soleY: scale.soleY,
  };
}

/**
 * Bust circumference from the front width and side depth, as an ellipse. A baseline, not calibrated.
 * @param {number} frontWidthCm
 * @param {number} sideDepthCm
 * @returns {number}
 */
export function bustCircumferenceCm(frontWidthCm, sideDepthCm) {
  return ellipsePerimeter(frontWidthCm / 2, sideDepthCm / 2);
}
