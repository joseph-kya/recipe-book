// Per-recipe favorites and "baked it" tap counter persisted in localStorage.
// Pure JS (no React import) so unit tests and Contents sorting can share it cleanly.

export const FAV_KEY = 'recipe-book:fav:v1';
const MAX_BAKED = 999;

const favorites = new Set();
const bakedCounts = new Map();
const listeners = new Set();

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

export function reloadFav(storage = defaultStorage()) {
  favorites.clear();
  bakedCounts.clear();
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
    storage.setItem(FAV_KEY, JSON.stringify({ favs: [...favorites], baked }));
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
  const next = cur - 1;
  if (next > 0) bakedCounts.set(slug, next);
  else bakedCounts.delete(slug);
  persistFav(storage);
  notify(slug);
  return next;
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
