// Error and size-agreement report. Applies validation/PASS-CRITERIA.md exactly.
// Usage: node validation/report.mjs [path] [--check]
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { sizeFromBust, sizesAgree, MIN_EASE_CM, BORDERLINE_BAND_CM } from "../src/core/sizeFromTape.js";
import { PLAIN_TEE } from "../src/data/colourboxCharts.js";

const HEADER = "subject,device,clothing,measurement,repeat,tape1_cm,tape2_cm,scan_cm,model_variant,delegate,notes";
const NUM = /^\d+(\.\d+)?$/;
const FIELDS = [
  ["subject", (v) => /^S[1-9]$/.test(v)],
  ["device", (v) => v === "phone" || v === "laptop"],
  ["clothing", (v) => v === "everyday"],
  ["measurement", (v) => v === "shoulder" || v === "bust"],
  ["repeat", (v) => /^[1-9]$/.test(v)],
  ["tape1_cm", (v) => NUM.test(v)],
  ["tape2_cm", (v) => NUM.test(v)],
  ["scan_cm", (v) => NUM.test(v)],
  ["model_variant", (v) => v === "full" || v === "heavy"],
  ["delegate", (v) => v === "CPU" || v === "GPU"],
  ["notes", (v) => !/[,\n]/.test(v)],
];

/** Parse and strictly validate readings text. Row numbers are file line numbers (header is line 1). */
export function parseReadings(text) {
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
    const [subject, device, clothing, measurement, repeat, t1, t2, sc, model, delegate, notes] = parts;
    rows.push({
      subject, device, clothing, measurement, repeat: Number(repeat),
      tape1: Number(t1), tape2: Number(t2), scan: Number(sc),
      model, delegate, notes,
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
const by = (a, key) => a.reduce((m, r) => ((m[key(r)] ||= []).push(r), m), {});

function subjectStats(rows) {
  const taped = rows.flatMap((r) => [r.tape1, r.tape2]);
  const scans = rows.map((r) => r.scan);
  const tape = mean(taped);
  const scan = median(scans);
  return {
    tape, scan, error: scan - tape,
    range: Math.max(...scans) - Math.min(...scans),
    tapeDisagree: rows.some((r) => Math.abs(r.tape1 - r.tape2) > 2.0),
  };
}

function shoulderGroup(rows) {
  const subjects = Object.entries(by(rows, (r) => r.subject)).sort(([a], [b]) => a.localeCompare(b))
    .map(([subject, rs]) => ({ subject, ...subjectStats(rs) }));
  if (subjects.length === 0) return { subjects, mae: null, max: null, meanSigned: null, verdict: "FAIL" };
  const abs = subjects.map((s) => Math.abs(s.error));
  const mae = mean(abs);
  const max = Math.max(...abs);
  const meanSigned = mean(subjects.map((s) => s.error));
  let verdict = "FAIL";
  if (mae <= 2.5 && max <= 4.0) verdict = "PASS";
  else {
    const sameSign = subjects.every((s) => s.error < 0) || subjects.every((s) => s.error > 0);
    const residual = mean(subjects.map((s) => Math.abs(s.error - meanSigned)));
    if (sameSign && residual <= 2.5) verdict = "PASS-WITH-OFFSET";
  }
  return { subjects, mae, max, meanSigned, verdict };
}

function bustGroup(rows) {
  const subjects = Object.entries(by(rows, (r) => r.subject)).sort(([a], [b]) => a.localeCompare(b))
    .map(([subject, rs]) => {
      const st = subjectStats(rs);
      const t = sizeFromBust(st.tape, PLAIN_TEE);
      const s = sizeFromBust(st.scan, PLAIN_TEE);
      return {
        subject, ...st,
        tapeSize: t.label, scanSize: s.label,
        borderline: s.borderline, neighbour: s.neighbour,
        agreement: sizesAgree(t, s),
      };
    });
  const n = subjects.length;
  const agreeCount = subjects.filter((s) => s.agreement !== "disagree").length;
  return { subjects, agreeCount, n, verdict: n > 0 && agreeCount > n / 2 ? "PASS" : "FAIL" };
}

/** Group by device and model, apply the written criteria, then derive the overall outcome. */
export function summarise(rows) {
  const subjects = [...new Set(rows.map((r) => r.subject))].sort();
  const groups = Object.entries(by(rows, (r) => `${r.device}|${r.model}`)).map(([k, rs]) => {
    const [device, model] = k.split("|");
    return {
      device, model,
      shoulder: shoulderGroup(rs.filter((r) => r.measurement === "shoulder")),
      bust: bustGroup(rs.filter((r) => r.measurement === "bust")),
    };
  });

  let overall;
  if (subjects.length < 2) overall = "INSUFFICIENT DATA";
  else {
    const full = (d) => groups.find((g) => g.device === d && g.model === "full");
    const devs = ["phone", "laptop"].map(full);
    const bustPass = devs.map((g) => !!g && g.bust.verdict === "PASS");
    const shoulderPass = devs.map((g) => !!g && g.shoulder.verdict === "PASS");
    if (bustPass.every(Boolean) && shoulderPass.every(Boolean)) overall = "GO";
    else if (bustPass.some(Boolean)) overall = "CONDITIONAL";
    else overall = "NO-GO";
  }

  const comparison = [];
  for (const device of ["phone", "laptop"]) {
    const f = groups.find((g) => g.device === device && g.model === "full");
    const h = groups.find((g) => g.device === device && g.model === "heavy");
    if (!f || !h) continue;
    const common = f.shoulder.subjects.filter((s) => h.shoulder.subjects.some((x) => x.subject === s.subject));
    if (common.length === 0) continue;
    const pick = (g) => g.shoulder.subjects.filter((s) => common.some((c) => c.subject === s.subject));
    const mae = (g) => mean(pick(g).map((s) => Math.abs(s.error)));
    comparison.push({
      device, subjects: common.map((s) => s.subject),
      shoulderMaeFull: mae(f), shoulderMaeHeavy: mae(h),
    });
  }
  return { subjects, groups, overall, comparison };
}

const f1 = (v) => (v === null ? "n/a" : v.toFixed(2));

function printReport(res) {
  const out = [];
  const ids = res.subjects.length ? res.subjects.join(", ") : "none";
  out.push(`Everyday clothes, ${res.subjects.length} subjects (${ids}), team members only`);
  out.push(`Size rule: smallest plain-tee size with garment bust >= bust + ${MIN_EASE_CM} cm, borderline band ${BORDERLINE_BAND_CM.toFixed(1)} cm`);
  if (res.groups.length === 0) out.push("No data rows yet.");
  for (const g of res.groups) {
    out.push("", `== ${g.device}, model ${g.model} ==`, "Shoulder (cm): subject, tape, scan, error, range");
    for (const s of g.shoulder.subjects) {
      out.push(`  ${s.subject}  ${f1(s.tape)}  ${f1(s.scan)}  ${f1(s.error)}  ${f1(s.range)}${s.tapeDisagree ? "  tape-disagree" : ""}`);
    }
    out.push(`  mean abs error ${f1(g.shoulder.mae)}, max ${f1(g.shoulder.max)}, mean signed ${f1(g.shoulder.meanSigned)}`);
    out.push(`  Shoulder verdict: ${g.shoulder.verdict}`);
    out.push("Bust (cm): subject, tape, tape size, scan, scan size, borderline, agreement, range");
    for (const s of g.bust.subjects) {
      const bl = s.borderline ? `borderline (neighbour ${s.neighbour})` : "not borderline";
      out.push(`  ${s.subject}  ${f1(s.tape)}  ${s.tapeSize}  ${f1(s.scan)}  ${s.scanSize}  ${bl}  ${s.agreement}  ${f1(s.range)}${s.tapeDisagree ? "  tape-disagree" : ""}`);
    }
    out.push(`  Size agreement ${g.bust.agreeCount} of ${g.bust.n}`);
    out.push(`  Bust verdict: ${g.bust.verdict}`);
  }
  for (const c of res.comparison) {
    out.push("", `full vs heavy, ${c.device} (${c.subjects.join(", ")}): shoulder mean abs error ${f1(c.shoulderMaeFull)} vs ${f1(c.shoulderMaeHeavy)}`);
  }
  out.push("", `Overall outcome: ${res.overall}`);
  return out.join("\n");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const file = args.find((a) => !a.startsWith("--")) ||
    path.join(path.dirname(fileURLToPath(import.meta.url)), "readings.csv");
  try {
    const rows = parseReadings(readFileSync(file, "utf8"));
    if (check) console.log(`OK: ${rows.length} rows`);
    else console.log(printReport(summarise(rows)));
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
}
