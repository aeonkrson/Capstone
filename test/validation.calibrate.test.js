import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePhase3Readings, analyse } from "../validation/calibrate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEADER = "subject,device,clothing,measurement,repeat,tape1_cm,tape2_cm,scan_raw_cm,scan_cm,notes";

function csv(rows) {
  return [HEADER, ...rows.map((r) => r.join(","))].join("\n") + "\n";
}
const row = (over = {}) => {
  const base = { s: "S1", d: "phone", c: "everyday", m: "shoulder", r: 1, t1: 38, t2: 38.4, raw: 36, scan: 38, n: "" };
  const o = { ...base, ...over };
  return [o.s, o.d, o.c, o.m, o.r, o.t1, o.t2, o.raw, o.scan, o.n];
};

test("parse accepts a valid file", () => {
  const rows = parsePhase3Readings(csv([row()]));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].subject, "S1");
  assert.equal(rows[0].scanRaw, 36);
});

test("parse rejects a wrong header", () => {
  assert.throws(() => parsePhase3Readings("a,b\n"), /header/i);
});

test("parse rejects bad fields with the file line number", () => {
  assert.throws(() => parsePhase3Readings(csv([row({ s: "Bob" })])), /Row 2.*subject/);
  assert.throws(() => parsePhase3Readings(csv([row({ s: "S10" })])), /Row 2.*subject/);
  assert.throws(() => parsePhase3Readings(csv([row({ m: "knee" })])), /Row 2.*measurement/);
  assert.throws(() => parsePhase3Readings(csv([row(), row({ raw: "abc" })])), /Row 3.*scan_raw_cm/);
  assert.throws(() => parsePhase3Readings(csv([row({ n: "a;b" }), row({ n: "x" })]).replace("a;b", "a,b")), /Row 2/);
});

test("analyse computes errors, repeat ranges and suggested offset", () => {
  const mk = (s, raws, t1, t2) =>
    raws.map((raw, i) => row({ s, r: i + 1, t1, t2, raw, scan: raw + 2 }));
  const rows = parsePhase3Readings(csv([
    ...mk("S1", [36.0, 36.5, 36.0], 38.0, 38.4),
    ...mk("S2", [37.5, 37.0, 37.2], 39.0, 39.2),
  ]));
  const res = analyse(rows);
  assert.equal(res.length, 1);
  const g = res[0];
  assert.equal(g.device, "phone");
  assert.equal(g.measurement, "shoulder");
  assert.equal(g.n, 2);
  assert.ok(Math.abs(g.suggestedOffsetCm - 2.0) <= 0.1, String(g.suggestedOffsetCm));
  assert.deepEqual(g.repeatRanges.map((r) => Math.round(r.range * 10) / 10), [0.5, 0.5]);
  assert.ok(g.maeScanCm > 0 && g.maxAbsScanCm >= g.maeScanCm);
});

test("analyse gives no suggested offset with fewer than 2 subjects", () => {
  const rows = parsePhase3Readings(csv([row()]));
  assert.equal(analyse(rows)[0].suggestedOffsetCm, null);
});

test("CLI on the header-only file prints a no data line and exits 0", () => {
  const out = execFileSync("node", ["validation/calibrate.mjs", "validation/phase3-readings.csv"], {
    cwd: ROOT, encoding: "utf8",
  });
  assert.match(out, /no data/i);
});
