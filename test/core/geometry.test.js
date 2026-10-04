import { test } from "node:test";
import assert from "node:assert/strict";
import { dist, median, mad, summarise, ellipsePerimeter } from "../../src/core/geometry.js";

test("dist is Euclidean", () => {
  assert.equal(dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test("median handles odd, even and empty input without reordering", () => {
  const input = [3, 1, 2];
  assert.equal(median(input), 2);
  assert.deepEqual(input, [3, 1, 2]);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.ok(Number.isNaN(median([])));
});

test("mad is the median absolute deviation", () => {
  assert.equal(mad([1, 2, 3, 4, 100]), 1);
  assert.equal(mad([5, 5, 5]), 0);
});

test("summarise gives median, mad and n", () => {
  assert.deepEqual(summarise([10, 12, 11]), { median: 11, mad: 1, n: 3 });
});

test("ellipsePerimeter matches known values and is symmetric", () => {
  assert.ok(Math.abs(ellipsePerimeter(10, 10) - 2 * Math.PI * 10) < 1e-9);
  assert.ok(Math.abs(ellipsePerimeter(15, 10.5) - 80.74) < 0.01);
  assert.equal(ellipsePerimeter(15, 10.5), ellipsePerimeter(10.5, 15));
});
