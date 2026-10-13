// Frame rate from recent frame timestamps (D-10). Pure: no clock, the caller passes times.

/**
 * Frames per second over a window of timestamps, rounded to 1 decimal.
 * Non-finite values and values not after the last kept one are ignored.
 * @param {number[]} timestampsMs - frame times in ms, oldest first
 * @returns {number|null} fps, or null with fewer than two usable times or a zero span
 */
export function frameRateFps(timestampsMs) {
  if (!Array.isArray(timestampsMs)) return null;
  const kept = [];
  for (const ts of timestampsMs) {
    if (!Number.isFinite(ts)) continue;
    if (kept.length > 0 && ts <= kept[kept.length - 1]) continue;
    kept.push(ts);
  }
  if (kept.length < 2) return null;
  const span = kept[kept.length - 1] - kept[0];
  if (!(span > 0)) return null;
  return Math.round(((kept.length - 1) * 1000 / span) * 10) / 10;
}
