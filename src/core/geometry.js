// Small numeric helpers. Pure.

/**
 * Euclidean distance between two {x, y} points.
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 * @returns {number}
 */
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Median of a list of numbers; NaN for an empty list. The input is not reordered.
 * @param {number[]} values
 * @returns {number}
 */
export function median(values) {
  if (values.length === 0) return NaN;
  const sorted = values.slice().sort((p, q) => p - q);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Median absolute deviation from the median.
 * @param {number[]} values
 * @returns {number}
 */
export function mad(values) {
  const m = median(values);
  return median(values.map((v) => Math.abs(v - m)));
}

/**
 * Median, median absolute deviation and count.
 * @param {number[]} values
 * @returns {{ median: number, mad: number, n: number }}
 */
export function summarise(values) {
  return { median: median(values), mad: mad(values), n: values.length };
}

/**
 * Perimeter of an ellipse from its semi-axes, by Ramanujan's first approximation.
 * A real bust is not an ellipse, so the result is a baseline to be corrected in Phase 3.
 * @param {number} a semi-axis
 * @param {number} b semi-axis
 * @returns {number}
 */
export function ellipsePerimeter(a, b) {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}
