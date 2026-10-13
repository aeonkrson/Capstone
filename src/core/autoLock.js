// Hands-free auto-lock state machine for front then side capture. Pure (P4-D1):
// no clock and no browser globals; time arrives as `t` (ms) on each event.

import { LM } from "./landmarks.js";

/**
 * Auto-lock timings and limits, in one place so they can be tuned in Phase 5.
 */
export const AUTO_LOCK = Object.freeze({
  HOLD_MS: 1500, // starting value (ASSUMED), ok frames needed in a row before capture
  TURN_MS: 2500, // starting value (ASSUMED), pause after front lock before side guiding
  MAX_HOLD_DRIFT_FRAC: 0.05, // starting value (ASSUMED), allowed anchor drift as a fraction of torso span
  HOLD_CUE_GAP_MS: 2000, // starting value (ASSUMED), minimum gap between "hold" cues
});

/**
 * Fresh lock state: guiding the front view.
 * @returns {{ phase: string, view: string, since: number|null, ref: object|null, hint: string|null, lastHoldCueT: number|null }}
 */
export function initialLock() {
  return { phase: "guide", view: "front", since: null, ref: null, hint: null, lastHoldCueT: null };
}

/**
 * Shoulder and hip midpoints plus torso span (hipMid.y - shoulderMid.y).
 * @param {Array<{x:number,y:number}>|null} lm - 33 landmarks in image px
 * @returns {{ shoulderMid: {x:number,y:number}, hipMid: {x:number,y:number}, span: number }|null}
 */
export function bodyAnchors(lm) {
  if (!Array.isArray(lm) || lm.length < 33) return null;
  const ls = lm[LM.LEFT_SHOULDER];
  const rs = lm[LM.RIGHT_SHOULDER];
  const lh = lm[LM.LEFT_HIP];
  const rh = lm[LM.RIGHT_HIP];
  if (!ls || !rs || !lh || !rh) return null;
  const shoulderMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  const span = hipMid.y - shoulderMid.y;
  if (!Number.isFinite(span) || span <= 0) return null;
  return { shoulderMid, hipMid, span };
}

function copyAnchors(a) {
  return { shoulderMid: { ...a.shoulderMid }, hipMid: { ...a.hipMid }, span: a.span };
}

function drifted(ref, a) {
  const d = Math.max(
    Math.abs(a.shoulderMid.x - ref.shoulderMid.x),
    Math.abs(a.shoulderMid.y - ref.shoulderMid.y),
    Math.abs(a.hipMid.x - ref.hipMid.x),
    Math.abs(a.hipMid.y - ref.hipMid.y),
  );
  return d > AUTO_LOCK.MAX_HOLD_DRIFT_FRAC * ref.span;
}

function out(state, cues = [], action = null) {
  return { state, cues, action };
}

function toGuide(state, hint) {
  return { ...state, phase: "guide", since: null, ref: null, hint };
}

function startHold(state, t, anchors) {
  const cueOk = state.lastHoldCueT === null || t - state.lastHoldCueT >= AUTO_LOCK.HOLD_CUE_GAP_MS;
  const next = {
    ...state,
    phase: "hold",
    since: t,
    ref: copyAnchors(anchors),
    hint: null,
    lastHoldCueT: cueOk ? t : state.lastHoldCueT,
  };
  return out(next, cueOk ? ["hold"] : []);
}

function onFrame(state, e) {
  const gate = e.gate || { ok: false, code: "no-pose" };
  const good = gate.ok === true && e.anchors;
  switch (state.phase) {
    case "guide":
      if (good) return startHold(state, e.t, e.anchors);
      return out({ ...state, hint: gate.ok ? "no-pose" : gate.code || null });
    case "hold":
      if (!good) return out(toGuide(state, gate.ok ? "no-pose" : gate.code || null));
      if (drifted(state.ref, e.anchors)) return out(toGuide(state, "moving"));
      if (e.t - state.since >= AUTO_LOCK.HOLD_MS) {
        return out({ ...state, phase: "capturing" }, [], { type: "capture", view: state.view });
      }
      return out(state);
    case "turn":
      if (e.t - state.since >= AUTO_LOCK.TURN_MS) {
        return out({ ...state, phase: "guide", view: "side", since: null, ref: null, hint: null });
      }
      return out(state);
    default:
      // capturing and done ignore frames
      return out(state);
  }
}

function onCaptureDone(state, e) {
  if (state.phase !== "capturing" || e.view !== state.view) return out(state);
  if (!e.ok) {
    const hint = e.reason && e.reason !== "aborted" ? e.reason : null;
    return out(toGuide(state, hint));
  }
  if (state.view === "front") {
    return out(
      { ...state, phase: "turn", view: "side", since: e.t, ref: null, hint: null },
      ["captured", "turn"],
    );
  }
  return out({ ...state, phase: "done", since: null, ref: null, hint: null }, ["captured"]);
}

/**
 * Advance the lock machine by one event. Never mutates `state`.
 * @param {object} state - current lock state (from initialLock or a prior stepLock)
 * @param {{type:"frame",t:number,gate:{ok:boolean,code?:string},anchors:object|null}|{type:"capture-done",t:number,view:string,ok:boolean,reason:string|null}|{type:"restart"}} event
 * @returns {{ state: object, cues: string[], action: null|{type:"capture",view:"front"|"side"} }}
 */
export function stepLock(state, event) {
  if (!event) return out(state);
  if (event.type === "restart") return out(initialLock());
  if (event.type === "frame") return onFrame(state, event);
  if (event.type === "capture-done") return onCaptureDone(state, event);
  return out(state);
}

/**
 * i18n key for the current lock state.
 * @param {object} state - lock state
 * @returns {string}
 */
export function lockMessageKey(state) {
  switch (state.phase) {
    case "guide":
      return state.hint ? `scan.reason.${state.hint}` : `guide.${state.view}`;
    case "hold":
      return "guide.hold";
    case "capturing":
      return "guide.capturing";
    case "turn":
      return "guide.turn";
    default:
      return "guide.done";
  }
}
