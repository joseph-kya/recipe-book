import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ACTIVE_KEY,
  BOOK_KEY,
  FAV_KEY,
  MAIN_ID,
  MAX_PROFILES,
  addProfile,
  applyBookState,
  cleanName,
  deleteProfile,
  getBakedCount,
  getBookState,
  getProfileView,
  incrementBaked,
  isFavorite,
  nameMainProfile,
  reloadFav,
  renameProfile,
  resetBaked,
  subscribeFav,
  switchProfile,
  toggleFavorite,
} from '../src/fav.js';
import { cloudBook, fromCloudDoc, mergeBooks, normalizeBook, sameBook, toCloudDoc } from '../src/auth/merge.js';
import { profileText } from '../src/profile-i18n.js';
import { whoText } from '../src/fav-i18n.js';

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

const prof = (id, over = {}) => ({ id, name: '', color: 0, n: 0, at: 0, favs: [], favAt: {}, baked: {}, resetAt: {}, ...over });
const legacy = { favs: ['fudge-brownies'], favAt: { 'fudge-brownies': 100 }, baked: { 'lotus-cheesecake': 3 }, resetAt: { 'lotus-cheesecake': 90 } };

// ---------- migration ----------

test('pre-profiles data migrates once into the default profile with nothing lost', () => {
  const storage = makeStorage({ [FAV_KEY]: JSON.stringify(legacy) });
  try {
    reloadFav(storage);
    const { profiles, active } = getProfileView();
    assert.deepEqual(profiles, [{ id: MAIN_ID, name: '', color: 0 }], 'unnamed default shows as "Me"');
    assert.equal(active, MAIN_ID);
    assert.equal(isFavorite('fudge-brownies'), true);
    assert.equal(getBakedCount('lotus-cheesecake'), 3);
    const main = getBookState().profiles[0];
    assert.deepEqual(main.favAt, legacy.favAt, 'timestamps kept for merging');
    assert.deepEqual(main.resetAt, legacy.resetAt);

    // Migrated: the new store holds everything, the old key is gone.
    assert.equal(storage.getItem(FAV_KEY), null);
    assert.equal(JSON.parse(storage.getItem(BOOK_KEY)).v, 2);

    // A stale old-format write later is ignored (it was read once).
    storage.setItem(FAV_KEY, JSON.stringify({ favs: [], baked: {} }));
    reloadFav(storage);
    assert.equal(isFavorite('fudge-brownies'), true);
    assert.equal(getBakedCount('lotus-cheesecake'), 3);
  } finally {
    reloadFav(makeStorage());
  }
});

test('migration names the default profile from a cached Google sign-in, else leaves it for "Me"', () => {
  try {
    const storage = makeStorage({
      [FAV_KEY]: JSON.stringify(legacy),
      'recipe-book:auth:v1': JSON.stringify({ name: 'Joseph Kyamakya', photo: '', initial: 'J' }),
    });
    reloadFav(storage);
    assert.equal(getProfileView().profiles[0].name, 'Joseph');

    // Signed out at migration, signed in later: the first name fills in once...
    reloadFav(makeStorage({ [FAV_KEY]: JSON.stringify(legacy) }));
    assert.equal(getProfileView().profiles[0].name, '');
    nameMainProfile('Anna Muster');
    assert.equal(getProfileView().profiles[0].name, 'Anna');
    // ...but never overrides a deliberate rename.
    renameProfile(MAIN_ID, 'Oma');
    nameMainProfile('Anna Muster');
    assert.equal(getProfileView().profiles[0].name, 'Oma');
  } finally {
    reloadFav(makeStorage());
  }
});

test('blocked storage still gives a working default profile', () => {
  const blocked = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  try {
    reloadFav(blocked);
    assert.equal(getProfileView().profiles.length, 1);
    assert.ok(addProfile('Anna', blocked));
    assert.equal(toggleFavorite('fudge-brownies', blocked), true);
    assert.equal(getProfileView().profiles.length, 2);
  } finally {
    reloadFav(makeStorage());
  }
});

// ---------- create / switch / rename / delete ----------

test('each profile keeps its own hearts and counts; the active one is per device', () => {
  const storage = makeStorage({ [FAV_KEY]: JSON.stringify(legacy) });
  try {
    reloadFav(storage);
    const events = [];
    const off = subscribeFav((slug) => events.push(slug));
    const anna = addProfile('  Anna  ', storage);
    off();
    assert.ok(anna);
    assert.ok(events.includes(null), 'adding/switching refreshes every view');
    assert.equal(getProfileView().active, anna, 'a new profile becomes active');
    assert.deepEqual(getProfileView().profiles.map((p) => [p.name, p.color]), [['', 0], ['Anna', 1]]);
    assert.equal(isFavorite('fudge-brownies'), false, 'new profile starts empty');
    assert.equal(getBakedCount('lotus-cheesecake'), 0);

    toggleFavorite('topfenschmarren', storage);
    incrementBaked('topfenschmarren', storage);
    assert.equal(storage.getItem(ACTIVE_KEY), anna);

    switchProfile(MAIN_ID, storage);
    assert.equal(isFavorite('topfenschmarren'), false);
    assert.equal(isFavorite('fudge-brownies'), true);
    assert.equal(getBakedCount('lotus-cheesecake'), 3);
    resetBaked('lotus-cheesecake', storage);

    // Reload restores the device's active profile and every profile's data.
    reloadFav(storage);
    assert.equal(getProfileView().active, MAIN_ID);
    assert.equal(getBakedCount('lotus-cheesecake'), 0);
    switchProfile(anna, storage);
    assert.equal(isFavorite('topfenschmarren'), true);
    assert.equal(getBakedCount('topfenschmarren'), 1);

    // The snapshot is stable between changes (useSyncExternalStore).
    assert.strictEqual(getProfileView(), getProfileView());
    assert.equal(switchProfile('nope', storage), false);
  } finally {
    reloadFav(makeStorage());
  }
});

test('names are cleaned, empty names refused, and the book holds at most six', () => {
  const storage = makeStorage();
  try {
    reloadFav(storage);
    assert.equal(cleanName('  Anna \n Lena  '), 'Anna Lena');
    assert.equal(Array.from(cleanName('🧁'.repeat(40))).length, 24, 'emoji-safe 24 char cap');
    assert.equal(addProfile('   ', storage), '');
    assert.equal(renameProfile(MAIN_ID, ' ', storage), false);
    assert.equal(renameProfile('nope', 'X', storage), false);
    for (let i = 1; i < MAX_PROFILES; i++) assert.ok(addProfile(`P${i}`, storage));
    assert.equal(addProfile('Seventh', storage), '');
    const colors = getProfileView().profiles.map((p) => p.color);
    assert.deepEqual([...colors].sort(), [0, 1, 2, 3, 4, 5], 'every chip gets its own diner colour');

    const before = getBookState().profiles.find((p) => p.name === 'P2');
    assert.equal(renameProfile(before.id, ' Sis ', storage), true);
    const after = getBookState().profiles.find((p) => p.id === before.id);
    assert.equal(after.name, 'Sis');
    assert.ok(after.at > before.at, 'rename is time-stamped for sync');
  } finally {
    reloadFav(makeStorage());
  }
});

test('delete removes one profile (never the last), tombstones it, and moves off it if active', () => {
  const storage = makeStorage({ [FAV_KEY]: JSON.stringify(legacy) });
  try {
    reloadFav(storage);
    const anna = addProfile('Anna', storage);
    toggleFavorite('topfenschmarren', storage);
    assert.equal(deleteProfile(anna, storage), true);
    assert.equal(getProfileView().active, MAIN_ID);
    assert.equal(isFavorite('fudge-brownies'), true, 'other profile untouched');
    assert.ok(getBookState().gone[anna] > 0);
    assert.equal(deleteProfile(MAIN_ID, storage), false, 'never delete the last profile');
    assert.equal(deleteProfile('nope', storage), false);

    // A colour freed by a delete is reused.
    const ben = addProfile('Ben', storage);
    assert.equal(getProfileView().profiles.find((p) => p.id === ben).color, 1);

    // Deleting the default works too while another profile remains.
    assert.equal(deleteProfile(MAIN_ID, storage), true);
    reloadFav(storage);
    assert.deepEqual(getProfileView().profiles.map((p) => p.name), ['Ben']);
    assert.equal(isFavorite('fudge-brownies'), false);
  } finally {
    reloadFav(makeStorage());
  }
});

test('applyBookState never leaves zero profiles and falls back when the active one vanished', () => {
  const storage = makeStorage();
  try {
    reloadFav(storage);
    const anna = addProfile('Anna', storage);
    applyBookState({ profiles: [prof(MAIN_ID, { favs: ['a'] })], gone: { [anna]: 5 } }, storage);
    assert.equal(getProfileView().active, MAIN_ID);
    assert.equal(isFavorite('a'), true);
    applyBookState({ profiles: [], gone: { [MAIN_ID]: 9 } }, storage);
    const { profiles } = getProfileView();
    assert.equal(profiles.length, 1);
    assert.notEqual(profiles[0].id, MAIN_ID, 'a tombstoned id is not reused');
  } finally {
    reloadFav(makeStorage());
  }
});

// ---------- per-profile merge (src/auth/merge.js) ----------

test('profiles merge by id with the existing rules inside each profile', () => {
  const device = {
    profiles: [
      prof(MAIN_ID, { favs: ['fudge-brownies'], baked: { 'fudge-brownies': 2 }, resetAt: { 'lotus-cheesecake': 500 } }),
      prof('anna1', { name: 'Anna', color: 1, n: 10, at: 10, favs: ['topfenschmarren'], favAt: { 'berry-quark-bake': 300 } }),
    ],
    gone: {},
  };
  const cloud = {
    profiles: [
      prof(MAIN_ID, { name: 'Joseph', at: 1, favs: ['lotus-cheesecake'], baked: { 'fudge-brownies': 5, 'lotus-cheesecake': 4 }, resetAt: { 'lotus-cheesecake': 400 } }),
      prof('anna1', { name: 'Annerl', color: 1, n: 10, at: 20, favs: ['berry-quark-bake'], favAt: { 'berry-quark-bake': 200 } }),
      prof('mom22', { name: 'Mama', color: 2, n: 30, at: 30, baked: { topfenschmarren: 1 } }),
    ],
    gone: {},
  };
  const m = mergeBooks(device, cloud);
  assert.deepEqual(m.profiles.map((p) => p.id), [MAIN_ID, 'anna1', 'mom22'], 'sorted by creation, default first');
  const [main, anna, mom] = m.profiles;
  assert.equal(main.name, 'Joseph', 'stamped name beats the unnamed default');
  assert.deepEqual(main.favs, ['fudge-brownies', 'lotus-cheesecake'], 'union favorites');
  assert.equal(main.baked['fudge-brownies'], 5, 'max count');
  assert.equal(main.baked['lotus-cheesecake'], undefined, 'newer reset wins');
  assert.equal(anna.name, 'Annerl', 'newer rename wins');
  assert.deepEqual(anna.favs, ['topfenschmarren'], 'newer removal (300) beats older add (200)');
  assert.deepEqual(mom.baked, { topfenschmarren: 1 });
  // Nothing leaks between profiles.
  assert.equal(mom.favs.length, 0);
  assert.equal(anna.baked['fudge-brownies'], undefined);

  assert.ok(sameBook(m, mergeBooks(cloud, device)), 'symmetric');
  assert.ok(sameBook(mergeBooks(m, m), m), 'idempotent');
  assert.ok(sameBook(mergeBooks(device, {}), device), 'empty cloud');
  assert.ok(sameBook(mergeBooks(null, cloud), cloud), 'garbage local');
});

test('a deleted profile stays deleted on every device; others keep their data', () => {
  const a = { profiles: [prof(MAIN_ID, { favs: ['x'] })], gone: { anna1: 900 } };
  const stale = { profiles: [prof(MAIN_ID), prof('anna1', { name: 'Anna', n: 10, at: 10, favs: ['y'] })], gone: {} };
  const m = mergeBooks(stale, a);
  assert.deepEqual(m.profiles.map((p) => p.id), [MAIN_ID]);
  assert.deepEqual(m.profiles[0].favs, ['x']);
  assert.deepEqual(m.gone, { anna1: 900 });

  // Tombstones are capped at the newest 50.
  const many = {};
  for (let i = 0; i < 60; i++) many[`g${i}`] = 1000 + i;
  const g = normalizeBook({ profiles: [], gone: many }).gone;
  assert.equal(Object.keys(g).length, 50);
  assert.equal(g.g0, undefined);
  assert.equal(g.g59, 1059);
});

test('old (v1) cloud docs become the default profile, so first sync after the update loses nothing', () => {
  const v1 = { v: 1, favorites: ['a'], favAt: { a: 5 }, baked: { b: 2 }, resetAt: {}, updatedAt: 1 };
  const remote = fromCloudDoc(v1);
  assert.deepEqual(remote.profiles.map((p) => p.id), [MAIN_ID]);
  // Local device already migrated its own pre-profiles data into "main" too.
  const local = { profiles: [prof(MAIN_ID, { name: 'Joseph', at: 1, favs: ['c'] }), prof('anna1', { name: 'Anna', n: 5, at: 5 })], gone: {} };
  const m = mergeBooks(local, remote);
  assert.deepEqual(m.profiles[0].favs, ['a', 'c']);
  assert.equal(m.profiles[0].baked.b, 2);
  const doc = toCloudDoc(m, 7);
  assert.equal(doc.v, 2);
  assert.deepEqual(Object.keys(doc.profiles), ['p0', 'p1']);
  assert.deepEqual(Object.keys(doc).sort(), ['gone', 'profiles', 'updatedAt', 'v']);
  assert.ok(sameBook(fromCloudDoc(doc), m), 'v2 round-trip');
  assert.deepEqual(fromCloudDoc({ v: 1 }).profiles, [], 'empty doc adds nothing');
});

test('the cloud doc carries at most six profiles; a seventh stays on its device', () => {
  const profiles = [];
  for (let i = 0; i < 7; i++) profiles.push(prof(`p${i}x`, { name: `P${i}`, n: i + 1, at: i + 1 }));
  const book = { profiles, gone: {} };
  assert.equal(cloudBook(book).profiles.length, 6);
  const doc = toCloudDoc(book, 1);
  assert.equal(Object.keys(doc.profiles).length, 6);
  assert.equal(doc.profiles.p5.id, 'p5x', 'the oldest six');
  // Merging the capped cloud back keeps all seven locally and is stable.
  const m = mergeBooks(book, fromCloudDoc(doc));
  assert.equal(m.profiles.length, 7);
  assert.ok(sameBook(cloudBook(m), fromCloudDoc(doc)), 'no endless rewrites');
});

test('fav.js book state round-trips through merge and the cloud doc', () => {
  const storage = makeStorage({ [FAV_KEY]: JSON.stringify(legacy) });
  try {
    reloadFav(storage);
    renameProfile(MAIN_ID, 'Joseph', storage);
    addProfile('Anna', storage);
    toggleFavorite('topfenschmarren', storage);
    const local = getBookState();
    const fromDoc = fromCloudDoc(toCloudDoc(local));
    assert.ok(sameBook(fromDoc, local));
    applyBookState(mergeBooks(local, fromDoc), storage);
    assert.ok(sameBook(getBookState(), local));
    assert.equal(isFavorite('topfenschmarren'), true, 'active profile kept');
  } finally {
    reloadFav(makeStorage());
  }
});

// ---------- copy, wiring and rules ----------

test('profile copy exists in EN, Austrian DE (du), and FR', () => {
  for (const lang of ['de', 'fr']) {
    for (const key of Object.keys(profileText.en)) {
      assert.equal(typeof profileText[lang][key], typeof profileText.en[key], `${lang}.${key}`);
    }
    assert.notEqual(whoText[lang].ask, whoText.en.ask);
    assert.notEqual(whoText[lang].me, whoText.en.me);
    assert.notEqual(profileText[lang].add, profileText.en.add);
  }
  for (const lang of ['en', 'de', 'fr']) {
    const t = profileText[lang];
    assert.match(t.confirm('Anna'), /Anna/);
  }
  assert.doesNotMatch(Object.values(profileText.de).map(String).join(' '), /\b(Sie|Ihre?)\b/);
});

test('switcher is mounted on Contents, stays flat, and the rules guard the new doc shape', () => {
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  const contents = read('src/Contents.jsx');
  assert.match(contents, /<ProfileSwitch lang=\{lang\} \/>/);
  assert.match(contents, /\{withTitle && <ProfileSwitch lang=\{lang\} className="who--list" \/>\}/);
  const sw = read('src/ProfileSwitch.jsx');
  assert.doesNotMatch(sw, /from ['"]firebase/);
  assert.match(sw, /import\('\.\/ProfilePanel\.jsx'\)/, 'panel stays out of the initial bundle');
  assert.doesNotMatch(sw, /profile-i18n/);

  const css = read('src/idea-fav.css');
  const who = css.slice(css.indexOf('"who\'s baking?"'), css.indexOf('Keyframes'));
  assert.ok(who.length > 200);
  assert.doesNotMatch(who, /box-shadow|outline:|border:(?!\s*0;)|\bring\b|glow/i, 'no new outlines, borders, rings or glows');
  assert.match(who, /min-height: 2\.75rem/);
  assert.match(who, /font-size: 1rem/, '16px input avoids iOS zoom');

  const rules = read('firestore.rules');
  assert.match(rules, /hasOnly\(\['p0', 'p1', 'p2', 'p3', 'p4', 'p5'\]\)/);
  assert.match(rules, /d\.profiles\.size\(\) <= 6/);
  assert.match(rules, /'profiles' in resource\.data/, 'old clients cannot overwrite a profiles doc');
  assert.match(rules, /'favorites', 'favAt', 'baked', 'resetAt'/, 'v1 docs still valid');
  assert.match(read('AUTH_SETUP.md'), /republish/i);
});
