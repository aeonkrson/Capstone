import { test } from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en.js";
import id from "../src/i18n/id.js";
import { resolveLocale, initLocale, setLocale, getLocale, t, formatNumber } from "../src/i18n/index.js";

const EXPECTED_KEYS = [
  "app.title",
  "height.title",
  "height.intro",
  "height.label",
  "height.placeholder",
  "height.submit",
  "height.change",
  "height.current",
  "height.error.empty",
  "height.error.not-a-number",
  "height.error.too-low",
  "height.error.too-high",
  "camera.privacy-note",
  "camera.loading.title",
  "camera.loading.body",
  "camera.status.starting",
  "camera.status.searching",
  "camera.status.detected",
  "camera.status.stopped",
  "camera.stop",
  "camera.start",
  "camera.retry",
  "camera.error.title",
  "camera.error.denied",
  "camera.error.no-camera",
  "camera.error.busy",
  "camera.error.overconstrained",
  "camera.error.insecure-context",
  "camera.error.unknown",
  "engine.error.title",
  "engine.error.load-failed",
  "debug.title",
  "debug.clothing-note",
  "debug.toggle.skeleton",
  "debug.toggle.mask",
  "debug.toggle.mirror",
  "debug.live.title",
  "debug.captured.title",
  "debug.capture.front",
  "debug.capture.side",
  "debug.capture.reset",
  "debug.capture.countdown",
  "debug.capture.collecting",
  "debug.capture.done",
  "debug.capture.failed",
  "debug.reading.shoulder",
  "debug.reading.bust-extent",
  "debug.reading.bust-width",
  "debug.reading.bust-depth",
  "debug.reading.bust",
  "debug.reading.value",
  "debug.reading.spread",
  "debug.reading.none",
  "debug.reading.arms-merged",
  "debug.reading.unavailable.no-pose",
  "debug.reading.unavailable.no-mask",
  "debug.reading.unavailable.body-touches-edge",
  "debug.reading.unavailable.low-visibility",
  "debug.reading.unavailable.no-torso-run",
  "debug.reading.unavailable.burst-too-few",
  "scan.summary",
  "scan.capture.title",
  "scan.capture.intro",
  "scan.view.front",
  "scan.view.side",
  "scan.view.empty",
  "scan.view.ok",
  "scan.view.rejected",
  "scan.reason.no-pose",
  "scan.reason.no-mask",
  "scan.reason.not-full-body",
  "scan.reason.too-close",
  "scan.reason.too-far",
  "scan.reason.low-visibility",
  "scan.reason.wrong-side",
  "scan.reason.tilted",
  "scan.reason.arms-against-body",
  "scan.reason.moving",
  "scan.reason.no-torso-run",
  "scan.reason.no-waist-run",
  "scan.reason.body-touches-edge",
  "scan.reason.burst-too-few",
  "scan.reason.aborted",
  "scan.manual.note",
  "consent.title",
  "consent.use",
  "consent.saved",
  "consent.sound",
  "consent.accept",
  "consent.decline",
  "guide.front",
  "guide.side",
  "guide.hold",
  "guide.capturing",
  "guide.turn",
  "guide.done",
  "guide.restart",
  "guide.manual-mode",
  "manual.go",
  "manual.routed",
  "manual.declined",
  "review.title",
  "review.intro",
  "review.name.label",
  "review.source.scanned",
  "review.source.edited",
  "review.source.missing",
  "review.marker",
  "review.marker-estimate",
  "review.save",
  "review.saved",
  "settings.title",
  "settings.language",
  "settings.delete",
  "settings.delete.confirm",
  "settings.deleted",
  "profile.title",
  "profile.intro",
  "profile.name.label",
  "profile.name.submit",
  "profile.name.error.empty",
  "profile.name.error.too-long",
  "profile.current",
  "body.title",
  "body.intro",
  "body.chest.label",
  "body.shoulder.label",
  "body.torso.label",
"body.waist.label",
"body.arm.label",
"body.source.scanned",
"body.source.scanned-estimate",
  "body.chest.help",
  "body.shoulder.help",
  "body.torso.help",
  "body.save",
  "body.saved",
  "body.error.empty",
  "body.error.not-a-number",
  "body.error.too-low",
  "body.error.too-high",
  "body.source.typed",
  "body.source.edited",
  "body.source.line",
  "catalog.title",
  "catalog.select",
  "catalog.selected",
  "catalog.cut",
  "cut.regular",
  "cut.loose",
  "cut.oversize",
  "chart.title",
  "chart.col.size",
  "chart.col.chest",
  "chart.col.shoulder",
  "chart.col.length",
  "chart.note",
  "fit.title",
  "fit.need-measurements",
  "fit.size.label",
  "fit.pref.legend",
  "fit.pref.regular",
  "fit.pref.loose",
  "fit.pref.oversize",
  "fit.check",
  "verdict.fits",
  "verdict.borderline",
  "verdict.too-small",
  "verdict.too-large",
  "fit.recommended",
  "fit.recommended.between",
  "fit.recommended.none",
  "area.chest",
  "area.shoulder",
  "area.length",
  "status.tight",
  "status.ok",
  "status.loose",
  "area.line",
  "area.line.borderline",
  "compare.title",
  "compare.col.pref",
  "compare.col.size",
  "compare.cell.between",
  "compare.cell.none",
  "history.title",
  "history.empty",
  "history.entry",
];

const params = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("dictionary has the expected keys in both languages", () => {
  assert.deepEqual(Object.keys(en).sort(), [...EXPECTED_KEYS].sort());
  assert.deepEqual(Object.keys(id).sort(), [...EXPECTED_KEYS].sort());
});

test("key sets are identical", () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(id).sort());
});

test("parameter names match for every key", () => {
  for (const key of Object.keys(en)) {
    assert.deepEqual(params(id[key]), params(en[key]), `params differ for ${key}`);
  }
});

test("no value is empty", () => {
  for (const dict of [en, id]) {
    for (const [key, value] of Object.entries(dict)) {
      assert.notEqual(String(value).trim(), "", `empty value for ${key}`);
    }
  }
});

test("resolveLocale", () => {
  for (const tag of ["id", "id-ID", "in", "in-ID"]) assert.equal(resolveLocale(tag), "id");
  for (const tag of ["en-US", "ms-MY", undefined]) assert.equal(resolveLocale(tag), "en");
});

test("t translates, interpolates and falls back to the key", () => {
  initLocale("id-ID");
  const text = t("height.error.too-low", { min: 120 });
  assert.ok(text.includes("120"));
  assert.notEqual(text, en["height.error.too-low"].replace("{min}", "120"));
  assert.equal(t("missing.key"), "missing.key");
});

test("formatNumber follows the locale", () => {
  initLocale("id");
  assert.equal(formatNumber(72.5), "72,5");
  initLocale("en-US");
  assert.equal(formatNumber(72.5), "72.5");
});

test("setLocale switches at runtime and rejects unsupported locales", () => {
  initLocale("en-US");
  assert.equal(setLocale("id"), true);
  assert.equal(getLocale(), "id");
  assert.equal(setLocale("fr"), false);
  assert.equal(getLocale(), "id");
  assert.equal(setLocale(undefined), false);
  assert.equal(setLocale("en"), true);
  assert.equal(getLocale(), "en");
});
