import { test } from "node:test";
import assert from "node:assert/strict";
import { preflightIssues, PREFLIGHT_CODES } from "../../src/core/preflight.js";

test("all capabilities present gives no issues", () => {
  assert.deepEqual(preflightIssues({ secureContext: true, cameraApi: true, webAssembly: true }), []);
});

test("each missing capability adds its code in fixed order", () => {
  assert.deepEqual(preflightIssues({ secureContext: false, cameraApi: true, webAssembly: true }), ["insecure-context"]);
  assert.deepEqual(preflightIssues({ secureContext: true, cameraApi: false, webAssembly: true }), ["no-camera-api"]);
  assert.deepEqual(preflightIssues({ secureContext: true, cameraApi: true, webAssembly: false }), ["no-webassembly"]);
  assert.deepEqual(
    preflightIssues({ webAssembly: false, cameraApi: false, secureContext: false }),
    ["insecure-context", "no-camera-api", "no-webassembly"],
  );
});

test("missing or non-boolean input counts as false", () => {
  assert.deepEqual(preflightIssues(), [...PREFLIGHT_CODES]);
  assert.deepEqual(preflightIssues(null), [...PREFLIGHT_CODES]);
  assert.deepEqual(preflightIssues({ secureContext: "yes", cameraApi: 1, webAssembly: true }), ["insecure-context", "no-camera-api"]);
});

test("PREFLIGHT_CODES is a frozen list of the three codes", () => {
  assert.deepEqual([...PREFLIGHT_CODES], ["insecure-context", "no-camera-api", "no-webassembly"]);
  assert.ok(Object.isFrozen(PREFLIGHT_CODES));
});
