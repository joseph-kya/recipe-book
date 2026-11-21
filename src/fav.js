// Per-recipe favorites and "baked it" tap counter persisted in localStorage.
// Pure JS (no React import) so unit tests and Contents sorting can share it cleanly.
// localStorage is the source of truth; optional cloud sync (src/auth/) merges
// through getFavState()/applyFavState(). Two tiny timestamp maps make that
// merge respect intent: favAt = when a heart was last toggled (on or off),
// resetAt = when a count last went *down* (reset, undo, hold-to-undo).

export const FAV_KEY = 'recipe-book:fav:v1';
const MAX_BAKED = 999;

const favorites = new Set();
const bakedCounts = new Map();
const favAt = new Map();
const resetAt = new Map();
const listeners = new Set();
let lastStamp = 0;

// Strictly increasing wall-clock stamp so two edits in one ms still order.
function stamp() {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function validSlug(slug) {
  return typeof slug === 'string' && slug.trim().length > 0;
}

function clampCount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_BAKED, Math.floor(value)));
}

function validStamp(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function readStamps(source, into) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return;
  for (const [slug, at] of Object.entries(source)) {
    const t = validStamp(at);
    if (validSlug(slug) && t) into.set(slug, t);
  }
}

function clearAll() {
  favorites.clear();
  bakedCounts.clear();
  favAt.clear();
  resetAt.clear();
}

export function reloadFav(storage = defaultStorage()) {
  clearAll();
  try {
    const raw = storage?.getItem(FAV_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;

    if (Array.isArray(parsed.favs)) {
      for (const slug of parsed.favs) {
        if (validSlug(slug)) favorites.add(slug);
      }
    }

    if (parsed.baked && typeof parsed.baked === 'object' && !Array.isArray(parsed.baked)) {
      for (const [slug, count] of Object.entries(parsed.baked)) {
        if (!validSlug(slug)) continue;
        const n = clampCount(count);
        if (n > 0) bakedCounts.set(slug, n);
      }
    }
    readStamps(parsed.favAt, favAt);
    readStamps(parsed.resetAt, resetAt);
    for (const t of [...favAt.values(), ...resetAt.values()]) lastStamp = Math.max(lastStamp, t);
  } catch {
    /* storage blocked or malformed: start clean in memory */
  }
}

function persistFav(storage = defaultStorage()) {
  try {
    if (!storage) return;
    const baked = {};
    for (const [slug, n] of bakedCounts) {
      if (n > 0) baked[slug] = n;
    }
    const data = { favs: [...favorites], baked };
    if (favAt.size) data.favAt = Object.fromEntries(favAt);
    if (resetAt.size) data.resetAt = Object.fromEntries(resetAt);
    storage.setItem(FAV_KEY, JSON.stringify(data));
  } catch {
    /* storage blocked: state still works for this visit */
  }
}

function notify(slug) {
  for (const fn of listeners) fn(slug);
}

export function subscribeFav(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isFavorite(slug) {
  return validSlug(slug) && favorites.has(slug);
}

export function getBakedCount(slug) {
  return validSlug(slug) ? bakedCounts.get(slug) || 0 : 0;
}

export function toggleFavorite(slug, storage = defaultStorage()) {
  if (!validSlug(slug)) return false;
  const next = !favorites.has(slug);
  if (next) favorites.add(slug);
  else favorites.delete(slug);
  favAt.set(slug, stamp());
  persistFav(storage);
  notify(slug);
  return next;
}

export function incrementBaked(slug, storage = defaultStorage()) {
  if (!validSlug(slug)) return 0;
  const next = Math.min(MAX_BAKED, (bakedCounts.get(slug) || 0) + 1);
  bakedCounts.set(slug, next);
  persistFav(storage);
  notify(slug);
  return next;
}

export function decrementBaked(slug, storage = defaultStorage()) {
  if (!validSlug(slug)) return 0;
  const cur = bakedCounts.get(slug) || 0;
  if (cur <= 0) return 0;
  return setBakedCount(slug, cur - 1, storage);
}

// Set a count directly (reset to 0, or undo a reset). Any explicit set counts
// as a deliberate edit, so it stamps resetAt and wins over older cloud counts.
export function setBakedCount(slug, count, storage = defaultStorage()) {
  if (!validSlug(slug)) return 0;
  const next = clampCount(count);
  if (next > 0) bakedCounts.set(slug, next);
  else bakedCounts.delete(slug);
  resetAt.set(slug, stamp());
  persistFav(storage);
  notify(slug);
  return next;
}

// Clear a recipe's "baked it" count; returns the previous count for undo.
export function resetBaked(slug, storage = defaultStorage()) {
  const prev = getBakedCount(slug);
  if (prev > 0) setBakedCount(slug, 0, storage);
  return prev;
}

// Plain snapshot for cloud sync / merging (see src/auth/merge.js).
export function getFavState() {
  return {
    favs: [...favorites],
    favAt: Object.fromEntries(favAt),
    baked: Object.fromEntries(bakedCounts),
    resetAt: Object.fromEntries(resetAt),
  };
}

// Replace everything with a (merged) state, persist, and refresh all views.
export function applyFavState(state, storage = defaultStorage()) {
  clearAll();
  const src = state && typeof state === 'object' ? state : {};
  if (Array.isArray(src.favs)) {
    for (const slug of src.favs) if (validSlug(slug)) favorites.add(slug);
  }
  if (src.baked && typeof src.baked === 'object') {
    for (const [slug, count] of Object.entries(src.baked)) {
      const n = clampCount(count);
      if (validSlug(slug) && n > 0) bakedCounts.set(slug, n);
    }
  }
  readStamps(src.favAt, favAt);
  readStamps(src.resetAt, resetAt);
  for (const t of [...favAt.values(), ...resetAt.values()]) lastStamp = Math.max(lastStamp, t);
  persistFav(storage);
  notify(null);
}

// Keep favorited recipes first while preserving relative order in both groups.
export function sortFavoritesFirst(entries) {
  if (!Array.isArray(entries) || entries.length < 2) return entries || [];
  const favs = [];
  const rest = [];
  for (const entry of entries) {
    const slug = entry?.recipe?.slug ?? entry?.slug;
    if (slug && favorites.has(slug)) favs.push(entry);
    else rest.push(entry);
  }
  return favs.length ? [...favs, ...rest] : entries;
}

reloadFav();
