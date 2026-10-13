// Synthetic front and side observations shared by tests. Copied from
// test/scan.flow.test.js (importing a test file would register its tests).

export const W = 480;
export const H = 640;
export const HEIGHT = 168;

function fillRect(mask, c0, c1, r0, r1) {
  for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) mask.data[y * mask.w + x] = 1;
}

function buildMask(rects) {
  const mask = { w: W, h: H, data: new Uint8Array(W * H) };
  for (const r of rects) fillRect(mask, ...r);
  return mask;
}

// Plan 03-01 e2e bodies.
const FRONT_RECTS = [
  [215, 264, 40, 119], [196, 285, 120, 299], [201, 280, 300, 319], [196, 285, 320, 399],
  [190, 289, 210, 219], [140, 164, 130, 379], [315, 339, 130, 379], [195, 234, 400, 599], [245, 284, 400, 599],
];
const SIDE_RECTS = [
  [215, 264, 20, 99], [205, 274, 100, 289], [210, 269, 290, 309], [205, 274, 310, 420],
  [205, 279, 202, 211], [215, 264, 421, 619],
];

// Plan 03-01 landmarks plus nose and ankles as in plan 03-02.
const FRONT_LM = [
  [0, 240, 60], [11, 300, 140], [12, 180, 140], [23, 260, 390], [24, 220, 390],
  [13, 320, 250], [14, 160, 250], [15, 340, 360], [16, 140, 360], [27, 220, 595], [28, 260, 595],
];
const SIDE_LM = [[0, 240, 40], [11, 242, 125], [12, 238, 125], [23, 242, 400], [24, 238, 400], [27, 240, 615], [28, 240, 615]];

function buildLandmarks(points) {
  const lm = [];
  for (let i = 0; i < 33; i++) lm.push({ x: 240, y: 320, z: 0, v: 0.9 });
  for (const [i, x, y] of points) lm[i] = { x, y, z: 0, v: 0.99 };
  return lm;
}

// Halve coordinates around the frame centre so the body fills under half the frame.
const CX = W / 2;
const CY = H / 2;
const hx = (x) => Math.round(CX + (x - CX) / 2);
const hy = (y) => Math.round(CY + (y - CY) / 2);
const FAR_FRONT_RECTS = FRONT_RECTS.map(([c0, c1, r0, r1]) => [hx(c0), hx(c1), hy(r0), hy(r1)]);
const FAR_FRONT_LM = FRONT_LM.map(([i, x, y]) => [i, hx(x), hy(y)]);

const FRONT_MASK = buildMask(FRONT_RECTS);
const SIDE_MASK = buildMask(SIDE_RECTS);
const FAR_FRONT_MASK = buildMask(FAR_FRONT_RECTS);

export const obsFrom = (mask, lm) => ({ t: 0, image: { w: W, h: H }, lm, world: null, mask });
export const front = () => obsFrom(FRONT_MASK, buildLandmarks(FRONT_LM));
export const side = () => obsFrom(SIDE_MASK, buildLandmarks(SIDE_LM));
export const farFront = () => obsFrom(FAR_FRONT_MASK, buildLandmarks(FAR_FRONT_LM));
