// Phase 3 scan engine: shoulder, chest, waist, torso length and arm length from front and side bursts.
// Builds on the frozen measureView; returns numbers and reason codes only. Pure.

import { LM } from "./landmarks.js";
import { dist, summarise, ellipsePerimeter } from "./geometry.js";
import { narrowestTorsoRun } from "./mask.js";
import { measureView, bustCircumferenceCm, MIN_VISIBILITY } from "./measure.js";
import { calibrate } from "./calibration.js";

export const SCAN_KEYS = ["shoulderCm", "chestCm", "waistCm", "torsoCm", "armCm"];
// Values shown as estimates in the UI; shoulder and chest are not.
export const ESTIMATE_KEYS = ["waistCm", "torsoCm", "armCm"];
// Waist band as a fraction of the shoulder-midpoint-to-hip-midpoint distance (P3-D2).
export const WAIST_BAND_MIN_FRAC = 0.55;
export const WAIST_BAND_MAX_FRAC = 0.80;
// Fewest ok frames a burst needs before its medians are trusted.
export const SCAN_MIN_OK_FRAMES = 8;

const BURST_FIELDS = ["cmPerPx", "shoulderCm", "bustExtentCm", "bustRowFrac", "waistExtentCm", "torsoCm", "armCm"];

const round1 = (x) => Math.round(x * 10) / 10;

function visible(p) {
  return Boolean(p) && p.v >= MIN_VISIBILITY;
}

// Mean of the visible sides' shoulder-elbow-wrist lengths in image px, or null (P3-D4).
function armPx(lm) {
  const sides = [
    [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
    [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  ];
  const lengths = [];
  for (const [s, e, w] of sides) {
    if ([lm[s], lm[e], lm[w]].every(visible)) lengths.push(dist(lm[s], lm[e]) + dist(lm[e], lm[w]));
  }
  if (lengths.length === 0) return null;
  return lengths.reduce((a, b) => a + b, 0) / lengths.length;
}

/**
 * Read one frame of one view. All cm values are raw (uncalibrated); anchors are in image px.
 * @param {import("./types.js").FrameObservation | null} obs
 * @param {import("./types.js").ViewKind} view
 * @param {number} heightCm
 * @returns {{ ok: false, code: string } | { ok: true, view: string, cmPerPx: number, shoulderCm: number | null,
 *   bustExtentCm: number, bustRowFrac: number, bustRowRuns: number, waistExtentCm: number, waistRowFrac: number,
 *   torsoCm: number | null, armCm: number | null,
 *   anchors: { shoulderMid: { x: number, y: number }, hipMid: { x: number, y: number }, span: number } }}
 */
export function readFrame(obs, view, heightCm) {
  const base = measureView(obs, view, heightCm);
  if (!base.ok) return base;

  const lm = obs.lm;
  const ls = lm[LM.LEFT_SHOULDER];
  const rs = lm[LM.RIGHT_SHOULDER];
  const lh = lm[LM.LEFT_HIP];
  const rh = lm[LM.RIGHT_HIP];
  const shoulderMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  const span = hipMid.y - shoulderMid.y;

  // Same image-to-mask mapping and midline interpolation as measureView.
  const mask = obs.mask;
  const sy = mask.h / obs.image.h;
  const sx = mask.w / obs.image.w;
  const centerXForRow = (row) => {
    const f = (row / sy - shoulderMid.y) / span;
    return (shoulderMid.x + f * (hipMid.x - shoulderMid.x)) * sx;
  };
  const waistTopY = shoulderMid.y + WAIST_BAND_MIN_FRAC * span;
  const waistBottomY = shoulderMid.y + WAIST_BAND_MAX_FRAC * span;
  const waist = narrowestTorsoRun(mask, Math.round(waistTopY * sy), Math.round(waistBottomY * sy), centerXForRow);
  if (!waist) return { ok: false, code: "no-waist-run" };

  const cmPerPx = base.cmPerPx;
  const waistRowY = waist.row / sy;
  const isFront = view === "front";
  const arm = isFront ? armPx(lm) : null;

  return {
    ok: true,
    view,
    cmPerPx,
    shoulderCm: base.shoulderCm,
    bustExtentCm: base.bustExtentCm,
    bustRowFrac: base.bustRowFrac,
    bustRowRuns: base.bustRowRuns,
    waistExtentCm: (waist.width / sx) * cmPerPx,
    waistRowFrac: (waistRowY - shoulderMid.y) / span,
    torsoCm: isFront ? dist(shoulderMid, hipMid) * cmPerPx : null,
    armCm: arm === null ? null : arm * cmPerPx,
    anchors: { shoulderMid, hipMid, span },
  };
}

/**
 * Summarise a burst of readFrame results for one view.
 * @param {Array<{ ok: boolean, code?: string }>} readings
 * @param {import("./types.js").ViewKind} view
 * @param {{ minOk?: number }} [options]
 * @returns {{ ok: false, code: "burst-too-few", n: number, reason: string | null } | { ok: true, view: string,
 *   n: number, armsMergedFrames: number } & Record<string, { median: number, mad: number, n: number } | null>}
 */
export function summariseBurst(readings, view, { minOk = SCAN_MIN_OK_FRAMES } = {}) {
  const ok = readings.filter((r) => r && r.ok);
  if (ok.length < minOk) {
    const counts = new Map();
    for (const r of readings) {
      if (r && !r.ok) counts.set(r.code, (counts.get(r.code) || 0) + 1);
    }
    let reason = null;
    let best = 0;
    // Map keeps insertion order, so a strict comparison keeps the first-seen code on ties.
    for (const [code, count] of counts) {
      if (count > best) {
        reason = code;
        best = count;
      }
    }
    return { ok: false, code: "burst-too-few", n: ok.length, reason };
  }

  const out = { ok: true, view, n: ok.length };
  for (const field of BURST_FIELDS) {
    const values = ok.map((r) => r[field]).filter((v) => typeof v === "number" && Number.isFinite(v));
    out[field] = values.length > 0 ? summarise(values) : null;
  }
  out.armsMergedFrames = view === "front" ? ok.filter((r) => r.bustRowRuns < 3).length : 0;
  return out;
}

/**
 * Combine a front and a side burst summary into calibrated measurements.
 * @param {ReturnType<typeof summariseBurst> | null} front
 * @param {ReturnType<typeof summariseBurst> | null} side
 * @returns {{ ok: false, code: "missing-front" | "missing-side" } | { ok: true,
 *   measurements: Record<string, number | null>, raw: Record<string, number | null>,
 *   estimate: Record<string, boolean>, spreadCm: Record<string, number | null> }}
 */
export function combineScan(front, side) {
  if (!front || !front.ok || !front.bustExtentCm || !front.waistExtentCm) return { ok: false, code: "missing-front" };
  if (!side || !side.ok || !side.bustExtentCm || !side.waistExtentCm) return { ok: false, code: "missing-side" };

  const med = (s) => (s ? s.median : null);
  const spread = (s) => (s ? s.mad : null);

  const raw = {
    shoulderCm: med(front.shoulderCm),
    chestCm: bustCircumferenceCm(front.bustExtentCm.median, side.bustExtentCm.median),
    waistCm: ellipsePerimeter(front.waistExtentCm.median / 2, side.waistExtentCm.median / 2),
    torsoCm: med(front.torsoCm),
    armCm: med(front.armCm),
  };

  const measurements = {};
  const estimate = {};
  for (const key of SCAN_KEYS) {
    measurements[key] = raw[key] === null ? null : round1(calibrate(key, raw[key]));
    estimate[key] = ESTIMATE_KEYS.includes(key);
  }

  const spreadCm = {
    shoulderCm: spread(front.shoulderCm),
    chestCm: Math.max(front.bustExtentCm.mad, side.bustExtentCm.mad),
    waistCm: Math.max(front.waistExtentCm.mad, side.waistExtentCm.mad),
    torsoCm: spread(front.torsoCm),
    armCm: spread(front.armCm),
  };

  return { ok: true, measurements, raw, estimate, spreadCm };
}
