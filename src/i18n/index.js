import en from "./en.js";
import id from "./id.js";

// setLocale switches language at runtime; the choice is stored by src/platform/storage.js.
export const SUPPORTED_LOCALES = ["en", "id"];

const DICTIONARIES = { en, id };
const INTL_TAGS = { en: "en-US", id: "id-ID" };

let activeLocale = "en";

export function resolveLocale(languageTag) {
  const tag = String(languageTag || "").toLowerCase();
  if (/^(id|in)(-|$)/.test(tag)) return "id";
  return "en";
}

export function initLocale(languageTag) {
  activeLocale = resolveLocale(languageTag);
  return activeLocale;
}

export function setLocale(tag) {
  if (!SUPPORTED_LOCALES.includes(tag)) return false;
  activeLocale = tag;
  return true;
}

export function getLocale() {
  return activeLocale;
}

export function t(key, params) {
  let text = DICTIONARIES[activeLocale][key];
  if (text === undefined) text = DICTIONARIES.en[key];
  if (text === undefined) return key;
  if (params) {
    text = text.replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
    );
  }
  return text;
}

export function formatNumber(value, fractionDigits = 1) {
  return new Intl.NumberFormat(INTL_TAGS[activeLocale], {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function applyTranslations(root) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });
}
