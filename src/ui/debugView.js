// Canvas rendering of the camera frame and the engine info list. Draws no text on the canvas.

import { SKELETON_CONNECTIONS, LANDMARK_COUNT } from "../core/landmarks.js";

/**
 * @param {{ canvasEl: HTMLCanvasElement, engineListEl: HTMLElement | null, liveListEl?: HTMLElement | null,
 *           capturedListEl?: HTMLElement | null, captureStatusEl?: HTMLElement | null,
 *           formatNumber?: Function, t: Function }} deps
 */
export function createDebugView({ canvasEl, engineListEl, liveListEl = null, capturedListEl = null, captureStatusEl = null, formatNumber = String, t }) {
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
      if (guides) drawGuides(guides, width);
    }
    ctx.restore();
  }

  function line(y, width) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Bust band edges (dashed), chosen bust row (solid), head top and sole.
  function drawGuides(g, width) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00e5ff";
    ctx.setLineDash([8, 6]);
    line(g.bustBandTopY, width);
    line(g.bustBandBottomY, width);
    ctx.setLineDash([]);
    ctx.strokeStyle = "#ff2d95";
    line(g.bustRowY, width);
    ctx.strokeStyle = "#7CFC00";
    line(g.headTopY, width);
    line(g.soleY, width);
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

  // Rows are [label, value] pairs; labels and values are written with textContent only.
  const lastRendered = new WeakMap();
  function fillList(listEl, rows) {
    if (!listEl) return;
    const serial = JSON.stringify(rows);
    if (lastRendered.get(listEl) === serial) return;
    lastRendered.set(listEl, serial);
    listEl.replaceChildren();
    for (const [label, value] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      listEl.append(dt, dd);
    }
  }

  const cm = (x) => t("debug.reading.value", { value: formatNumber(x) });

  function setLiveReading(reading) {
    if (!reading.ok) {
      const msg = t("debug.reading.unavailable." + reading.code);
      fillList(liveListEl, [
        [t("debug.reading.shoulder"), msg],
        [t("debug.reading.bust-extent"), msg],
        ["bust row", msg],
        ["cm/px", msg],
      ]);
      return;
    }
    const rows = [
      [t("debug.reading.shoulder"), reading.shoulderCm === null ? t("debug.reading.none") : cm(reading.shoulderCm)],
      [t("debug.reading.bust-extent"), cm(reading.bustExtentCm)],
      ["bust row", formatNumber(reading.bustRowFrac, 2)],
      ["cm/px", formatNumber(reading.cmPerPx, 3)],
    ];
    if (reading.bustRowRuns < 3) rows.push([t("debug.reading.arms-merged"), ""]);
    fillList(liveListEl, rows);
  }

  function setCaptured({ front, side, bustCm }) {
    const none = t("debug.reading.none");
    const withSpread = (s) => cm(s.median) + " " + t("debug.reading.spread", { value: formatNumber(s.mad), n: s.n });
    const rows = [
      [t("debug.reading.shoulder"), front && front.shoulderCm ? withSpread(front.shoulderCm) : none],
      [t("debug.reading.bust-width"), front ? withSpread(front.bustExtentCm) : none],
      [t("debug.reading.bust-depth"), side ? withSpread(side.bustExtentCm) : none],
      ["bust row front", front ? formatNumber(front.bustRowFrac.median, 2) : none],
      ["bust row side", side ? formatNumber(side.bustRowFrac.median, 2) : none],
      ["cm/px front", front ? formatNumber(front.cmPerPx.median, 3) : none],
      ["cm/px side", side ? formatNumber(side.cmPerPx.median, 3) : none],
    ];
    if (typeof bustCm === "number") rows.push([t("debug.reading.bust"), cm(bustCm)]);
    if (front && front.armsMergedFrames > 0) rows.push([t("debug.reading.arms-merged"), ""]);
    fillList(capturedListEl, rows);
  }

  let lastStatus = "";
  function setCaptureStatus(text) {
    if (!captureStatusEl || text === lastStatus) return;
    lastStatus = text;
    captureStatusEl.textContent = text;
  }

  return { setOptions, render, setEngineInfo, setLiveReading, setCaptured, setCaptureStatus };
}
