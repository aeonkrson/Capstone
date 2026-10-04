// Captured burst: measures a run of frames and keeps numbers only (PRIV-02).

import { measureView } from "../core/measure.js";
import { summarise } from "../core/geometry.js";

// Debug-view convenience so a person can step back; not the v2 countdown feature.
export const CAPTURE_DELAY_MS = 5000;
export const BURST_FRAMES = 15;
export const BURST_MIN_OK = 8;

/**
 * Measure BURST_FRAMES frames in IMAGE mode. Frames, masks and landmarks are dropped as soon as each is measured.
 * @param {{ pose: { detect: Function, setRunningMode: Function }, videoEl: HTMLVideoElement,
 *           view: "front" | "side", heightCm: number, nextFrame: (el: HTMLVideoElement) => Promise<boolean>,
 *           onProgress?: (done: number, total: number) => void, isAborted?: () => boolean }} opts
 * @returns {Promise<object>} numbers only
 */
export async function runBurst({ pose, videoEl, view, heightCm, nextFrame, onProgress = () => {}, isAborted = () => false }) {
  const cmPerPx = [];
  const shoulderCm = [];
  const bustExtentCm = [];
  const bustRowFrac = [];
  let armsMergedFrames = 0;
  let lastCode = null;
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
      const reading = measureView(pose.detect(videoEl, 0, { wantMask: true }), view, heightCm);
      if (reading.ok) {
        cmPerPx.push(reading.cmPerPx);
        if (reading.shoulderCm !== null) shoulderCm.push(reading.shoulderCm);
        bustExtentCm.push(reading.bustExtentCm);
        bustRowFrac.push(reading.bustRowFrac);
        if (view === "front" && reading.bustRowRuns < 3) armsMergedFrames += 1;
      } else {
        lastCode = reading.code;
      }
      onProgress(i + 1, BURST_FRAMES);
    }
  } finally {
    await pose.setRunningMode("VIDEO");
  }
  const n = bustExtentCm.length;
  if (aborted) return { ok: false, code: "aborted", n };
  if (n < BURST_MIN_OK) return { ok: false, code: "burst-too-few", n, lastCode };
  return {
    ok: true,
    view,
    n,
    cmPerPx: summarise(cmPerPx),
    shoulderCm: shoulderCm.length > 0 ? summarise(shoulderCm) : null,
    bustExtentCm: summarise(bustExtentCm),
    bustRowFrac: summarise(bustRowFrac),
    armsMergedFrames,
  };
}
