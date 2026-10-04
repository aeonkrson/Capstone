// Centimetres per image pixel from the silhouette's head-top-to-sole extent and the typed height. Pure.

import { maskBBox } from "./mask.js";

/**
 * One scale per call; the caller computes it once per view.
 * @param {number} heightCm
 * @param {import("./types.js").Mask | null} mask
 * @param {{ w: number, h: number }} image
 * @returns {{ ok: true, cmPerPx: number, headTopY: number, soleY: number } |
 *           { ok: false, code: "no-mask" | "body-touches-edge" }}
 */
export function cmPerPxFromMask(heightCm, mask, image) {
  if (!mask) return { ok: false, code: "no-mask" };
  const bbox = maskBBox(mask);
  if (!bbox) return { ok: false, code: "no-mask" };
  if (bbox.top === 0 || bbox.bottom === mask.h - 1) return { ok: false, code: "body-touches-edge" };
  const sy = image.h / mask.h;
  const extent = (bbox.bottom - bbox.top + 1) * sy;
  return {
    ok: true,
    cmPerPx: heightCm / extent,
    headTopY: bbox.top * sy,
    soleY: (bbox.bottom + 1) * sy - 1,
  };
}
