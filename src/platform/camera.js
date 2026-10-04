// Single owner of the camera MediaStream. Nothing here stores or exports frames.

/**
 * @param {{ videoEl: HTMLVideoElement }} deps
 */
export function createCamera({ videoEl }) {
  let stream = null;
  let generation = 0;

  function stop() {
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    videoEl.srcObject = null;
    stream = null;
    generation += 1;
  }

  function codeFor(err) {
    const name = err && err.name;
    if (name === "NotAllowedError" || name === "SecurityError") return "denied";
    if (name === "NotFoundError") return "no-camera";
    if (name === "NotReadableError" || name === "AbortError") return "busy";
    if (name === "OverconstrainedError") return "overconstrained";
    return "unknown";
  }

  async function start({ facingMode = "user" } = {}) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      return { ok: false, code: "insecure-context" };
    }
    stop();
    const mine = generation;
    try {
      let received;
      try {
        received = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (err) {
        if (err && err.name === "OverconstrainedError") {
          try {
            received = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
          } catch (retryErr) {
            console.error("Camera start failed:", retryErr);
            return { ok: false, code: "overconstrained" };
          }
        } else {
          throw err;
        }
      }
      if (generation !== mine) {
        for (const track of received.getTracks()) track.stop();
        return { ok: false, code: "unknown" };
      }
      stream = received;
      videoEl.srcObject = received;
      await videoEl.play();
      if (generation !== mine) return { ok: false, code: "unknown" };
      return { ok: true, width: videoEl.videoWidth, height: videoEl.videoHeight, facingMode };
    } catch (err) {
      console.error("Camera start failed:", err);
      return { ok: false, code: codeFor(err) };
    }
  }

  function isRunning() {
    return stream !== null;
  }

  return { start, stop, isRunning };
}
