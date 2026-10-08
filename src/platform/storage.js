// The only module allowed to touch browser storage. Stores the sanitised state and the locale code, nothing else.
import { emptyState, sanitiseState } from "../core/profileState.js";

const STATE_KEY = "sfs.state.v1";
const LOCALE_KEY = "sfs.locale";
const LOCALES = ["en", "id"];

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

/**
 * Build a storage API over a localStorage-like object.
 * @param {{ getItem: Function, setItem: Function, removeItem: Function }} storageObj - backing store
 * @returns {{ loadState: Function, saveState: Function, clearAll: Function, loadLocale: Function, saveLocale: Function }}
 */
export function createStorage(storageObj) {
  const store = storageObj;

  function loadState() {
    try {
      const text = store.getItem(STATE_KEY);
      if (text === null || text === undefined) return emptyState();
      return sanitiseState(JSON.parse(text));
    } catch (err) {
      return emptyState();
    }
  }

  function saveState(state) {
    try {
      store.setItem(STATE_KEY, JSON.stringify(sanitiseState(state)));
      return true;
    } catch (err) {
      return false;
    }
  }

  function loadLocale() {
    try {
      const value = store.getItem(LOCALE_KEY);
      return LOCALES.includes(value) ? value : null;
    } catch (err) {
      return null;
    }
  }

  function saveLocale(tag) {
    if (!LOCALES.includes(tag)) return false;
    try {
      store.setItem(LOCALE_KEY, tag);
      return true;
    } catch (err) {
      return false;
    }
  }

  function clearAll() {
    let ok = true;
    for (const key of [STATE_KEY, LOCALE_KEY]) {
      try {
        store.removeItem(key);
      } catch (err) {
        ok = false;
      }
    }
    return ok;
  }

  return { loadState, saveState, clearAll, loadLocale, saveLocale };
}

function defaultBacking() {
  try {
    const backing = globalThis.localStorage;
    if (backing && typeof backing.getItem === "function") return backing;
  } catch (err) {
    // blocked storage: fall through to memory
  }
  return memoryStorage();
}

const instance = createStorage(defaultBacking());

export const loadState = instance.loadState;
export const saveState = instance.saveState;
export const clearAll = instance.clearAll;
export const loadLocale = instance.loadLocale;
export const saveLocale = instance.saveLocale;
