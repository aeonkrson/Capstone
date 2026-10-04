// Silhouette row maths on { w, h, data } masks, all in mask pixels. Pure.

/**
 * Bounding box of the set pixels, inclusive, or null for an empty mask.
 * @param {{ w: number, h: number, data: Uint8Array }} mask
 * @returns {{ top: number, bottom: number, left: number, right: number } | null}
 */
export function maskBBox(mask) {
  const { w, h, data } = mask;
  let top = -1;
  let bottom = -1;
  let left = w;
  let right = -1;
  for (let y = 0; y < h; y += 1) {
    const base = y * w;
    for (let x = 0; x < w; x += 1) {
      if (data[base + x]) {
        if (top < 0) top = y;
        bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  return top < 0 ? null : { top, bottom, left, right };
}

/**
 * Runs of set pixels in one row; end is exclusive.
 * @param {{ w: number, h: number, data: Uint8Array }} mask
 * @param {number} row
 * @returns {{ start: number, end: number }[]}
 */
export function rowRuns(mask, row) {
  const { w, h, data } = mask;
  const runs = [];
  if (row < 0 || row >= h) return runs;
  const base = row * w;
  let start = -1;
  for (let x = 0; x < w; x += 1) {
    if (data[base + x]) {
      if (start < 0) start = x;
    } else if (start >= 0) {
      runs.push({ start, end: x });
      start = -1;
    }
  }
  if (start >= 0) runs.push({ start, end: w });
  return runs;
}

/**
 * The run in a row that contains the midline column, or null.
 * @param {{ w: number, h: number, data: Uint8Array }} mask
 * @param {number} row rounded to the nearest integer
 * @param {number} centerX rounded to the nearest integer
 * @returns {{ start: number, end: number, width: number } | null}
 */
export function torsoRunAtRow(mask, row, centerX) {
  const r = Math.round(row);
  const cx = Math.round(centerX);
  if (r < 0 || r >= mask.h) return null;
  for (const run of rowRuns(mask, r)) {
    if (run.start <= cx && cx < run.end) return { start: run.start, end: run.end, width: run.end - run.start };
  }
  return null;
}

/**
 * The widest midline run over a row range. Rows are rounded and clamped; ties keep the highest row.
 * @param {{ w: number, h: number, data: Uint8Array }} mask
 * @param {number} firstRow
 * @param {number} lastRow
 * @param {(row: number) => number} centerXForRow midline column in mask pixels
 * @returns {{ row: number, start: number, end: number, width: number } | null}
 */
export function widestTorsoRun(mask, firstRow, lastRow, centerXForRow) {
  const first = Math.max(0, Math.min(mask.h - 1, Math.round(firstRow)));
  const last = Math.max(0, Math.min(mask.h - 1, Math.round(lastRow)));
  let best = null;
  for (let row = first; row <= last; row += 1) {
    const run = torsoRunAtRow(mask, row, centerXForRow(row));
    if (run && (best === null || run.width > best.width)) best = { row, ...run };
  }
  return best;
}
