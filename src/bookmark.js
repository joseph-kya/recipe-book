// Cookbook reading bookmark, printed page folios, and physical stack depths.
// Pure JS (no React import) so unit tests and Book chrome can share it cleanly.

export const BOOKMARK_KEY = 'recipe-book:bookmark:v1';

const ROMAN_FRONT = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

let currentBookmark = null;
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

function sanitizeOffset(offset) {
  if (typeof offset !== 'number' || !Number.isFinite(offset)) return 0;
  return Math.max(0, Math.floor(offset));
}

function sanitizeTimestamp(ts) {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts < 0) return 0;
  return Math.floor(ts);
}

function parseBookmark(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (!validSlug(parsed.slug)) return null;
    return {
      slug: parsed.slug.trim(),
      offset: sanitizeOffset(parsed.offset),
      updatedAt: sanitizeTimestamp(parsed.updatedAt),
    };
  } catch {
    return null;
  }
}

function notify() {
  for (const fn of listeners) fn(currentBookmark);
}

export function reloadBookmark(storage = defaultStorage()) {
  currentBookmark = null;
  try {
    const raw = storage?.getItem(BOOKMARK_KEY);
    currentBookmark = parseBookmark(raw);
  } catch {
    currentBookmark = null;
  }
  return currentBookmark;
}

export function getBookmark() {
  return currentBookmark;
}

export function setBookmark(slug, offset = 0, storage = defaultStorage(), now = Date.now) {
  if (!validSlug(slug)) return null;
  const cleanSlug = slug.trim();
  const cleanOffset = sanitizeOffset(offset);
  if (currentBookmark && currentBookmark.slug === cleanSlug && currentBookmark.offset === cleanOffset) {
    return currentBookmark;
  }
  const next = {
    slug: cleanSlug,
    offset: cleanOffset,
    updatedAt: sanitizeTimestamp(typeof now === 'function' ? now() : now),
  };
  currentBookmark = next;
  try {
    storage?.setItem(BOOKMARK_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: keep bookmark working in memory for this visit */
  }
  notify();
  return next;
}

export function clearBookmark(storage = defaultStorage()) {
  const had = currentBookmark !== null;
  currentBookmark = null;
  try {
    storage?.removeItem?.(BOOKMARK_KEY);
  } catch {
    /* storage blocked */
  }
  if (had) notify();
}

export function subscribeBookmark(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Resolve a saved bookmark back to the exact spread index in the current layout.
// Wide layouts restore the saved spread offset (clamped if pagination changed);
// narrow mobile layouts land on the recipe's single spread.
export function resolveBookmarkSpread(spreads, bookmark) {
  if (!Array.isArray(spreads) || !bookmark || !validSlug(bookmark.slug)) return -1;
  const targetSlug = bookmark.slug.trim();
  const first = spreads.findIndex((sp) => sp?.kind === 'recipe' && sp.recipe?.slug === targetSlug);
  if (first === -1) return -1;
  let count = 0;
  for (let i = first; i < spreads.length; i++) {
    if (spreads[i]?.kind === 'recipe' && spreads[i].recipe?.slug === targetSlug) count++;
    else break;
  }
  return first + Math.min(sanitizeOffset(bookmark.offset), Math.max(0, count - 1));
}

function romanFor(n) {
  return ROMAN_FRONT[n - 1] || String(n);
}

// Compute printed cookbook page numbers (folios) for every spread face.
// Cover stays unnumbered, Contents uses lowercase Roman front-matter (i / ii),
// and Recipes count sequentially from 1. Blank facing pages advance the leaf
// count silently without printing a number, just like a real hardcover book.
export function computePageFolios(spreads, wide) {
  if (!Array.isArray(spreads)) return [];
  let frontNum = 1;
  let recipeNum = 1;
  return spreads.map((sp) => {
    if (!sp || sp.kind === 'cover') return { L: null, R: null };
    if (sp.kind === 'contents') {
      if (wide) {
        const L = sp.L ? romanFor(frontNum++) : null;
        const R = sp.R ? romanFor(frontNum++) : null;
        return { L, R };
      }
      return { L: null, R: sp.R ? romanFor(frontNum++) : null };
    }
    if (wide) {
      let L = null;
      let R = null;
      if (sp.L) {
        const n = recipeNum++;
        if (sp.L.type !== 'blank') L = String(n);
      }
      if (sp.R) {
        const n = recipeNum++;
        if (sp.R.type !== 'blank') R = String(n);
      }
      return { L, R };
    }
    if (!sp.R || sp.R.type === 'blank') return { L: null, R: null };
    return { L: null, R: String(recipeNum++) };
  });
}

// Physical page-stack thickness (0..3) on the left and right outer edges of the
// open wide cookbook so the paper block shifts believably as you read through.
export function computeStackDepths(index, lastIndex) {
  const safeLast = Math.max(0, Math.floor(lastIndex || 0));
  const safeIdx = Math.max(0, Math.min(safeLast, Math.floor(index || 0)));
  if (safeIdx === 0) return { left: 0, right: safeLast > 0 ? 3 : 0 };
  if (safeLast <= 1) return { left: 1, right: 1 };
  const progress = safeIdx / safeLast;
  const left = progress >= 0.72 ? 3 : progress >= 0.34 ? 2 : 1;
  const right = safeIdx >= safeLast ? 1 : progress <= 0.28 ? 3 : progress <= 0.66 ? 2 : 1;
  return { left, right };
}

reloadBookmark();
