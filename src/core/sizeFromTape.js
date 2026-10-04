// The written tape-to-size rule (D-12), used for tape and scan values alike.
// Size = smallest size whose garment bust circumference is at least bust + MIN_EASE_CM.
// Phase 2's fit engine owns the real ease windows; this exists so tape and scan share one rule.

export const MIN_EASE_CM = 8;
export const BORDERLINE_BAND_CM = 1.0;
const EPS = 1e-9;

/**
 * The one place a flat chest width becomes a circumference (D-04).
 * @param {object} chart - a chart with a `convention` field
 * @param {object} sizeEntry - one entry of chart.sizes
 * @returns {number} garment bust circumference in cm
 */
export function chestCircumferenceCm(chart, sizeEntry) {
  return chart.convention === "flat" ? sizeEntry.chest * 2 : sizeEntry.chest;
}

/**
 * @param {number} bustCm - bust circumference in cm
 * @param {object} chart - a collected chart
 * @returns {{ label: string, index: number, easeCm: number | null, borderline: boolean, neighbour: string | null }}
 */
export function sizeFromBust(bustCm, chart) {
  if (chart.status !== "collected" || !Array.isArray(chart.sizes)) {
    throw new Error(`Chart ${chart.id} is ${chart.status}; it cannot be used for a size answer`);
  }
  if (typeof bustCm !== "number" || !Number.isFinite(bustCm)) {
    throw new Error("bustCm must be a finite number");
  }
  const sizes = chart.sizes;
  const n = sizes.length;
  const circ = sizes.map((s) => chestCircumferenceCm(chart, s));
  // boundaries[k] is the upper edge of size k-1 and the lower edge of size k; size i spans (b[i], b[i+1]].
  const upper = circ.map((c) => c - MIN_EASE_CM);
  const step = circ[1] - circ[0];
  const boundaries = [upper[0] - step, ...upper];

  const labelAt = (i) => (i < 0 ? "below-" + sizes[0].label : i >= n ? "above-" + sizes[n - 1].label : sizes[i].label);

  let index = n;
  for (let i = 0; i < n; i++) {
    if (upper[i] + EPS >= bustCm) { index = i; break; }
  }
  // Below the lowest boundary counts as below-first.
  if (bustCm <= boundaries[0] + EPS) index = -1;

  // Nearest boundary decides the borderline flag.
  let nearest = 0;
  for (let k = 1; k < boundaries.length; k++) {
    if (Math.abs(bustCm - boundaries[k]) < Math.abs(bustCm - boundaries[nearest])) nearest = k;
  }
  const dist = Math.abs(bustCm - boundaries[nearest]);
  const borderline = dist <= BORDERLINE_BAND_CM + EPS;
  let neighbour = null;
  if (borderline) {
    // Value at or below the boundary belongs to size nearest-1; its neighbour is size nearest.
    neighbour = labelAt(bustCm <= boundaries[nearest] + EPS ? nearest : nearest - 1);
  }

  let easeCm = null;
  if (index === -1) easeCm = circ[0] - bustCm;
  else if (index < n) easeCm = circ[index] - bustCm;

  return { label: labelAt(index), index, easeCm, borderline, neighbour };
}

/**
 * @param {{label: string, index: number}} tapeResult
 * @param {{label: string, index: number, borderline: boolean, neighbour: string | null}} scanResult
 * @returns {"same" | "adjacent-borderline" | "disagree"}
 */
export function sizesAgree(tapeResult, scanResult) {
  if (tapeResult.index === scanResult.index) return "same";
  if (
    Math.abs(tapeResult.index - scanResult.index) === 1 &&
    scanResult.borderline &&
    scanResult.neighbour === tapeResult.label
  ) return "adjacent-borderline";
  return "disagree";
}
