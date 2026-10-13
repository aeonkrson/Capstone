// Device-orientation adapter: phone pitch off vertical, memory only. Laptops have no sensor.

import { cameraPitchDeg } from "../core/quality.js";

/**
 * Create a tilt sensor. On iOS start() must be called from a click handler (motion permission).
 * @param {{ target?: EventTarget, OrientationEvent?: { requestPermission?: () => Promise<string> } }} [deps]
 * @returns {{ start: () => Promise<boolean>, pitchDeg: () => number | null, stop: () => void }}
 */
export function createTiltSensor({
  target = globalThis,
  OrientationEvent = globalThis.DeviceOrientationEvent,
} = {}) {
  let beta = null;
  let gamma = null;
  let listening = false;
  const onEvent = (event) => {
    beta = event.beta;
    gamma = event.gamma;
  };
  return {
    async start() {
      try {
        if (OrientationEvent && typeof OrientationEvent.requestPermission === "function") {
          const answer = await OrientationEvent.requestPermission();
          if (answer !== "granted") return false;
        }
        if (!listening) {
          target.addEventListener("deviceorientation", onEvent);
          listening = true;
        }
        return true;
      } catch {
        return false;
      }
    },
    pitchDeg() {
      return cameraPitchDeg(beta, gamma);
    },
    stop() {
      if (listening) target.removeEventListener("deviceorientation", onEvent);
      listening = false;
      beta = null;
      gamma = null;
    },
  };
}
