import { test } from "node:test";
import assert from "node:assert/strict";
import { guideFigure } from "../../src/core/poseGuide.js";

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const points = (fig) => fig.segments.flatMap(([x1, y1, x2, y2]) => [[x1, y1], [x2, y2]]);
const extent = (fig) => {
  const xs = points(fig).map((p) => p[0]);
  return Math.max(...xs) - Math.min(...xs);
};

for (const [w, h] of [[720, 1280], [1280, 720]]) {
  for (const view of ["front", "side"]) {
    test(`${view} ${w}x${h}: inside canvas, spans 8% to 92% of height`, () => {
      const fig = guideFigure(view, w, h);
      for (const [x, y] of points(fig)) {
        assert.ok(x >= 0 && x <= w && y >= 0 && y <= h, `${x},${y}`);
      }
      const { cx, cy, r } = fig.head;
      assert.ok(cx - r >= 0 && cx + r <= w && cy - r >= 0 && cy + r <= h);
      near(cy - r, 0.08 * h, 1);
      near(Math.max(...points(fig).map((p) => p[1])), 0.92 * h, 1);
    });
  }
}

test("front figure is symmetric about the centre line", () => {
  const w = 720;
  const fig = guideFigure("front", w, 1280);
  const key = ([a, b, c, d]) => [a, b, c, d].map((v) => v.toFixed(0)).join(",");
  const mirrored = fig.segments.map(([x1, y1, x2, y2]) => [w - x1, y1, w - x2, y2]);
  for (const m of mirrored) {
    const found = fig.segments.some((s) =>
      s.every((v, i) => Math.abs(v - m[i]) <= 0.5) ||
      [s[2], s[3], s[0], s[1]].every((v, i) => Math.abs(v - m[i]) <= 0.5));
    assert.ok(found, key(m));
  }
  near(fig.head.cx, w / 2, 0.5);
});

test("front is wider than side", () => {
  assert.ok(extent(guideFigure("front", 720, 1280)) > extent(guideFigure("side", 720, 1280)));
});

test("front arms end farther from the centre line than the shoulders", () => {
  const w = 720;
  const fig = guideFigure("front", w, 1280);
  const cx = w / 2;
  const shoulderDx = Math.max(...fig.segments.filter((s) => s[1] === s[3]).map((s) => Math.abs(s[0] - cx)).filter((d) => d > 0));
  // arm segments: the two longest segments leaving a shoulder point downward-and-out
  const arms = fig.segments.filter(([x1, y1, x2, y2]) => y2 > y1 && Math.abs(x2 - cx) > Math.abs(x1 - cx) && Math.abs(x1 - cx) >= shoulderDx - 0.5);
  assert.ok(arms.length >= 2);
  for (const [, , x2] of arms) assert.ok(Math.abs(x2 - cx) > shoulderDx);
});

test("unknown view throws", () => {
  assert.throws(() => guideFigure("back", 100, 100));
});
