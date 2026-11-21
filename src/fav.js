// Per-recipe favorites and "baked it" tap counter persisted in localStorage,
// kept separately for each profile ("who's baking?") on this device.
// Pure JS (no React import) so unit tests and Contents sorting can share it cleanly.
// localStorage is the source of truth; optional cloud sync (src/auth/) merges
// through getBookState()/applyBookState(). Two tiny timestamp maps per profile
// make that merge respect intent: favAt = when a heart was last toggled (on or
// off), resetAt = when a count last went *down* (reset, undo, hold-to-undo).
//
// Stored under BOOK_KEY:
//   { v: 2, profiles: [{ id, name, color, n, at, favs, favAt, baked, resetAt }], gone: {id: ms} }
// n = created at (sort order), at = last rename, gone = deleted profile ids.
// The active profile is per device (ACTIVE_KEY) and never synced.

export const FAV_KEY = 'recipe-book:fav:v1'; // pre-profiles store: read once, then migrated
export const BOOK_KEY = 'recipe-book:fav:v2';
export const ACTIVE_KEY = 'recipe-book:profile';
export const MAIN_ID = 'main'; // the migrated default profile (same id on every device)
export const MAX_PROFILES = 6;
const AUTH_KEY = 'recipe-book:auth:v1'; // = PROFILE_KEY in auth/config.js (cached Google profile)
const MAX_BAKED = 999;
const ID_RE = /^[a-z0-9]{1,16}$/;

let book = [];
let gone = new Map();
let cur = null;
let view = null;
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

const isObj = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

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

// Trimmed, single-spaced, at most 24 characters (emoji-safe).
export function cleanName(name) {
  return typeof name === 'string' ? Array.from(name.replace(/\s+/g, ' ').trim()).slice(0, 24).join('').trim() : '';
}

function readStamps(source, into) {
  if (!isObj(source)) return;
  for (const [key, at] of Object.entries(source)) {
    const t = validStamp(at);
    if (validSlug(key) && t) {
      into.set(key, t);
      lastStamp = Math.max(lastStamp, t);
    }
  }
}

// One profile from (possibly legacy, hostile or cloud-merged) plain data.
function makeProfile(src, id = src?.id) {
  const s = isObj(src) ? src : {};
  const p = {
    id,
    name: cleanName(s.name),
    color: Math.min(5, clampCount(s.color)),
    n: validStamp(s.n),
    at: validStamp(s.at),
    favorites: new Set(),
    bakedCounts: new Map(),
    favAt: new Map(),
    resetAt: new Map(),
  };
  if (Array.isArray(s.favs)) for (const slug of s.favs) if (validSlug(slug)) p.favorites.add(slug);
  if (isObj(s.baked)) {
    for (const [slug, count] of Object.entries(s.baked)) {
      const n = clampCount(count);
      if (validSlug(slug) && n > 0) p.bakedCounts.set(slug, n);
    }
  }
  readStamps(s.favAt, p.favAt);
  readStamps(s.resetAt, p.resetAt);
  lastStamp = Math.max(lastStamp, p.n, p.at);
  return p;
}

const plain = (p) => ({
  favs: [...p.favorites],
  favAt: Object.fromEntries(p.favAt),
  baked: Object.fromEntries(p.bakedCounts),
  resetAt: Object.fromEntries(p.resetAt),
});

const full = (p) => ({ id: p.id, name: p.name, color: p.color, n: p.n, at: p.at, ...plain(p) });

const newId = () => stamp().toString(36) + Math.random().toString(36).slice(2, 6);

// Replace every profile; keeps the active one when it still exists.
function setBook(list, goneSrc, activeId = cur?.id) {
  gone = new Map();
  readStamps(goneSrc, gone);
  const seen = new Set();
  book = [];
  for (const src of Array.isArray(list) ? list : []) {
    const id = src?.id;
    if (typeof id !== 'string' || !ID_RE.test(id) || seen.has(id) || gone.has(id)) continue;
    seen.add(id);
    book.push(makeProfile(src));
  }
  book.sort((a, b) => a.n - b.n || (a.id < b.id ? -1 : 1));
  // Never zero profiles (e.g. two devices each deleted "the other" one).
  if (!book.length) book.push(makeProfile({ n: stamp() }, gone.has(MAIN_ID) ? newId() : MAIN_ID));
  cur = book.find((p) => p.id === activeId) || book[0];
  view = null;
}

function read(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function parse(raw) {
  try {
    const v = raw ? JSON.parse(raw) : null;
    return isObj(v) ? v : null;
  } catch {
    return null;
  }
}

// Google first name from the cached sign-in (email name as a fallback).
const firstName = (name) => cleanName(typeof name === 'string' ? name.split(/[\s@]/)[0] : '');

export function reloadFav(storage = defaultStorage()) {
  const saved = parse(read(storage, BOOK_KEY));
  const activeId = read(storage, ACTIVE_KEY);
  if (saved && Array.isArray(saved.profiles)) {
    setBook(saved.profiles, saved.gone, activeId);
    return;
  }
  // First visit since profiles: everything so far becomes the default profile.
  const legacy = parse(read(storage, FAV_KEY)) || {};
  const name = firstName(parse(read(storage, AUTH_KEY))?.name);
  setBook([{ ...legacy, id: MAIN_ID, name, at: name ? 1 : 0 }], null, activeId);
  if (persistFav(storage) && read(storage, BOOK_KEY)) {
    try {
      storage.removeItem?.(FAV_KEY);
    } catch {
      /* ignore: the new store already holds everything */
    }
  }
}

function persistFav(storage = defaultStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(BOOK_KEY, JSON.stringify({ v: 2, ...getBookState() }));
    return true;
  } catch {
    /* storage blocked: state still works for this visit */
    return false;
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
  return validSlug(slug) && cur.favorites.has(slug);
}

export function getBakedCount(slug) {
  return validSlug(slug) ? cur.bakedCounts.get(slug) || 0 : 0;
}

export function toggleFavorite(slug, storage = defaultStorage()) {
  if (!validSlug(slug)) return false;
  const next = !cur.favorites.has(slug);
  if (next) cur.favorites.add(slug);
  else cur.favorites.delete(slug);
  cur.favAt.set(slug, stamp());
  persistFav(storage);
  notify(slug);
  return next;
}

export function incrementBaked(slug, storage = defaultStorage()) {
  if (!validSlug(slug)) return 0;
  const next = Math.min(MAX_BAKED, (cur.bakedCounts.get(slug) || 0) + 1);
  cur.bakedCounts.set(slug, next);
  persistFav(storage);
  notify(slug);
  return next;
}

export function decrementBaked(slug, storage = defaultStorage()) {
  if (!validSlug(slug)) return 0;
  const n = cur.bakedCounts.get(slug) || 0;
  if (n <= 0) return 0;
  return setBakedCount(slug, n - 1, storage);
}

// Set a count directly (reset to 0, or undo a reset). Any explicit set counts
// as a deliberate edit, so it stamps resetAt and wins over older cloud counts.
export function setBakedCount(slug, count, storage = defaultStorage()) {
  if (!validSlug(slug)) return 0;
  const next = clampCount(count);
  if (next > 0) cur.bakedCounts.set(slug, next);
  else cur.bakedCounts.delete(slug);
  cur.resetAt.set(slug, stamp());
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

// Plain snapshot of the active profile.
export const getFavState = () => plain(cur);

// ---------- profiles ----------

// Stable snapshot for useSyncExternalStore: { profiles: [{id, name, color}], active }.
export function getProfileView() {
  return (view ||= { profiles: book.map(({ id, name, color }) => ({ id, name, color })), active: cur.id });
}

function changed(storage) {
  view = null;
  persistFav(storage);
  notify(null);
}

export function switchProfile(id, storage = defaultStorage()) {
  const p = book.find((q) => q.id === id);
  if (!p) return false;
  try {
    storage?.setItem(ACTIVE_KEY, id);
  } catch {
    /* per-visit only */
  }
  if (p !== cur) {
    cur = p;
    view = null;
    notify(null);
  }
  return true;
}

// New profile (switched to straight away); returns its id, or '' when the
// name is empty or the book is full.
export function addProfile(name, storage = defaultStorage()) {
  const clean = cleanName(name);
  if (!clean || book.length >= MAX_PROFILES) return '';
  const used = new Set(book.map((p) => p.color));
  const color = [0, 1, 2, 3, 4, 5].find((c) => !used.has(c)) ?? book.length % 6;
  const t = stamp();
  const p = makeProfile({ name: clean, color, n: t, at: t }, newId());
  book.push(p);
  changed(storage);
  switchProfile(p.id, storage);
  return p.id;
}

export function renameProfile(id, name, storage = defaultStorage()) {
  const p = book.find((q) => q.id === id);
  const clean = cleanName(name);
  if (!p || !clean) return false;
  if (clean !== p.name) {
    p.name = clean;
    p.at = stamp();
    changed(storage);
  }
  return true;
}

// Deletes a profile with its hearts and counts (never the last one). The
// tombstone in `gone` keeps other synced devices from bringing it back.
export function deleteProfile(id, storage = defaultStorage()) {
  const i = book.findIndex((p) => p.id === id);
  if (i < 0 || book.length < 2) return false;
  const [p] = book.splice(i, 1);
  gone.set(id, stamp());
  if (p === cur) switchProfile(book[0].id, storage);
  changed(storage);
  return true;
}

// After Google sign-in: an unnamed default profile takes the first name. The
// tiny stamp means any deliberate rename (on any device) still wins.
export function nameMainProfile(name, storage = defaultStorage()) {
  const p = book.find((q) => q.id === MAIN_ID);
  const clean = firstName(name);
  if (p && !p.name && !p.at && clean) {
    p.name = clean;
    p.at = 1;
    changed(storage);
  }
}

// ---------- cloud sync (see src/auth/merge.js) ----------

export function getBookState() {
  return { profiles: book.map(full), gone: Object.fromEntries(gone) };
}

// Replace everything with a (merged) book, persist, and refresh all views.
export function applyBookState(state, storage = defaultStorage()) {
  const s = isObj(state) ? state : {};
  setBook(s.profiles, s.gone);
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
    if (slug && cur.favorites.has(slug)) favs.push(entry);
    else rest.push(entry);
  }
  return favs.length ? [...favs, ...rest] : entries;
}

reloadFav();
