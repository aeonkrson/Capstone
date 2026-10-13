import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseStudyReadings, analyseStudy, renderMarkdown, TARGETS, MIN_SUBJECTS,
} from "../validation/study.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "validation", "study.mjs");
const HEADER = "subject,device,browser,measurement,repeat,tape1_cm,tape2_cm,scan_cm,notes";

// Made-up fixture readings. They live only in this test file.
function csv(rows) {
  return [HEADER, ...rows.map((r) => r.join(","))].join("\n") + "\n";
}
// [subject, device, measurement, repeat, tape1, tape2, scan, notes?]
function rowsOf(list) {
  return list.map(([s, d, m, r, t1, t2, sc, notes = ""]) =>
    [s, d, d === "laptop" ? "chrome" : "safari", m, r, t1, t2, sc, notes]);
}
const parse = (list) => parseStudyReadings(csv(rowsOf(list)));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} !== ${b}`);
const cell = (res, m, d) => res.cells.find((c) => c.measurement === m && c.device === d);

// Shoulder and chest for one subject on one device, three repeats each.
function subjectSet(s, d, shoulderTape, shoulderScans, chestTape, chestScans) {
  return [
    ...shoulderScans.map((sc, i) => [s, d, "shoulder", String(i + 1), shoulderTape, shoulderTape, sc]),
    ...chestScans.map((sc, i) => [s, d, "chest", String(i + 1), chestTape, chestTape, sc]),
  ];
}

const GOOD = [
  ...subjectSet("S1", "iphone", "40", ["41", "40.5", "41.5"], "88", ["88.5", "88", "89"]),
  ...subjectSet("S2", "iphone", "44", ["43", "43.5", "44"], "96", ["96.5", "96", "96"]),
  ...subjectSet("S1", "laptop", "40", ["41", "41", "40"], "88", ["88", "88.5", "88.5"]),
  ...subjectSet("S2", "laptop", "44", ["45", "44.5", "44"], "96", ["96", "95.5", "96"]),
];

test("constants", () => {
  assert.equal(TARGETS.shoulderMaeCm, 2.5);
  assert.equal(TARGETS.chestMaeCm, 3.5);
  assert.ok(Object.isFrozen(TARGETS));
  assert.equal(MIN_SUBJECTS, 2);
});

test("header only parses to no rows", () => {
  assert.deepEqual(parseStudyReadings(HEADER + "\n"), []);
});

test("wrong header throws with the expected header", () => {
  assert.throws(() => parseStudyReadings("subject,device\nS1,iphone\n"), new RegExp(HEADER));
});

test("valid row parses to numbers", () => {
  const rows = parse([["S3", "android", "waist", "2", "80", "80.5", "82.25", "loose shirt"]]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].subject, "S3");
  assert.equal(rows[0].device, "android");
  assert.equal(rows[0].browser, "safari");
  assert.equal(rows[0].measurement, "waist");
  assert.equal(rows[0].repeat, 2);
  assert.equal(rows[0].tape1, 80);
  assert.equal(rows[0].tape2, 80.5);
  assert.equal(rows[0].scan, 82.25);
  assert.equal(rows[0].notes, "loose shirt");
});

test("bad fields throw with the file line number", () => {
  const base = ["S1", "iphone", "safari", "shoulder", "1", "40", "40", "41", ""];
  const bad = (k, v, name) => {
    const r = [...base];
    r[k] = v;
    const text = csv([base, r]);
    assert.throws(() => parseStudyReadings(text), new RegExp(`^Error: Row 3: invalid ${name}$`), `${name}=${v}`);
  };
  bad(0, "Jordan", "subject");
  bad(0, "S0", "subject");
  bad(0, "S10", "subject");
  bad(1, "phone", "device");
  bad(1, "ipad", "device");
  bad(2, "opera", "browser");
  bad(3, "bust", "measurement");
  bad(4, "0", "repeat");
  bad(5, "40cm", "tape1_cm");
  bad(6, "-1", "tape2_cm");
  bad(7, "", "scan_cm");
  bad(8, "x".repeat(81), "notes");
  bad(8, "see IMG_0042.JPG", "notes");
  bad(8, "clip scan.mov", "notes");
  bad(8, "photo.heic later", "notes");
});

test("notes with a comma give a field count error with the line number", () => {
  const text = csv([["S1", "iphone", "safari", "shoulder", "1", "40", "40", "41", "a,b"]]);
  assert.throws(() => parseStudyReadings(text), /^Error: Row 2: /);
});

test("80 character notes are accepted", () => {
  const rows = parse([["S1", "iphone", "shoulder", "1", "40", "40", "41", "y".repeat(80)]]);
  assert.equal(rows[0].notes.length, 80);
});

test("no rows: every cell is empty and outcome is INSUFFICIENT DATA", () => {
  const res = analyseStudy([]);
  assert.equal(res.cells.length, 5 * 4);
  for (const c of res.cells) {
    assert.equal(c.n, 0);
    assert.deepEqual(c.subjects, []);
    assert.equal(c.mae, null);
    assert.equal(c.maxAbs, null);
    assert.equal(c.meanSigned, null);
    assert.equal(c.maxRepeatRange, null);
  }
  for (const cls of ["phone", "laptop"]) {
    assert.deepEqual(res.targets[cls], {
      shoulder: "INSUFFICIENT DATA", chest: "INSUFFICIENT DATA", sizeAgreement: "INSUFFICIENT DATA",
    });
  }
  assert.equal(res.overall, "INSUFFICIENT DATA");
});

test("two subjects on iphone and laptop with small errors -> GO", () => {
  const res = analyseStudy(parse(GOOD));
  const sh = cell(res, "shoulder", "iphone");
  assert.equal(sh.n, 2);
  assert.deepEqual(sh.subjects, ["S1", "S2"]);
  // S1 median 41 - 40 = 1; S2 median 43.5 - 44 = -0.5
  close(sh.mae, 0.75);
  close(sh.maxAbs, 1);
  close(sh.meanSigned, 0.25);
  close(sh.maxRepeatRange, 1);
  assert.equal(cell(res, "shoulder", "phone").n, 2);
  assert.equal(cell(res, "shoulder", "android").n, 0);
  assert.equal(cell(res, "waist", "laptop").n, 0);
  assert.deepEqual(res.targets.phone, { shoulder: "MET", chest: "MET", sizeAgreement: "MET" });
  assert.deepEqual(res.targets.laptop, { shoulder: "MET", chest: "MET", sizeAgreement: "MET" });
  assert.equal(res.overall, "GO");
  assert.deepEqual(res.subjects, ["S1", "S2"]);
});

test("laptop shoulder mae 3.0 -> phone MET, laptop NOT MET -> CONDITIONAL", () => {
  const list = GOOD.filter((r) => !(r[1] === "laptop" && r[2] === "shoulder")).concat([
    ["S1", "laptop", "shoulder", "1", "40", "40", "43"],
    ["S2", "laptop", "shoulder", "1", "44", "44", "41"],
  ]);
  const res = analyseStudy(parse(list));
  close(cell(res, "shoulder", "laptop").mae, 3);
  close(cell(res, "shoulder", "laptop").meanSigned, 0);
  assert.equal(res.targets.laptop.shoulder, "NOT MET");
  assert.deepEqual(res.targets.phone, { shoulder: "MET", chest: "MET", sizeAgreement: "MET" });
  assert.equal(res.overall, "CONDITIONAL");
});

test("one subject only -> INSUFFICIENT DATA", () => {
  const res = analyseStudy(parse(GOOD.filter((r) => r[0] === "S1")));
  assert.equal(res.targets.phone.shoulder, "INSUFFICIENT DATA");
  assert.equal(res.targets.laptop.chest, "INSUFFICIENT DATA");
  assert.equal(cell(res, "shoulder", "iphone").n, 1);
  close(cell(res, "shoulder", "iphone").mae, 1);
  assert.equal(res.overall, "INSUFFICIENT DATA");
});

test("scan size differs and is not borderline toward tape -> sizeAgreement NOT MET", () => {
  // S2 laptop chest: tape 96 (L), scan 92 (M, not borderline).
  const list = GOOD.filter((r) => !(r[0] === "S2" && r[1] === "laptop" && r[2] === "chest")).concat([
    ["S2", "laptop", "chest", "1", "96", "96", "92"],
  ]);
  const res = analyseStudy(parse(list));
  assert.equal(res.targets.laptop.sizeAgreement, "NOT MET");
  assert.equal(res.targets.phone.sizeAgreement, "MET");
  assert.equal(res.overall, "CONDITIONAL");
});

test("borderline scan with the tape size as neighbour agrees", () => {
  // tape 88 -> S; scan 86 -> XS borderline, neighbour S.
  const list = GOOD.filter((r) => !(r[0] === "S1" && r[1] === "iphone" && r[2] === "chest")).concat([
    ["S1", "iphone", "chest", "1", "88", "88", "86"],
  ]);
  const res = analyseStudy(parse(list));
  assert.equal(res.targets.phone.sizeAgreement, "MET");
});

test("phone class merges iphone and android; a subject on both counts once", () => {
  const list = [
    ["S1", "iphone", "shoulder", "1", "40", "40", "41"],
    ["S1", "android", "shoulder", "1", "40", "40", "42"],
    ["S1", "android", "shoulder", "2", "40", "40", "43"],
    ["S2", "android", "shoulder", "1", "44", "44", "44"],
  ];
  const res = analyseStudy(parse(list));
  const ph = cell(res, "shoulder", "phone");
  assert.equal(ph.n, 2);
  assert.deepEqual(ph.subjects, ["S1", "S2"]);
  // S1 phone median of 41,42,43 = 42 -> error 2; S2 error 0
  close(ph.mae, 1);
  close(ph.maxAbs, 2);
  close(ph.maxRepeatRange, 2);
  assert.equal(cell(res, "shoulder", "android").n, 2);
  assert.equal(cell(res, "shoulder", "iphone").n, 1);
});

test("tape value is the mean of all tape readings", () => {
  const list = [
    ["S1", "laptop", "torso", "1", "60", "61", "62"],
    ["S1", "laptop", "torso", "2", "62", "61", "62"],
  ];
  const res = analyseStudy(parse(list));
  close(cell(res, "torso", "laptop").meanSigned, 1);
});

test("markdown with no data", () => {
  const md = renderMarkdown(analyseStudy([]));
  const lines = md.split("\n");
  assert.equal(lines[0], "# Phase 5 study results");
  assert.ok(md.includes("Generated by node validation/study.mjs --write. Do not edit by hand."));
  assert.ok(md.includes("Everyday clothes, team members only, 0 subjects (none)"));
  assert.ok(md.includes(
    "| Measurement | Device | n | Subjects | Mean abs error (cm) | Max error (cm) | Mean signed (cm) | Max repeat range (cm) |",
  ));
  const dataRows = lines.filter((l) => /^\| (shoulder|chest|waist|torso|arm) \|/.test(l));
  assert.equal(dataRows.length, 20);
  for (const r of dataRows) assert.equal((r.match(/no data/g) || []).length, 5, r);
  assert.ok(md.includes("## Targets"));
  const targetRows = lines.filter((l) => /^\| (phone|laptop) \|/.test(l));
  assert.equal(targetRows.length, 2);
  for (const r of targetRows) assert.equal((r.match(/INSUFFICIENT DATA/g) || []).length, 3, r);
  assert.ok(md.trimEnd().endsWith("Overall outcome: INSUFFICIENT DATA"));
});

test("markdown with data shows two-decimal numbers and verdicts", () => {
  const md = renderMarkdown(analyseStudy(parse(GOOD)));
  assert.ok(md.includes("2 subjects (S1, S2)"));
  assert.ok(md.includes("| shoulder | iphone | 2 | S1, S2 | 0.75 | 1.00 | 0.25 | 1.00 |"));
  assert.ok(md.trimEnd().endsWith("Overall outcome: GO"));
});

function tmpCsv(text) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "study-"));
  const file = path.join(dir, "study-readings.csv");
  writeFileSync(file, text);
  return file;
}

test("CLI --check on the header-only copy prints OK: 0 rows", () => {
  const file = tmpCsv(readFileSync(path.join(ROOT, "validation", "study-readings.csv"), "utf8"));
  const out = execFileSync("node", [SCRIPT, file, "--check"], { encoding: "utf8" });
  assert.equal(out.trim(), "OK: 0 rows");
});

test("CLI default run prints markdown with INSUFFICIENT DATA", () => {
  const file = tmpCsv(HEADER + "\n");
  const out = execFileSync("node", [SCRIPT, file], { encoding: "utf8" });
  assert.ok(out.startsWith("# Phase 5 study results"));
  assert.ok(out.includes("Overall outcome: INSUFFICIENT DATA"));
});

test("CLI reports a bad row and exits 1", () => {
  const file = tmpCsv(csv([["Jordan", "iphone", "safari", "shoulder", "1", "40", "40", "41", ""]]));
  assert.throws(
    () => execFileSync("node", [SCRIPT, file, "--check"], { encoding: "utf8" }),
    (err) => err.status === 1 && err.stdout.includes("Row 2: invalid subject"),
  );
});

test("shipped study-readings.csv is header only and STUDY-RESULTS.md matches it", () => {
  const text = readFileSync(path.join(ROOT, "validation", "study-readings.csv"), "utf8");
  assert.equal(text.trim(), HEADER);
  const results = readFileSync(path.join(ROOT, "validation", "STUDY-RESULTS.md"), "utf8");
  assert.equal(results, renderMarkdown(analyseStudy(parseStudyReadings(text))) + "\n");
});
