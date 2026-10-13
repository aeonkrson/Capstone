// Live pose guide overlay and hint line (CAPT-02, CAPT-03, P4-D24).
// Strokes the guide figure on the view canvas; no text on the canvas, nothing kept from the frame.

import { guideFigure } from "../core/poseGuide.js";

const WHITE = "#ffffff";
const GREEN = "#7CFC00";

/**
 * @param {{ canvasEl: HTMLCanvasElement, hintEl: HTMLElement | null, t: Function }} deps
 * @returns {{ draw: (status: object) => void, setMessage: (key: string, opts?: { force?: boolean }) => void, clear: () => void }}
 */
export function createGuideView({ canvasEl, hintEl, t }) {
  let lastKey = null;

  function draw(status) {
    if (!status || !status.active) return;
    const width = canvasEl.width;
    const height = canvasEl.height;
    if (!width || !height) return;
    if (status.view !== "front" && status.view !== "side") return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    const fig = guideFigure(status.view, width, height);
    const good = status.gateOk || status.phase === "hold" || status.phase === "capturing";
    const lineWidth = Math.max(3, Math.round(height / 200));
    ctx.save();
    ctx.strokeStyle = good ? GREEN : WHITE;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    if (status.phase === "turn") ctx.setLineDash([lineWidth * 4, lineWidth * 3]);
    ctx.beginPath();
    ctx.arc(fig.head.cx, fig.head.cy, fig.head.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of fig.segments) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function setMessage(key, { force = false } = {}) {
    if (!hintEl) return;
    if (!key) {
      clear();
      return;
    }
    if (key === lastKey && !force) return;
    lastKey = key;
    hintEl.textContent = t(key);
  }

  function clear() {
    lastKey = null;
    if (hintEl) hintEl.textContent = "";
  }

  return { draw, setMessage, clear, currentKey: () => lastKey };
}
