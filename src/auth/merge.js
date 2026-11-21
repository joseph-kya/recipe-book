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

// Cloud doc <-> state. The doc is users/{uid}; see firestore.rules.
export function toCloudDoc(state, now = Date.now()) {
  const s = normalizeFavState(state);
  return { v: 1, favorites: s.favs, favAt: s.favAt, baked: s.baked, resetAt: s.resetAt, updatedAt: now };
}

export function fromCloudDoc(data) {
  const d = isObj(data) ? data : {};
  return normalizeFavState({ favs: d.favorites, favAt: d.favAt, baked: d.baked, resetAt: d.resetAt });
}
