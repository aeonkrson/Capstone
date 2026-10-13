// Captured burst: measures a run of frames and keeps numbers only (PRIV-02).
// Each observation is gated, read and dropped inside its loop step; readings hold numbers and anchors only.

import { readFrame, summariseBurst } from "../core/scan.js";
import { checkFrame, checkStability } from "../core/quality.js";

// Debug-view convenience so a person can step back; not the v2 countdown feature.
export const CAPTURE_DELAY_MS = 5000;
export const BURST_FRAMES = 15;
export const BURST_MIN_OK = 8;

/**
 * Measure BURST_FRAMES frames in IMAGE mode, gated by checkFrame per frame and checkStability per burst.
 * @param {{ pose: { detect: Function, setRunningMode: Function }, videoEl: HTMLVideoElement,
 *           view: "front" | "side", heightCm: number, nextFrame: (el: HTMLVideoElement) => Promise<boolean>,
 *           onProgress?: (done: number, total: number) => void, isAborted?: () => boolean,
 *           getDevicePitchDeg?: () => number | null }} opts
 * @returns {Promise<object>} summariseBurst result, or { ok: false, code, n, reason }
 */
export async function runBurst({
  pose, videoEl, view, heightCm, nextFrame,
  onProgress = () => {}, isAborted = () => false, getDevicePitchDeg = () => null,
}) {
  const readings = [];
  let aborted = false;
  await pose.setRunningMode("IMAGE");
  try {
    for (let i = 0; i < BURST_FRAMES; i += 1) {
      if (isAborted()) {
        aborted = true;
        break;
      }
      const presented = await nextFrame(videoEl);
      if (presented === false || isAborted()) {
        aborted = true;
        break;
      }
      const obs = pose.detect(videoEl, 0, { wantMask: true });
      const gate = checkFrame(obs, view, { devicePitchDeg: getDevicePitchDeg() });
      readings.push(gate.ok ? readFrame(obs, view, heightCm) : gate);
      onProgress(i + 1, BURST_FRAMES);
    }
  } finally {
    await pose.setRunningMode("VIDEO");
  }
  const ok = readings.filter((r) => r.ok);
  if (aborted) return { ok: false, code: "aborted", n: ok.length };
  const summary = summariseBurst(readings, view, { minOk: BURST_MIN_OK });
  if (!summary.ok) return { ok: false, code: "burst-too-few", n: summary.n, reason: summary.reason };
  const stable = checkStability(ok);
  if (!stable.ok) return { ok: false, code: "moving", n: summary.n, reason: "moving" };
  return summary;
}
