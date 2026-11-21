// Pure merge of two favorites/baked states (this device vs. the cloud doc).
// No Firebase imports, so it is unit-tested in node and only ever bundled
// into the lazily loaded sync chunk.
//
// State shape (same as fav.js getFavState()):
//   { favs: string[], favAt: {slug: ms}, baked: {slug: n}, resetAt: {slug: ms} }
//
// Favorites: union, except a newer toggle wins. A heart removed at t2 beats
//   the same heart added at t1 < t2 elsewhere (favAt keeps the removal time).
// Baked counts: the higher count wins (two devices both counting up), except
//   when one side deliberately set its count lower later (reset, undo, hold to
//   undo): the side with the newer resetAt wins outright.

const MAX_BAKED = 999;

const isObj = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const validSlug = (s) => typeof s === 'string' && s.trim().length > 0;
const stampOf = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const countOf = (v) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(MAX_BAKED, Math.floor(v))) : 0;

function stamps(source) {
  const out = {};
  if (!isObj(source)) return out;
  for (const [slug, at] of Object.entries(source)) {
    const t = stampOf(at);
    if (validSlug(slug) && t) out[slug] = t;
  }
  return out;
}

// Clean, sorted copy of any (possibly hostile or legacy) state.
export function normalizeFavState(state) {
  const src = isObj(state) ? state : {};
  const favs = [...new Set((Array.isArray(src.favs) ? src.favs : []).filter(validSlug))].sort();
  const baked = {};
  if (isObj(src.baked)) {
    for (const [slug, n] of Object.entries(src.baked)) {
      const c = countOf(n);
      if (validSlug(slug) && c > 0) baked[slug] = c;
    }
  }
  return { favs, favAt: sortKeys(stamps(src.favAt)), baked: sortKeys(baked), resetAt: sortKeys(stamps(src.resetAt)) };
}

function sortKeys(obj) {
  const out = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

export function mergeFavStates(a, b) {
  const A = normalizeFavState(a);
  const B = normalizeFavState(b);
  const aFav = new Set(A.favs);
  const bFav = new Set(B.favs);

  const favs = [];
  const favAt = {};
  for (const slug of new Set([...A.favs, ...B.favs, ...Object.keys(A.favAt), ...Object.keys(B.favAt)])) {
    const at = A.favAt[slug] || 0;
    const bt = B.favAt[slug] || 0;
    const on = at === bt ? aFav.has(slug) || bFav.has(slug) : at > bt ? aFav.has(slug) : bFav.has(slug);
    if (on) favs.push(slug);
    if (at || bt) favAt[slug] = Math.max(at, bt);
  }

  const baked = {};
  const resetAt = {};
  for (const slug of new Set([
    ...Object.keys(A.baked),
    ...Object.keys(B.baked),
    ...Object.keys(A.resetAt),
    ...Object.keys(B.resetAt),
  ])) {
    const ar = A.resetAt[slug] || 0;
    const br = B.resetAt[slug] || 0;
    const an = A.baked[slug] || 0;
    const bn = B.baked[slug] || 0;
    const n = ar === br ? Math.max(an, bn) : ar > br ? an : bn;
    if (n > 0) baked[slug] = n;
    if (ar || br) resetAt[slug] = Math.max(ar, br);
  }

  return normalizeFavState({ favs, favAt, baked, resetAt });
}

export function sameFavState(a, b) {
  return JSON.stringify(normalizeFavState(a)) === JSON.stringify(normalizeFavState(b));
}

// ---------- profiles ("who's baking?") ----------
//
// Book shape (same as fav.js getBookState()):
//   { profiles: [{ id, name, color, n, at, ...state }], gone: {id: ms} }
// Profiles are matched by id; the same id on both sides merges with the rules
// above. Name/color: the newer rename (`at`) wins. A deleted id (`gone`) wins
// over any copy of that profile, so a stale device can't bring it back.

export const MAX_PROFILES = 6;
const MAX_GONE = 50;
const ID_RE = /^[a-z0-9]{1,16}$/;
const MAIN_ID = 'main';

const cleanName = (s) =>
  typeof s === 'string' ? Array.from(s.replace(/\s+/g, ' ').trim()).slice(0, 24).join('').trim() : '';

function normalizeProfile(p) {
  if (!isObj(p) || typeof p.id !== 'string' || !ID_RE.test(p.id)) return null;
  return {
    id: p.id,
    name: cleanName(p.name),
    color: Math.min(5, countOf(p.color)),
    n: stampOf(p.n),
    at: stampOf(p.at),
    ...normalizeFavState(p),
  };
}

function mergeProfile(a, b) {
  const tie = a.at === b.at;
  const meta = tie ? (`${a.name}\u0000${a.color}` >= `${b.name}\u0000${b.color}` ? a : b) : a.at > b.at ? a : b;
  return { ...meta, n: Math.min(a.n, b.n), at: Math.max(a.at, b.at), ...mergeFavStates(a, b) };
}

// Clean copy: valid profiles only, deleted ones dropped, duplicates merged,
// sorted by creation (the default profile first), newest 50 tombstones.
export function normalizeBook(book) {
  const src = isObj(book) ? book : {};
  const gone = {};
  const kept = Object.entries(stamps(src.gone))
    .sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))
    .slice(0, MAX_GONE);
  for (const [id, t] of kept.sort((x, y) => (x[0] < y[0] ? -1 : 1))) gone[id] = t;
  const byId = new Map();
  for (const raw of Array.isArray(src.profiles) ? src.profiles : []) {
    const p = normalizeProfile(raw);
    if (!p || gone[p.id]) continue;
    byId.set(p.id, byId.has(p.id) ? mergeProfile(byId.get(p.id), p) : p);
  }
  const profiles = [...byId.values()].sort((a, b) => a.n - b.n || (a.id < b.id ? -1 : 1));
  return { profiles, gone };
}

export function mergeBooks(a, b) {
  const A = normalizeBook(a);
  const B = normalizeBook(b);
  const gone = { ...A.gone };
  for (const [id, t] of Object.entries(B.gone)) gone[id] = Math.max(gone[id] || 0, t);
  return normalizeBook({ profiles: [...A.profiles, ...B.profiles], gone });
}

export function sameBook(a, b) {
  return JSON.stringify(normalizeBook(a)) === JSON.stringify(normalizeBook(b));
}

// What fits in the cloud doc: the oldest six profiles (firestore.rules allows
// six slots). A seventh, only possible after two devices both added profiles
// offline, stays on its device until one is deleted: nothing is lost.
export function cloudBook(book) {
  const b = normalizeBook(book);
  return { profiles: b.profiles.slice(0, MAX_PROFILES), gone: b.gone };
}

// Cloud doc <-> book. The doc is users/{uid}; see firestore.rules.
// v2: { v: 2, profiles: { p0..p5: { id, name, color, n, at, favorites, favAt, baked, resetAt } }, gone, updatedAt }
// v1 (before profiles): { v: 1, favorites, favAt, baked, resetAt, updatedAt } = the default profile.
export function toCloudDoc(book, now = Date.now()) {
  const b = cloudBook(book);
  const profiles = {};
  b.profiles.forEach(({ favs, ...p }, i) => {
    profiles[`p${i}`] = { ...p, favorites: favs };
  });
  return { v: 2, profiles, gone: b.gone, updatedAt: now };
}

export function fromCloudDoc(data) {
  const d = isObj(data) ? data : {};
  if (isObj(d.profiles)) {
    const list = Object.keys(d.profiles)
      .sort()
      .map((k) => d.profiles[k])
      .map((p) => (isObj(p) ? { ...p, favs: p.favorites } : null));
    return normalizeBook({ profiles: list, gone: d.gone });
  }
  const legacy = ['favorites', 'favAt', 'baked', 'resetAt'].some((k) => k in d);
  return normalizeBook({
    profiles: legacy ? [{ id: MAIN_ID, favs: d.favorites, favAt: d.favAt, baked: d.baked, resetAt: d.resetAt }] : [],
  });
}
