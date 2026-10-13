// Guided scan controller: live frames -> Phase 3 gate -> auto-lock reducer -> cues
// and capture requests (P4-D14, P4-D15, P4-D16). Each frame is gated and dropped
// inside onFrame; the controller keeps only reason codes and body anchors, never
// the observation, mask or image (PRIV-02).

import { initialLock, stepLock, bodyAnchors, lockMessageKey } from "../core/autoLock.js";
import { checkFrame } from "../core/quality.js";

/**
 * Create a hands-free guided scan controller.
 * @param {object} opts
 * @param {(view: "front"|"side") => Promise<object>} opts.capture - runs a burst; resolves a runBurst-shaped result
 * @param {(name: string) => void} [opts.cue] - plays a cue ("hold", "captured", "turn")
 * @param {(status: object) => void} [opts.onChange] - called after every state change
 * @param {() => number} [opts.now] - clock in ms
 * @returns {{ start: Function, stop: Function, restart: Function, onFrame: Function, status: Function }}
 */
export function createGuidedScan({ capture, cue = () => {}, onChange = () => {}, now = () => performance.now() }) {
  let active = false;
  let state = initialLock();
  let gateOk = false;
  let generation = 0;

  function status() {
    return {
      active,
      phase: state.phase,
      view: state.view,
      hint: state.hint,
      messageKey: lockMessageKey(state),
      gateOk,
    };
  }

  function runCapture(view) {
    const gen = generation;
    let pending;
    try {
      pending = Promise.resolve(capture(view));
    } catch (err) {
      pending = Promise.reject(err);
    }
    pending.then(
      (result) => {
        if (gen !== generation) return;
        const r = result || {};
        apply({
          type: "capture-done",
          t: now(),
          view,
          ok: r.ok === true,
          reason: r.reason ?? r.code ?? null,
        });
      },
      (err) => {
        console.error("Guided capture failed:", err);
        if (gen !== generation) return;
        apply({ type: "capture-done", t: now(), view, ok: false, reason: null });
      },
    );
  }

  function apply(event) {
    const step = stepLock(state, event);
    state = step.state;
    for (const name of step.cues) cue(name);
    onChange(status());
    if (step.action && step.action.type === "capture") runCapture(step.action.view);
  }

  function start() {
    active = true;
    generation += 1;
    state = initialLock();
    gateOk = false;
    onChange(status());
  }

  function stop() {
    active = false;
    generation += 1;
    onChange(status());
  }

  function restart() {
    generation += 1;
    active = true;
    gateOk = false;
    apply({ type: "restart" });
  }

  function onFrame(obs, tMs, devicePitchDeg = null) {
    if (!active || state.phase === "capturing" || state.phase === "done") return status();
    const gate = checkFrame(obs, state.view, { devicePitchDeg });
    gateOk = gate.ok === true;
    const anchors = gateOk ? bodyAnchors(obs.lm) : null;
    apply({ type: "frame", t: tMs, gate: { ok: gate.ok, code: gate.code }, anchors });
    return status();
  }

  return { start, stop, restart, onFrame, status };
}
