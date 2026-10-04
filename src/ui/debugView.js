// Canvas rendering of the camera frame and the engine info list. Draws no text on the canvas.

import { SKELETON_CONNECTIONS, LANDMARK_COUNT } from "../core/landmarks.js";

/**
 * @param {{ canvasEl: HTMLCanvasElement, engineListEl: HTMLElement | null, t: Function }} deps
 */
export function createDebugView({ canvasEl, engineListEl, t }) {
  const ctx = canvasEl.getContext("2d");
  const options = { debug: false, showSkeleton: true, showMask: true, mirror: true };
  let lastInfo = "";
  // Off-screen canvas for the silhouette overlay; never attached to the document or exported.
  const maskCanvas = document.createElement("canvas");
  const maskCtx = maskCanvas.getContext("2d");
  let maskImage = null;

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
    if (options.debug && obs) {
      if (options.showMask && obs.mask) drawMask(obs.mask, width, height);
      if (options.showSkeleton) drawSkeleton(obs.lm);
    }
    ctx.restore();
  }

  function drawMask(mask, width, height) {
    if (maskCanvas.width !== mask.w || maskCanvas.height !== mask.h) {
      maskCanvas.width = mask.w;
      maskCanvas.height = mask.h;
      maskImage = maskCtx.createImageData(mask.w, mask.h);
    }
    const px = maskImage.data;
    for (let i = 0; i < mask.data.length; i += 1) {
      const o = i * 4;
      px[o] = 0;
      px[o + 1] = 160;
      px[o + 2] = 255;
      px[o + 3] = mask.data[i] ? 110 : 0;
    }
    maskCtx.putImageData(maskImage, 0, 0);
    ctx.drawImage(maskCanvas, 0, 0, width, height);
  }

  function drawSkeleton(lm) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffd400";
    ctx.fillStyle = "#ff3b30";
    for (const [a, b] of SKELETON_CONNECTIONS) {
      if (lm[a].v < 0.5 || lm[b].v < 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(lm[a].x, lm[a].y);
      ctx.lineTo(lm[b].x, lm[b].y);
      ctx.stroke();
    }
    for (let i = 0; i < LANDMARK_COUNT; i += 1) {
      if (lm[i].v < 0.5) continue;
      ctx.beginPath();
      ctx.arc(lm[i].x, lm[i].y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
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
