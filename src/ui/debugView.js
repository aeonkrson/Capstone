// Canvas rendering of the camera frame and the engine info list. Draws no text on the canvas.

/**
 * @param {{ canvasEl: HTMLCanvasElement, engineListEl: HTMLElement | null, t: Function }} deps
 */
export function createDebugView({ canvasEl, engineListEl, t }) {
  const ctx = canvasEl.getContext("2d");
  const options = { debug: false, showSkeleton: true, showMask: true, mirror: true };
  let lastInfo = "";

  function setOptions(next) {
    Object.assign(options, next);
  }

  function render({ videoEl, obs, guides }) {
    const width = videoEl.videoWidth;
    const height = videoEl.videoHeight;
    if (!width || !height) return;
    if (canvasEl.width !== width || canvasEl.height !== height) {
      canvasEl.width = width;
      canvasEl.height = height;
    }
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    if (options.mirror) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoEl, 0, 0, width, height);
    ctx.restore();
  }

  // Engine labels (model, delegate, mode, inference ms, frame, mask) are developer labels and stay English.
  function setEngineInfo(info) {
    if (!engineListEl) return;
    const serial = JSON.stringify(info);
    if (serial === lastInfo) return;
    lastInfo = serial;
    engineListEl.replaceChildren();
    for (const [label, value] of Object.entries(info)) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = String(value);
      engineListEl.append(dt, dd);
    }
  }

  return { setOptions, render, setEngineInfo };
}
