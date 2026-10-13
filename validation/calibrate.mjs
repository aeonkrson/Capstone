// Phase 3 readings: repeatability, tape error and suggested calibration offsets (P3-D21, P3-D23).
// Usage: node validation/calibrate.mjs [path]
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const HEADER = "subject,device,clothing,measurement,repeat,tape1_cm,tape2_cm,scan_raw_cm,scan_cm,notes";
const NUM = /^\d+(\.\d+)?$/;
const FIELDS = [
  ["subject", (v) => /^S[1-9]$/.test(v)],
  ["device", (v) => v === "phone" || v === "laptop"],
  ["clothing", (v) => v === "everyday"],
  ["measurement", (v) => ["shoulder", "chest", "waist", "torso", "arm"].includes(v)],
  ["repeat", (v) => /^[1-9]$/.test(v)],
  ["tape1_cm", (v) => NUM.test(v)],
  ["tape2_cm", (v) => NUM.test(v)],
  ["scan_raw_cm", (v) => NUM.test(v)],
  ["scan_cm", (v) => NUM.test(v)],
  ["notes", (v) => !/[,\n]/.test(v)],
];

// Measurement name in the CSV -> key in src/core/calibration.js
export const CALIBRATION_KEY = {
  shoulder: "shoulderCm", chest: "chestCm", waist: "waistCm", torso: "torsoCm", arm: "armCm",
};
export const REPEAT_TARGET_CM = 1.0;

/** Parse and strictly validate Phase 3 readings. Row numbers are file line numbers (header is line 1). */
export function parsePhase3Readings(text) {
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
    const [subject, device, clothing, measurement, repeat, t1, t2, raw, sc, notes] = parts;
    rows.push({
      subject, device, clothing, measurement, repeat: Number(repeat),
      tape1: Number(t1), tape2: Number(t2), scanRaw: Number(raw), scan: Number(sc), notes,
    });
  }
  return rows;
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const by = (a, key) => a.reduce((m, r) => ((m[key(r)] ||= []).push(r), m), {});

/**
 * Per device and measurement: subject count, mean signed raw error, scan_cm error, repeat ranges,
 * and the suggested offset (null with fewer than 2 subjects).
 */
export function analyse(rows) {
  const order = Object.keys(CALIBRATION_KEY);
  const groups = Object.entries(by(rows, (r) => `${r.device}|${r.measurement}`)).map(([k, rs]) => {
    const [device, measurement] = k.split("|");
    const subjects = Object.entries(by(rs, (r) => r.subject)).sort(([a], [b]) => a.localeCompare(b))
      .map(([subject, srs]) => {
        const tape = mean(srs.flatMap((r) => [r.tape1, r.tape2]));
        const scans = srs.map((r) => r.scan);
        return {
          subject, tape,
          rawError: mean(srs.map((r) => r.scanRaw)) - tape,
          scanError: mean(scans) - tape,
          range: Math.max(...scans) - Math.min(...scans),
        };
      });
    const n = subjects.length;
    const meanSignedRawErrorCm = mean(subjects.map((s) => s.rawError));
    const abs = subjects.map((s) => Math.abs(s.scanError));
    return {
      device, measurement, n,
      meanSignedRawErrorCm,
      maeScanCm: mean(abs),
      maxAbsScanCm: Math.max(...abs),
      repeatRanges: subjects.map((s) => ({ subject: s.subject, range: s.range })),
      subjects,
      suggestedOffsetCm: n >= 2 ? -meanSignedRawErrorCm : null,
    };
  });
  return groups.sort((a, b) =>
    order.indexOf(a.measurement) - order.indexOf(b.measurement) || a.device.localeCompare(b.device));
}

const f1 = (v) => (v === null ? "n/a" : v.toFixed(2));

function printReport(groups) {
  if (groups.length === 0) return "No data rows yet (no data): calibration stays prior.";
  const out = [];
  for (const g of groups) {
    const worst = Math.max(...g.repeatRanges.map((r) => r.range));
    out.push(
      `${g.measurement} (${g.device}): ${g.n} subject(s), mean signed raw error ${f1(g.meanSignedRawErrorCm)}, ` +
      `scan MAE ${f1(g.maeScanCm)}, max ${f1(g.maxAbsScanCm)}, ` +
      `repeat range ${g.repeatRanges.map((r) => `${r.subject} ${f1(r.range)}`).join(" ")} ` +
      `(${worst <= REPEAT_TARGET_CM ? "within" : "over"} ${REPEAT_TARGET_CM.toFixed(1)} cm target)`,
    );
  }
  out.push("", "Suggested CALIBRATION offsets (apply by hand with source \"fitted\"):");
  for (const m of Object.keys(CALIBRATION_KEY)) {
    const gs = groups.filter((g) => g.measurement === m);
    const subs = new Set(gs.flatMap((g) => g.subjects.map((s) => s.subject)));
    if (gs.length === 0 || subs.size < 2) {
      out.push(`  ${CALIBRATION_KEY[m]}: keep prior (fewer than 2 subjects)`);
      continue;
    }
    const all = gs.flatMap((g) => g.subjects.map((s) => s.rawError));
    out.push(`  ${CALIBRATION_KEY[m]}: offsetCm ${f1(-mean(all))} (${subs.size} subjects)`);
  }
  return out.join("\n");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const file = process.argv.slice(2).find((a) => !a.startsWith("--")) ||
    path.join(path.dirname(fileURLToPath(import.meta.url)), "phase3-readings.csv");
  try {
    console.log(printReport(analyse(parsePhase3Readings(readFileSync(file, "utf8")))));
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
}
