// Photos and videos never enter git (D-07, T-05-14).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MEDIA = /\.(png|jpe?g|heic|webp|gif|mp4|mov|webm)$/i;

function trackedFiles() {
  try {
    return execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch (err) {
    return null;
  }
}

test("git tracks no image or video file", (t) => {
  const files = trackedFiles();
  if (files === null) {
    t.skip("git is not available");
    return;
  }
  const media = files.filter((f) => MEDIA.test(f));
  assert.deepEqual(media, []);
});

test(".gitignore blocks body photos and demo videos", () => {
  const lines = readFileSync(path.join(ROOT, ".gitignore"), "utf8")
    .split("\n")
    .map((l) => l.trim());
  for (const pattern of ["recordings/", "*.heic", "*.mp4", "*.mov", "*.webm", "validation/private/"]) {
    assert.ok(lines.includes(pattern), `missing .gitignore line: ${pattern}`);
  }
});
