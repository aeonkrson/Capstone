import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseReadings, summarise } from "../validation/report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEADER = "subject,device,clothing,measurement,repeat,tape1_cm,tape2_cm,scan_cm,model_variant,delegate,notes";

function csv(rows) {
  return [HEADER, ...rows.map((r) => r.join(","))].join("\n") + "\n";
}
// [subject, device, measurement, repeat, tape1, tape2, scan]
function mk(list, model = "full") {
  return list.map(([s, d, m, r, t1, t2, sc]) => [s, d, "everyday", m, r, t1, t2, sc, model, "CPU", ""]);
}
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} !== ${b}`);
const group = (res, device, model = "full") => res.groups.find((g) => g.device === device && g.model === model);

const FIX_A = [
  ["S1", "phone", "shoulder", 1, 38.0, 38.5, 36.0], ["S1", "phone", "shoulder", 2, 38.0, 38.5, 36.5],
  ["S1", "phone", "shoulder", 3, 38.0, 38.5, 37.0],
  ["S1", "phone", "bust", 1, 88.0, 89.0, 91.0], ["S1", "phone", "bust", 2, 88.0, 89.0, 91.5],
  ["S1", "phone", "bust", 3, 88.0, 89.0, 92.5],
  ["S2", "phone", "shoulder", 1, 40.0, 40.0, 38.5], ["S2", "phone", "shoulder", 2, 40.0, 40.0, 39.0],
  ["S2", "phone", "shoulder", 3, 40.0, 40.0, 38.0],
  ["S2", "phone", "bust", 1, 85.0, 85.0, 86.5], ["S2", "phone", "bust", 2, 85.0, 85.0, 86.8],
  ["S2", "phone", "bust", 3, 85.0, 85.0, 87.5],
];

function both(list) {
  return list.flatMap(([s, m, t1, t2, sc]) =>
    ["phone", "laptop"].map((d) => [s, d, m, 1, t1, t2, sc]));
}
const B = [
  ["S1", "shoulder", 40, 40, 37], ["S2", "shoulder", 38, 38, 35.5],
  ["S1", "bust", 88, 88, 88.5], ["S2", "bust", 92, 92, 92],
];
const C = [
  ["S1", "shoulder", 40, 40, 39], ["S2", "shoulder", 38, 38, 37.5],
  ["S1", "bust", 88, 88, 88.5], ["S2", "bust", 92, 92, 92],
];

test("parseReadings: header only and wrong header", () => {
  assert.deepEqual(parseReadings(HEADER + "\n"), []);
  assert.throws(() => parseReadings("a,b,c\n"), /subject,device,clothing/);
});

test("parseReadings rejects bad fields with the row number", () => {
  const good = ["S1", "phone", "everyday", "shoulder", "1", "38", "38", "36", "full", "CPU", ""];
  const bad = (idx, v) => {
    const r = [...good]; r[idx] = v;
    return HEADER + "\n" + r.join(",") + "\n";
  };
  for (const [idx, v] of [[0, "Jordan"], [1, "tablet"], [2, "fitted"], [3, "waist"], [8, "lite"], [7, "abc"]]) {
    assert.throws(() => parseReadings(bad(idx, v)), /2/, `field ${idx} value ${v}`);
  }
});

test("fixture A: phone, full", () => {
  const res = summarise(parseReadings(csv(mk(FIX_A))));
  const g = group(res, "phone");
  const [s1, s2] = g.shoulder.subjects;
  close(s1.tape, 38.25); close(s1.scan, 36.5); close(s1.error, -1.75);
  close(s2.tape, 40); close(s2.scan, 38.5); close(s2.error, -1.5);
  close(g.shoulder.mae, 1.625); close(g.shoulder.max, 1.75); close(g.shoulder.meanSigned, -1.625);
  assert.equal(g.shoulder.verdict, "PASS");
  const [b1, b2] = g.bust.subjects;
  close(b1.tape, 88.5); assert.equal(b1.tapeSize, "S");
  close(b1.scan, 91.5); assert.equal(b1.scanSize, "M"); assert.equal(b1.borderline, false);
  assert.equal(b1.agreement, "disagree");
  close(b2.tape, 85); assert.equal(b2.tapeSize, "XS");
  close(b2.scan, 86.8); assert.equal(b2.scanSize, "S");
  assert.equal(b2.borderline, true); assert.equal(b2.neighbour, "XS");
  assert.equal(b2.agreement, "adjacent-borderline");
  assert.equal(g.bust.agreeCount, 1); assert.equal(g.bust.n, 2);
  assert.equal(g.bust.verdict, "FAIL");
  assert.equal(res.overall, "NO-GO");
});

test("insufficient data", () => {
  assert.equal(summarise([]).overall, "INSUFFICIENT DATA");
  assert.equal(summarise([]).subjects.length, 0);
  const one = parseReadings(csv(mk(FIX_A.filter((r) => r[0] === "S1"))));
  assert.equal(summarise(one).overall, "INSUFFICIENT DATA");
});

test("fixture B: shoulder offset caps the outcome at CONDITIONAL", () => {
  const res = summarise(parseReadings(csv(mk(both(B)))));
  for (const d of ["phone", "laptop"]) {
    const g = group(res, d);
    close(g.shoulder.mae, 2.75); close(g.shoulder.meanSigned, -2.75);
    assert.equal(g.shoulder.verdict, "PASS-WITH-OFFSET");
    assert.equal(g.bust.agreeCount, 2);
    assert.equal(g.bust.verdict, "PASS");
  }
  assert.equal(res.overall, "CONDITIONAL");
});

test("fixture C: GO", () => {
  const res = summarise(parseReadings(csv(mk(both(C)))));
  for (const d of ["phone", "laptop"]) {
    const g = group(res, d);
    close(g.shoulder.mae, 0.75); close(g.shoulder.max, 1.0);
    assert.equal(g.shoulder.verdict, "PASS");
  }
  assert.equal(res.overall, "GO");
});

test("no image or video file is tracked under validation/", () => {
  const out = execFileSync("git", ["ls-files", "validation"], { cwd: ROOT, encoding: "utf8" });
  assert.ok(!/\.(png|jpg|jpeg|heic|webp|gif|mp4|mov|webm)$/im.test(out));
});
