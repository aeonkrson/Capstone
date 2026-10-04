// src/core must stay pure: no browser globals, no clock, no imports from outer layers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORE = path.join(ROOT, "src", "core");

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

const WORDS = ["document", "window", "navigator", "localStorage", "performance"];
const BAD_IMPORT = /(?:from\s*|import\s*\(?\s*)["'][^"']*\/(?:platform|ui|app|i18n)\/[^"']*["']/;

test("src/core uses no browser globals, clock or outer-layer imports", () => {
  for (const file of walk(CORE)) {
    const code = stripComments(readFileSync(file, "utf8"));
    const rel = path.relative(ROOT, file);
    for (const word of WORDS) {
      assert.ok(!new RegExp(`\\b${word}\\b`).test(code), `${rel} uses ${word}`);
    }
    assert.ok(!code.includes("Date.now"), `${rel} uses Date.now`);
    assert.ok(!BAD_IMPORT.test(code), `${rel} imports an outer layer`);
  }
});
