// Capture-quality gates: per frame and per burst. Returns reason codes only. Pure.

import { LM } from "./landmarks.js";
import { MIN_VISIBILITY } from "./measure.js";
import { maskBBox, rowRuns } from "./mask.js";
import { median, mad } from "./geometry.js";

/**
 * Quality thresholds, in one place so they can be tuned after the team runs.
 */
export const QUALITY = Object.freeze({
  MIN_BODY_FRAC: 0.5, // starting value (ASSUMED), confirm on real captures
  MAX_BODY_FRAC: 0.97, // starting value (ASSUMED), confirm on real captures
  MAX_LEAN_DEG: 6, // starting value (ASSUMED), confirm on real captures
  MAX_SHOULDER_ROLL_DEG: 8, // starting value (ASSUMED), confirm on real captures
  FRONT_MIN_SHOULDER_RATIO: 0.35, // starting value (ASSUMED), confirm on real captures
  SIDE_MAX_SHOULDER_RATIO: 0.25, // starting value (ASSUMED), confirm on real captures
  ARM_GAP_ROW_FRACS: Object.freeze([0.35, 0.55]), // starting value (ASSUMED), confirm on real captures
  MAX_DEVICE_PITCH_DEG: 10, // starting value (ASSUMED), confirm on real captures
  MAX_ANCHOR_DRIFT_FRAC: 0.04, // starting value (ASSUMED), confirm on real captures
  MAX_MAD_CM: 1.0, // starting value (ASSUMED), confirm on real captures
});

const RAD = 180 / Math.PI;
const fail = (code) => ({ ok: false, code });

/**
 * Check one frame for a usable capture. Returns the first failing reason code, in a fixed order:
 * no-pose, no-mask, not-full-body, too-close, too-far, low-visibility, wrong-side, tilted, arms-against-body.
 * @param {import("./types.js").FrameObservation | null} obs
 * @param {import("./types.js").ViewKind} view
 * @param {{ devicePitchDeg?: number | null }} [opts] phone pitch off vertical, null when no sensor
 * @returns {{ ok: true } | { ok: false, code: string }}
 */
export function checkFrame(obs, view, { devicePitchDeg = null } = {}) {
  if (!obs || !obs.lm || obs.lm.length < 33) return fail("no-pose");
  const mask = obs.mask;
  const box = mask ? maskBBox(mask) : null;
  if (!box) return fail("no-mask");

  const lm = obs.lm;
  const touches = box.top === 0 || box.left === 0 || box.bottom === mask.h - 1 || box.right === mask.w - 1;
  const la = lm[LM.LEFT_ANKLE];
  const ra = lm[LM.RIGHT_ANKLE];
  const laOk = la.v >= MIN_VISIBILITY;
  const raOk = ra.v >= MIN_VISIBILITY;
  const anklesOk = view === "front" ? laOk && raOk : laOk || raOk;
  if (touches || lm[LM.NOSE].v < MIN_VISIBILITY || !anklesOk) return fail("not-full-body");

  const frac = (box.bottom - box.top + 1) / mask.h;
  if (frac > QUALITY.MAX_BODY_FRAC) return fail("too-close");
  if (frac < QUALITY.MIN_BODY_FRAC) return fail("too-far");

  const ls = lm[LM.LEFT_SHOULDER];
  const rs = lm[LM.RIGHT_SHOULDER];
  const lh = lm[LM.LEFT_HIP];
  const rh = lm[LM.RIGHT_HIP];
  if ([ls, rs, lh, rh].some((p) => p.v < MIN_VISIBILITY)) return fail("low-visibility");

  const shoulderMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  const span = hipMid.y - shoulderMid.y;
  if (span <= 0) return fail("low-visibility");

  const ratio = Math.abs(ls.x - rs.x) / span;
  if (view === "front") {
    if (ratio < QUALITY.FRONT_MIN_SHOULDER_RATIO || ls.x < rs.x) return fail("wrong-side");
  } else if (ratio > QUALITY.SIDE_MAX_SHOULDER_RATIO) {
    return fail("wrong-side");
  }

  if (typeof devicePitchDeg === "number" && devicePitchDeg > QUALITY.MAX_DEVICE_PITCH_DEG) return fail("tilted");
  const ankles = [la, ra].filter((p) => p.v >= MIN_VISIBILITY);
  const ankleMid = {
    x: ankles.reduce((s, p) => s + p.x, 0) / ankles.length,
    y: ankles.reduce((s, p) => s + p.y, 0) / ankles.length,
  };
  const lean = Math.atan2(Math.abs(shoulderMid.x - ankleMid.x), Math.abs(ankleMid.y - shoulderMid.y)) * RAD;
  if (lean > QUALITY.MAX_LEAN_DEG) return fail("tilted");
  if (view === "front") {
    const roll = Math.atan2(Math.abs(ls.y - rs.y), Math.abs(ls.x - rs.x)) * RAD;
    if (roll > QUALITY.MAX_SHOULDER_ROLL_DEG) return fail("tilted");

    const sy = mask.h / obs.image.h;
    for (const f of QUALITY.ARM_GAP_ROW_FRACS) {
      const row = Math.round((shoulderMid.y + f * span) * sy);
      if (rowRuns(mask, row).length < 3) return fail("arms-against-body");
    }
  }
  return { ok: true };
}

/**
 * Check a burst of ok readings for movement: anchor drift beyond a fraction of the torso span,
 * or a noisy shoulder or bust-extent value. Fewer than 2 readings pass.
 * @param {{ shoulderCm: number | null, bustExtentCm: number,
 *           anchors: { shoulderMid: { x: number, y: number }, hipMid: { x: number, y: number }, span: number } }[]} readings
 * @returns {{ ok: true } | { ok: false, code: "moving" }}
 */
export function checkStability(readings) {
  if (!readings || readings.length < 2) return { ok: true };
  const range = (vals) => Math.max(...vals) - Math.min(...vals);
  const limit = QUALITY.MAX_ANCHOR_DRIFT_FRAC * median(readings.map((r) => r.anchors.span));
  const series = [
    readings.map((r) => r.anchors.shoulderMid.x),
    readings.map((r) => r.anchors.shoulderMid.y),
    readings.map((r) => r.anchors.hipMid.x),
    readings.map((r) => r.anchors.hipMid.y),
  ];
  if (series.some((s) => range(s) > limit)) return { ok: false, code: "moving" };
  const shoulders = readings.map((r) => r.shoulderCm).filter((v) => typeof v === "number");
  if (shoulders.length >= 2 && mad(shoulders) > QUALITY.MAX_MAD_CM) return { ok: false, code: "moving" };
  if (mad(readings.map((r) => r.bustExtentCm)) > QUALITY.MAX_MAD_CM) return { ok: false, code: "moving" };
  return { ok: true };
}

/**
 * Degrees the screen plane is off vertical, from deviceorientation beta and gamma.
 * Upright portrait or landscape gives 0, flat on a table gives 90.
 * @param {number} betaDeg
 * @param {number} gammaDeg
 * @returns {number | null} null when either input is not a finite number
 */
export function cameraPitchDeg(betaDeg, gammaDeg) {
  if (!Number.isFinite(betaDeg) || !Number.isFinite(gammaDeg)) return null;
  const toRad = Math.PI / 180;
  return Math.asin(Math.min(1, Math.abs(Math.cos(betaDeg * toRad) * Math.cos(gammaDeg * toRad)))) * RAD;
}
