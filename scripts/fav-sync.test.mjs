import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FAV_KEY,
  applyFavState,
  decrementBaked,
  getBakedCount,
  getFavState,
  incrementBaked,
  isFavorite,
  reloadFav,
  resetBaked,
  setBakedCount,
  subscribeFav,
  toggleFavorite,
} from '../src/fav.js';
import { fromCloudDoc, mergeFavStates, normalizeFavState, sameFavState, toCloudDoc } from '../src/auth/merge.js';
import { favText, syncText } from '../src/fav-i18n.js';

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

const state = (over = {}) => ({ favs: [], favAt: {}, baked: {}, resetAt: {}, ...over });

// ---------- reset & undo (fav.js) ----------

test('resetBaked clears one recipe, returns the old count for undo, and survives reload', () => {
  const storage = makeStorage();
  reloadFav(storage);
  incrementBaked('fudge-brownies', storage);
  incrementBaked('fudge-brownies', storage);
  incrementBaked('fudge-brownies', storage);
  incrementBaked('lotus-cheesecake', storage);

  const events = [];
  const off = subscribeFav((slug) => events.push(slug));
  try {
    assert.equal(resetBaked('fudge-brownies', storage), 3);
    assert.equal(getBakedCount('fudge-brownies'), 0);
    assert.equal(getBakedCount('lotus-cheesecake'), 1, 'other recipes untouched');
    assert.deepEqual(events, ['fudge-brownies']);

    // Nothing to reset: no-op, no event, no stamp.
    assert.equal(resetBaked('topfenschmarren', storage), 0);
    assert.deepEqual(events, ['fudge-brownies']);

    reloadFav(storage);
    assert.equal(getBakedCount('fudge-brownies'), 0);
    const saved = JSON.parse(storage.getItem(FAV_KEY));
    assert.equal(saved.baked['fudge-brownies'], undefined);
    assert.ok(saved.resetAt['fudge-brownies'] > 0, 'reset is time-stamped so sync respects it');
    assert.equal(saved.resetAt.topfenschmarren, undefined);

    // Undo restores the exact count with a newer stamp than the reset.
    const resetStamp = saved.resetAt['fudge-brownies'];
    assert.equal(setBakedCount('fudge-brownies', 3, storage), 3);
    assert.equal(getBakedCount('fudge-brownies'), 3);
    assert.ok(getFavState().resetAt['fudge-brownies'] > resetStamp);

    // Clamped like the tap counter.
    assert.equal(setBakedCount('fudge-brownies', 5000, storage), 999);
    assert.equal(setBakedCount('fudge-brownies', -2, storage), 0);
    assert.equal(setBakedCount('', 3, storage), 0);
  } finally {
    off();
    reloadFav(makeStorage());
  }
});

test('legacy v1 storage without timestamps still loads, and stamps are strictly increasing', () => {
  const storage = makeStorage({
    [FAV_KEY]: JSON.stringify({ favs: ['topfenschmarren'], baked: { topfenschmarren: 2 } }),
  });
  reloadFav(storage);
  assert.equal(isFavorite('topfenschmarren'), true);
  assert.equal(getBakedCount('topfenschmarren'), 2);
  assert.deepEqual(getFavState(), state({ favs: ['topfenschmarren'], baked: { topfenschmarren: 2 } }));

  decrementBaked('topfenschmarren', storage);
  const a = getFavState().resetAt.topfenschmarren;
  decrementBaked('topfenschmarren', storage);
  const b = getFavState().resetAt.topfenschmarren;
  assert.ok(b > a, 'two edits in the same millisecond still order');

  // Bad stamps are dropped on load.
  storage.setItem(
    FAV_KEY,
    JSON.stringify({ favs: [], baked: {}, favAt: { x: 'nope', y: -1, z: 5 }, resetAt: [1, 2] }),
  );
  reloadFav(storage);
  assert.deepEqual(getFavState(), state({ favAt: { z: 5 } }));
  reloadFav(makeStorage());
});

test('applyFavState replaces local state, persists it, and refreshes every view', () => {
  const storage = makeStorage();
  reloadFav(storage);
  toggleFavorite('fudge-brownies', storage);

  const events = [];
  const off = subscribeFav((slug) => events.push(slug));
  try {
    applyFavState(
      state({ favs: ['lotus-cheesecake', ''], favAt: { 'lotus-cheesecake': 10 }, baked: { 'lotus-cheesecake': 4, bad: -1 } }),
      storage,
    );
    assert.deepEqual(events, [null], 'null = every subscriber re-renders');
    assert.equal(isFavorite('fudge-brownies'), false);
    assert.equal(isFavorite('lotus-cheesecake'), true);
    assert.equal(getBakedCount('lotus-cheesecake'), 4);
    reloadFav(storage);
    assert.equal(getBakedCount('lotus-cheesecake'), 4);
    // A later local edit still gets a newer stamp than anything applied.
    toggleFavorite('lotus-cheesecake', storage);
    assert.ok(getFavState().favAt['lotus-cheesecake'] > 10);
  } finally {
    off();
    reloadFav(makeStorage());
  }
});

// ---------- merge (src/auth/merge.js) ----------

test('first sign-in merge: union of favorites, max of baked counts', () => {
  const device = state({ favs: ['fudge-brownies', 'topfenschmarren'], baked: { 'fudge-brownies': 2, 'lotus-cheesecake': 1 } });
  const cloud = state({ favs: ['lotus-cheesecake', 'fudge-brownies'], baked: { 'fudge-brownies': 5, 'berry-quark-bake': 3 } });
  const merged = mergeFavStates(device, cloud);
  assert.deepEqual(merged.favs, ['fudge-brownies', 'lotus-cheesecake', 'topfenschmarren']);
  assert.deepEqual(merged.baked, { 'berry-quark-bake': 3, 'fudge-brownies': 5, 'lotus-cheesecake': 1 });
  assert.ok(sameFavState(merged, mergeFavStates(cloud, device)), 'merge is symmetric');
  assert.ok(sameFavState(mergeFavStates(merged, merged), merged), 'merge is idempotent');
  assert.ok(sameFavState(mergeFavStates(device, {}), normalizeFavState(device)), 'empty cloud doc');
  assert.ok(sameFavState(mergeFavStates(null, cloud), normalizeFavState(cloud)), 'garbage local');
});

test('a reset (or undo / hold-to-undo) newer than the other side wins over a higher count', () => {
  const cloud = state({ baked: { 'fudge-brownies': 7 }, resetAt: {} });
  const resetHere = state({ baked: {}, resetAt: { 'fudge-brownies': 2000 } });
  let m = mergeFavStates(resetHere, cloud);
  assert.equal(m.baked['fudge-brownies'], undefined, 'reset to 0 sticks despite cloud 7');
  assert.equal(m.resetAt['fudge-brownies'], 2000);

  // After the reset, baking again on the reset device counts up from 0.
  const bakedAgain = state({ baked: { 'fudge-brownies': 1 }, resetAt: { 'fudge-brownies': 2000 } });
  m = mergeFavStates(cloud, bakedAgain);
  assert.equal(m.baked['fudge-brownies'], 1);

  // Both sides already saw the same reset: counts after it merge with max.
  const otherDevice = state({ baked: { 'fudge-brownies': 2 }, resetAt: { 'fudge-brownies': 2000 } });
  assert.equal(mergeFavStates(bakedAgain, otherDevice).baked['fudge-brownies'], 2);

  // An even newer explicit set (e.g. undo on another device) beats the reset.
  const undoElsewhere = state({ baked: { 'fudge-brownies': 7 }, resetAt: { 'fudge-brownies': 3000 } });
  m = mergeFavStates(resetHere, undoElsewhere);
  assert.equal(m.baked['fudge-brownies'], 7);
  assert.equal(m.resetAt['fudge-brownies'], 3000);

  // Hold-to-undo (decrement) is also deliberate: 3 -> 2 beats a stale 3.
  const stale = state({ baked: { 'fudge-brownies': 3 } });
  const decremented = state({ baked: { 'fudge-brownies': 2 }, resetAt: { 'fudge-brownies': 50 } });
  assert.equal(mergeFavStates(stale, decremented).baked['fudge-brownies'], 2);
});

test('unfavoriting is respected via favAt; an older removal loses to a newer add', () => {
  const cloud = state({ favs: ['fudge-brownies', 'lotus-cheesecake'], favAt: { 'fudge-brownies': 100 } });
  const removedLater = state({ favs: [], favAt: { 'fudge-brownies': 200 } });
  let m = mergeFavStates(removedLater, cloud);
  assert.deepEqual(m.favs, ['lotus-cheesecake'], 'newer removal wins; untouched cloud fav kept');
  assert.equal(m.favAt['fudge-brownies'], 200);

  const removedEarlier = state({ favs: [], favAt: { 'fudge-brownies': 50 } });
  m = mergeFavStates(removedEarlier, cloud);
  assert.deepEqual(m.favs, ['fudge-brownies', 'lotus-cheesecake'], 'older removal loses to newer add');

  // Legacy favorites (no stamp) union with anything, but lose to a stamped removal.
  m = mergeFavStates(state({ favs: ['topfenschmarren'] }), state({ favs: [], favAt: { topfenschmarren: 1 } }));
  assert.deepEqual(m.favs, []);
});

test('cloud doc round-trips, carries updatedAt, and hostile data is sanitized', () => {
  const s = state({
    favs: ['b', 'a'],
    favAt: { a: 5 },
    baked: { a: 2 },
    resetAt: { a: 9 },
  });
  const docData = toCloudDoc(s, 1234);
  assert.deepEqual(docData, {
    v: 1,
    favorites: ['a', 'b'],
    favAt: { a: 5 },
    baked: { a: 2 },
    resetAt: { a: 9 },
    updatedAt: 1234,
  });
  assert.ok(sameFavState(fromCloudDoc(docData), s));
  assert.deepEqual(fromCloudDoc(undefined), state());
  assert.deepEqual(
    fromCloudDoc({ favorites: 'x', baked: { a: 1e9, b: 'x', '': 3 }, favAt: { a: Infinity }, resetAt: null }),
    state({ baked: { a: 999 } }),
  );
});

// ---------- copy & wiring contracts ----------

test('reset/undo and sync copy exist in EN, Austrian DE (du), and FR with label-in-name', () => {
  for (const lang of ['en', 'de', 'fr']) {
    for (const key of Object.keys(syncText.en)) {
      assert.equal(typeof syncText[lang][key], typeof syncText.en[key], `${lang}.${key}`);
    }
    assert.ok(favText[lang].undoLabel(3).startsWith(favText[lang].undo), `${lang} undo label-in-name`);
    assert.match(favText[lang].undoLabel(3), /3×/);
    assert.match(favText[lang].resetLabel('Brownies'), /Brownies/);
  }
  assert.match(syncText.de.signInHint, /\bdeine\b/);
  assert.doesNotMatch(Object.values(syncText.de).join(' '), /\b(Sie|Ihre?)\b/);
  assert.notEqual(syncText.de.signIn, syncText.en.signIn);
  assert.notEqual(syncText.fr.signIn, syncText.en.signIn);
});

test('Firebase is only ever imported dynamically, and the entry is mounted on Contents', () => {
  const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
  const session = read('auth/session.js');
  assert.match(session, /import\('\.\/sync\.js'\)/);
  for (const p of ['auth/session.js', 'auth/SyncEntry.jsx', 'auth/config.js', 'auth/merge.js', 'fav.js', 'Contents.jsx', 'RecipeFav.jsx']) {
    assert.doesNotMatch(read(p), /from ['"]firebase/, `${p} must not statically import firebase`);
    assert.doesNotMatch(read(p), /from ['"]\.\/sync\.js['"]/, `${p} must not statically import sync.js`);
  }
  assert.match(read('auth/sync.js'), /firebase\/firestore\/lite/);
  assert.match(read('Contents.jsx'), /<SyncEntry lang=\{lang\} \/>/);
  assert.match(read('Contents.jsx'), /\{withTitle && <SyncEntry lang=\{lang\} className="sync-entry--list" \/>\}/);
  assert.match(read('auth/SyncEntry.jsx'), /if \(!authEnabled\) return null;/);

  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /match \/users\/\{uid\}/);
  assert.match(rules, /request\.auth\.uid == uid/);
  assert.match(rules, /allow read, write: if false;/);
});
