// Phase 5 accuracy study evaluator. Applies D-04, D-05 and D-06 from the Phase 5 context.
// Usage: node validation/study.mjs [path] [--check | --write]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { recommendSize } from "../src/core/fit.js";
import { CATALOG } from "../src/data/catalog.js";

// Targets per device class. Changing a target needs a dated line in validation/GO-NO-GO.md.
export const TARGETS = Object.freeze({ shoulderMaeCm: 2.5, chestMaeCm: 3.5 });
// Minimum subjects per device class. Changing it needs a dated line in validation/GO-NO-GO.md.
export const MIN_SUBJECTS = 2;

const HEADER = "subject,device,browser,measurement,repeat,tape1_cm,tape2_cm,scan_cm,notes";
const NUM = /^\d+(\.\d+)?$/;
const MEDIA = /\.(png|jpe?g|heic|webp|gif|mp4|mov|webm)\b/i;
const DEVICES = ["iphone", "android", "laptop"];
const MEASUREMENTS = ["shoulder", "chest", "waist", "torso", "arm"];
const CELL_DEVICES = ["iphone", "android", "laptop", "phone"];
const CLASSES = ["phone", "laptop"];
const FIELDS = [
  ["subject", (v) => /^S[1-9]$/.test(v)],
  ["device", (v) => DEVICES.includes(v)],
  ["browser", (v) => ["safari", "chrome", "firefox", "edge", "other"].includes(v)],
  ["measurement", (v) => MEASUREMENTS.includes(v)],
  ["repeat", (v) => /^[1-9]$/.test(v)],
  ["tape1_cm", (v) => NUM.test(v)],
  ["tape2_cm", (v) => NUM.test(v)],
  ["scan_cm", (v) => NUM.test(v)],
  ["notes", (v) => !/[,\n]/.test(v) && v.length <= 80 && !MEDIA.test(v)],
];

/** Parse and strictly validate study readings. Row numbers are file line numbers (header is line 1). */
export function parseStudyReadings(text) {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const first = lines.findIndex((l) => l.trim() !== "");
  if (first < 0 || lines[first] !== HEADER) {
    throw new Error(`Wrong header. Expected: ${HEADER}`);
  }
  const rows = [];
  for (let i = first + 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    const parts = lines[i].split(",");
    const rowNo = i + 1;
    if (parts.length !== FIELDS.length) {
      throw new Error(`Row ${rowNo}: expected ${FIELDS.length} fields, found ${parts.length}`);
    }
    FIELDS.forEach(([name, ok], k) => {
      if (!ok(parts[k])) throw new Error(`Row ${rowNo}: invalid ${name}`);
    });
    const [subject, device, browser, measurement, repeat, t1, t2, sc, notes] = parts;
    rows.push({
      subject, device, browser, measurement, repeat: Number(repeat),
      tape1: Number(t1), tape2: Number(t2), scan: Number(sc), notes,
    });
  }
  return rows;
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
function median(a) {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const inClass = (device, cellDevice) =>
  cellDevice === "phone" ? device === "iphone" || device === "android" : device === cellDevice;

function subjectValues(rows) {
  const bySubject = new Map();
  for (const r of rows) {
    if (!bySubject.has(r.subject)) bySubject.set(r.subject, []);
    bySubject.get(r.subject).push(r);
  }
  return [...bySubject.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([subject, rs]) => {
    const tape = mean(rs.flatMap((r) => [r.tape1, r.tape2]));
    const scans = rs.map((r) => r.scan);
    const scan = median(scans);
    return { subject, tape, scan, error: scan - tape, range: Math.max(...scans) - Math.min(...scans) };
  });
}

function makeCell(measurement, device, rows) {
  const subjects = subjectValues(rows.filter((r) => r.measurement === measurement && inClass(r.device, device)));
  const n = subjects.length;
  const base = { measurement, device, n, subjects: subjects.map((s) => s.subject), values: subjects };
  if (n === 0) return { ...base, mae: null, maxAbs: null, meanSigned: null, maxRepeatRange: null };
  const abs = subjects.map((s) => Math.abs(s.error));
  return {
    ...base,
    mae: mean(abs),
    maxAbs: Math.max(...abs),
    meanSigned: mean(subjects.map((s) => s.error)),
    maxRepeatRange: Math.max(...subjects.map((s) => s.range)),
  };
}

const chart = CATALOG[0].chart;
function sizesAgree(tapeChest, scanChest) {
  const t = recommendSize(tapeChest, "regular", chart);
  const s = recommendSize(scanChest, "regular", chart);
  return s.label === t.label || (s.borderline && s.neighbour === t.label);
}

function verdict(n, met) {
  if (n < MIN_SUBJECTS) return "INSUFFICIENT DATA";
  return met ? "MET" : "NOT MET";
}

/** Build the per-measurement, per-device error table, the class targets and the overall outcome. */
export function analyseStudy(rows) {
  const subjects = [...new Set(rows.map((r) => r.subject))].sort();
  const cells = [];
  for (const m of MEASUREMENTS) for (const d of CELL_DEVICES) cells.push(makeCell(m, d, rows));
  const find = (m, d) => cells.find((c) => c.measurement === m && c.device === d);

  const targets = {};
  for (const cls of CLASSES) {
    const sh = find("shoulder", cls);
    const ch = find("chest", cls);
    targets[cls] = {
      shoulder: verdict(sh.n, sh.mae !== null && sh.mae <= TARGETS.shoulderMaeCm),
      chest: verdict(ch.n, ch.mae !== null && ch.mae <= TARGETS.chestMaeCm),
      sizeAgreement: verdict(ch.n, ch.values.every((v) => sizesAgree(v.tape, v.scan))),
    };
  }

  const all = CLASSES.flatMap((c) => Object.values(targets[c]));
  let overall;
  if (all.includes("INSUFFICIENT DATA")) overall = "INSUFFICIENT DATA";
  else if (all.every((v) => v === "MET")) overall = "GO";
  else if (CLASSES.some((c) => Object.values(targets[c]).every((v) => v === "MET"))) overall = "CONDITIONAL";
  else overall = "NO-GO";

  return { subjects, cells, targets, overall };
}

const num = (v) => (v === null ? "no data" : v.toFixed(2));

/** Render the analysis as the STUDY-RESULTS.md text. */
export function renderMarkdown(result) {
  const ids = result.subjects.length ? result.subjects.join(", ") : "none";
  const out = [
    "# Phase 5 study results",
    "",
    "Generated by node validation/study.mjs --write. Do not edit by hand.",
    "",
    `Everyday clothes, team members only, ${result.subjects.length} subjects (${ids})`,
    "",
    "Error = scan median minus tape mean, per subject. Phone = iphone plus android. Waist, torso and arm are estimates with no target.",
    "",
    "| Measurement | Device | n | Subjects | Mean abs error (cm) | Max error (cm) | Mean signed (cm) | Max repeat range (cm) |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const c of result.cells) {
    const subs = c.n ? c.subjects.join(", ") : "no data";
    out.push(`| ${c.measurement} | ${c.device} | ${c.n} | ${subs} | ${num(c.mae)} | ${num(c.maxAbs)} | ${num(c.meanSigned)} | ${num(c.maxRepeatRange)} |`);
  }
  out.push(
    "",
    "## Targets",
    "",
    `Shoulder mean abs error <= ${TARGETS.shoulderMaeCm.toFixed(2)} cm, chest mean abs error <= ${TARGETS.chestMaeCm.toFixed(2)} cm, size agreement for every subject (regular cut, ${CATALOG[0].name}). At least ${MIN_SUBJECTS} subjects per device class.`,
    "",
    "| Class | Shoulder | Chest | Size agreement |",
    "|---|---|---|---|",
  );
  for (const cls of CLASSES) {
    const t = result.targets[cls];
    out.push(`| ${cls} | ${t.shoulder} | ${t.chest} | ${t.sizeAgreement} |`);
  }
  out.push("", `Overall outcome: ${result.overall}`);
  return out.join("\n");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = args.find((a) => !a.startsWith("--")) || path.join(here, "study-readings.csv");
  try {
    const rows = parseStudyReadings(readFileSync(file, "utf8"));
    if (args.includes("--check")) console.log(`OK: ${rows.length} rows`);
    else {
      const md = renderMarkdown(analyseStudy(rows));
      if (args.includes("--write")) {
        const target = path.join(here, "STUDY-RESULTS.md");
        writeFileSync(target, md + "\n");
        console.log(`Wrote ${target}`);
      } else console.log(md);
    }
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
}
