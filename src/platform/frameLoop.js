// Throttled, restartable frame driver. Uses requestVideoFrameCallback when available.

function scheduler(videoEl) {
  if (typeof videoEl.requestVideoFrameCallback === "function") {
    return {
      request: (cb) => videoEl.requestVideoFrameCallback(() => cb()),
      cancel: (id) => videoEl.cancelVideoFrameCallback(id),
    };
  }
  return {
    request: (cb) => requestAnimationFrame(() => cb()),
    cancel: (id) => cancelAnimationFrame(id),
  };
}

/**
 * @param {{ videoEl: HTMLVideoElement, onFrame: (timestampMs: number) => (void | Promise<void>), targetFps?: number }} deps
 */
export function createFrameLoop({ videoEl, onFrame, targetFps = 12 }) {
  const sched = scheduler(videoEl);
  const minGapMs = 1000 / targetFps;
  let running = false;
  let handle = null;
  let lastTick = -Infinity;
  let inFlight = false;

  async function tick() {
    if (!running) return;
    const now = performance.now();
    if (!inFlight && now - lastTick >= minGapMs) {
      lastTick = now;
      inFlight = true;
      try {
        await onFrame(now);
      } catch (err) {
        console.error("Frame loop error:", err);
      } finally {
        inFlight = false;
      }
    }
    if (running) handle = sched.request(tick);
  }

  function start() {
    if (running) return;
    running = true;
    handle = sched.request(tick);
  }

  function stop() {
    running = false;
    if (handle !== null) {
      sched.cancel(handle);
      handle = null;
    }
  }

  return { start, stop, isRunning: () => running };
}

/**
 * Resolves true on the next presented frame, false after timeoutMs. Never rejects.
 * @param {HTMLVideoElement} videoEl
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
export function nextVideoFrame(videoEl, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const sched = scheduler(videoEl);
    let timer = null;
    let handle = null;
    handle = sched.request(() => {
      clearTimeout(timer);
      resolve(true);
    });
    timer = setTimeout(() => {
      sched.cancel(handle);
      resolve(false);
    }, timeoutMs);
  });
}
