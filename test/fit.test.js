import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFit, recommendSize, recommendAll, PREFERENCES } from "../src/core/fit.js";
import { sizeFromBust } from "../src/core/sizeFromTape.js";
import { PLAIN_TEE } from "../src/data/colourboxCharts.js";

test("preferences", () => {
  assert.deepEqual(PREFERENCES, ["regular", "loose", "oversize"]);
});

test("recommendSize for body 80", () => {
  assert.equal(recommendSize(80, "regular", PLAIN_TEE).label, "XS");
  assert.equal(recommendSize(80, "loose", PLAIN_TEE).label, "S");
  const o = recommendSize(80, "oversize", PLAIN_TEE);
  assert.equal(o.label, "L"); // M ease 22 < 24, L ease 26
  assert.equal(o.easeCm, 26);
});

test("borderline with larger neighbour", () => {
  const r = recommendSize(85.5, "regular", PLAIN_TEE);
  assert.equal(r.label, "XS");
  assert.equal(r.borderline, true);
  assert.equal(r.neighbour, "S");
});

test("borderline with smaller neighbour", () => {
  // body 88: XS ease 6, S ease 10 -> S; S ease - min = 2, XS is 2 short -> not borderline
  assert.equal(recommendSize(88, "regular", PLAIN_TEE).borderline, false);
  // body 89.5: S ease 8.5 -> borderline, neighbour M
  const r = recommendSize(89.5, "regular", PLAIN_TEE);
  assert.equal(r.label, "S");
  assert.equal(r.neighbour, "M");
  // body 86.5: XS ease 7.5 short; S ease 11.5; XS was within 0.5 of min -> neighbour XS
  const p = recommendSize(86.5, "regular", PLAIN_TEE);
  assert.equal(p.label, "S");
  assert.equal(p.borderline, true);
  assert.equal(p.neighbour, "XS");
});

test("above range", () => {
  const r = recommendSize(110, "regular", PLAIN_TEE);
  assert.equal(r.label, null);
  assert.equal(r.outOfRange, "above");
});

test("regular agrees with sizeFromBust", () => {
  for (let c = 70; c <= 86; c += 0.5) {
    const sb = sizeFromBust(c, PLAIN_TEE);
    const mine = recommendSize(c, "regular", PLAIN_TEE);
    if (sb.index >= 0) assert.equal(mine.label, sb.label, `chest ${c}`);
    else assert.equal(mine.label, "XS", `chest ${c}`);
  }
  for (let c = 86.5; c <= 102; c += 0.5) {
    assert.equal(recommendSize(c, "regular", PLAIN_TEE).label, sizeFromBust(c, PLAIN_TEE).label, `chest ${c}`);
  }
});

test("checkFit areas", () => {
  const body = { chestCm: 80, shoulderCm: 36, torsoCm: 44 };
  const ok = checkFit({ chart: PLAIN_TEE, sizeLabel: "XS", preference: "regular", body });
  assert.equal(ok.areas.chest.status, "ok");
  assert.equal(ok.areas.chest.diffCm, 0);
  assert.equal(ok.areas.chest.valueCm, 14);
  const big = checkFit({ chart: PLAIN_TEE, sizeLabel: "XL", preference: "regular", body });
  assert.equal(big.areas.chest.status, "loose");
  assert.equal(big.areas.chest.diffCm, 14);
  const tight = checkFit({ chart: PLAIN_TEE, sizeLabel: "XS", preference: "regular", body: { ...body, chestCm: 90 } });
  assert.equal(tight.areas.chest.status, "tight");
  assert.equal(tight.areas.chest.diffCm, -4);
});

test("area borderline flag when ok but near a window edge", () => {
  // chest ease 8.5 at regular min 8
  const r = checkFit({ chart: PLAIN_TEE, sizeLabel: "XS", preference: "regular", body: { chestCm: 85.5, shoulderCm: 36, torsoCm: 44 } });
  assert.equal(r.areas.chest.status, "ok");
  assert.equal(r.areas.chest.borderline, true);
});

test("verdicts", () => {
  const body = { chestCm: 80, shoulderCm: 36, torsoCm: 44 };
  // XS: chest 14 ok (2 from max), shoulder 1 ok, length 12 ok -> fits
  assert.equal(checkFit({ chart: PLAIN_TEE, sizeLabel: "XS", preference: "regular", body }).verdict, "fits");
  assert.equal(checkFit({ chart: PLAIN_TEE, sizeLabel: "XL", preference: "regular", body }).verdict, "too-large");
  assert.equal(checkFit({ chart: PLAIN_TEE, sizeLabel: "XS", preference: "regular", body: { ...body, chestCm: 90 } }).verdict, "too-small");
  assert.equal(
    checkFit({ chart: PLAIN_TEE, sizeLabel: "XS", preference: "regular", body: { ...body, chestCm: 85.5 } }).verdict,
    "borderline"
  );
  // tight chest and loose shoulder: tight wins
  const mixed = checkFit({ chart: PLAIN_TEE, sizeLabel: "XS", preference: "regular", body: { chestCm: 90, shoulderCm: 25, torsoCm: 44 } });
  assert.equal(mixed.areas.shoulder.status, "loose");
  assert.equal(mixed.verdict, "too-small");
});

test("checkFit includes recommended and throws on bad input", () => {
  const body = { chestCm: 80, shoulderCm: 36, torsoCm: 44 };
  assert.equal(checkFit({ chart: PLAIN_TEE, sizeLabel: "M", preference: "loose", body }).recommended.label, "S");
  assert.throws(() => checkFit({ chart: PLAIN_TEE, sizeLabel: "XXL", preference: "regular", body }));
  assert.throws(() => checkFit({ chart: PLAIN_TEE, sizeLabel: "M", preference: "tight", body }));
  assert.throws(() => recommendSize(80, "regular", { id: "x", status: "unconfirmed" }));
});

test("recommendAll", () => {
  const all = recommendAll(80, PLAIN_TEE);
  assert.deepEqual([all.regular.label, all.loose.label, all.oversize.label], ["XS", "S", "L"]);
});
