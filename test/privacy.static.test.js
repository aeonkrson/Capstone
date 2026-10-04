// PRIV-02 static guard over src/ and index.html.
// Phase 2 will add src/platform/storage.js; allow localStorage in that one file only, then.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".js")) out.push(full);
  }
  return out;
}

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const FORBIDDEN = [
  "localStorage", "sessionStorage", "indexedDB", "document.cookie", "caches.",
  "fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket", "EventSource",
  "toDataURL", "toBlob", "MediaRecorder", "captureStream",
  "innerHTML", "outerHTML", "insertAdjacentHTML", "document.write",
  "http://", "https://", "import.meta.env",
];

test("src/ uses no network, storage, export or HTML-injection API", () => {
  for (const file of walk(SRC)) {
    const code = stripComments(readFileSync(file, "utf8"));
    for (const word of FORBIDDEN) {
      assert.ok(!code.includes(word), `${path.relative(ROOT, file)} contains ${word}`);
    }
  }
});

test("src/ imports are relative only", () => {
  const re = /(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s*["']([^"']+)["']/g;
  for (const file of walk(SRC)) {
    const code = stripComments(readFileSync(file, "utf8"));
    for (const m of code.matchAll(re)) {
      const spec = m[1] || m[2] || m[3];
      assert.ok(spec.startsWith("./") || spec.startsWith("../"), `${path.relative(ROOT, file)} imports ${spec}`);
    }
  }
});

const html = readFileSync(path.join(ROOT, "index.html"), "utf8");

test("index.html has one script tag and no inline style", () => {
  assert.ok((html.match(/<script/g) || []).length <= 1, "more than one <script tag");
  assert.ok(!html.includes('style="'), "inline style attribute found");
});

test("index.html keeps a strict Content-Security-Policy", () => {
  const m = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/);
  assert.ok(m, "CSP meta tag missing");
  const csp = m[1];
  assert.ok(csp.includes("connect-src 'self'"), "connect-src 'self' missing");
  assert.ok(csp.includes("script-src 'self' 'wasm-unsafe-eval'"), "script-src missing");
  const rest = csp.replace(/'wasm-unsafe-eval'/g, "");
  assert.ok(!rest.includes("'unsafe-inline'"), "unsafe-inline present");
  assert.ok(!rest.includes("'unsafe-eval'"), "unsafe-eval present");
});

test("index.html has no absolute URL", () => {
  assert.ok(!html.includes("http://") && !html.includes("https://"), "absolute URL in index.html");
});
