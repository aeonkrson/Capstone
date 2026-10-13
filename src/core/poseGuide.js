// Pose guide figure geometry for the live scan overlay. Pure, canvas pixels.

const ARM_ANGLE = (20 * Math.PI) / 180;

/**
 * Stick figure for the guide overlay, body spanning 8% to 92% of the canvas height.
 * @param {"front" | "side"} view
 * @param {number} width canvas width in px
 * @param {number} height canvas height in px
 * @returns {{ head: { cx: number, cy: number, r: number }, segments: Array<[number, number, number, number]> }}
 */
export function guideFigure(view, width, height) {
  if (view !== "front" && view !== "side") throw new Error(`Unknown guide view: ${view}`);
  const H = 0.84 * height;
  const cx = width / 2;
  const top = 0.08 * height;
  const bottom = 0.92 * height;
  const r = 0.065 * H;
  const neckY = top + 2 * r;
  const shoulderY = neckY + 0.02 * H;
  const hipY = top + 0.52 * H;
  const armLen = 0.35 * H;
  const head = { cx, cy: top + r, r };
  const segments = [[cx, neckY, cx, shoulderY]];

  if (view === "front") {
    const sx = 0.13 * H; // half shoulder width (0.26H)
    const hx = 0.09 * H; // half hip width (0.18H)
    const fx = 0.12 * H; // feet slightly apart
    const dx = armLen * Math.sin(ARM_ANGLE);
    const dy = armLen * Math.cos(ARM_ANGLE);
    segments.push(
      [cx - sx, shoulderY, cx + sx, shoulderY],
      [cx - sx, shoulderY, cx - hx, hipY],
      [cx + sx, shoulderY, cx + hx, hipY],
      [cx - hx, hipY, cx + hx, hipY],
      [cx - sx, shoulderY, cx - sx - dx, shoulderY + dy],
      [cx + sx, shoulderY, cx + sx + dx, shoulderY + dy],
      [cx - hx, hipY, cx - fx, bottom],
      [cx + hx, hipY, cx + fx, bottom],
    );
  } else {
    const t = 0.07 * H; // half torso depth (0.14H)
    segments.push(
      [cx - t, shoulderY, cx + t, shoulderY],
      [cx - t, shoulderY, cx - t, hipY],
      [cx + t, shoulderY, cx + t, hipY],
      [cx - t, hipY, cx + t, hipY],
      [cx, shoulderY, cx, shoulderY + armLen],
      [cx, hipY, cx, bottom],
    );
  }
  return { head, segments };
}
