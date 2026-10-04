/**
 * Data contracts shared by the core modules (JSDoc only, no runtime code).
 *
 * @typedef {{ x: number, y: number, z: number, v: number }} LandmarkPx
 *   x and y in RAW, UNMIRRORED image pixels. v is visibility 0..1.
 * @typedef {{ w: number, h: number, data: Uint8Array }} Mask
 *   Person mask, values 0 or 1, row-major, length w*h. Its resolution may differ from the image.
 * @typedef {{ t: number, image: { w: number, h: number }, lm: LandmarkPx[],
 *             world: { x: number, y: number, z: number }[] | null, mask: Mask | null }} FrameObservation
 *   lm has 33 entries (BlazePose order).
 * @typedef {"front" | "side"} ViewKind
 * @typedef {{ ok: true, cm: number } |
 *           { ok: false, code: "empty" | "not-a-number" | "too-low" | "too-high" }} HeightResult
 * @typedef {{ ok: true, view: ViewKind, cmPerPx: number, shoulderCm: number | null,
 *             bustExtentCm: number, bustRowY: number, bustRowFrac: number, bustRowRuns: number,
 *             bustBandTopY: number, bustBandBottomY: number, headTopY: number, soleY: number } |
 *           { ok: false, code: "no-pose" | "no-mask" | "body-touches-edge" |
 *                              "low-visibility" | "no-torso-run" }} ViewReading
 *   bustExtentCm is the front width in the front view and the depth in the side view, taken at
 *   bustRowY, the widest torso row inside the bust band. bustRowFrac is bustRowY's position as a
 *   fraction of the shoulder-midpoint-to-hip-midpoint distance. bustRowY, bustBandTopY,
 *   bustBandBottomY, headTopY and soleY are in image pixels.
 */
export {};
