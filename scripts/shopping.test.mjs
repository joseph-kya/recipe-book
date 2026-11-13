import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SHOPPING_KEY,
  clearGotItems,
  formatShoppingList,
  getGotItems,
  isTouchDevice,
  reloadShopping,
  shareOrCopyList,
  subscribeShopping,
  toggleGotItem,
} from '../src/shopping.js';

const brownies = JSON.parse(
  readFileSync(new URL('../content/recipes/fudge-brownies.json', import.meta.url), 'utf8'),
);
const cinnamonRolls = JSON.parse(
  readFileSync(new URL('../content/recipes/best-classic-cinnamon-rolls.json', import.meta.url), 'utf8'),
);

function mockStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    dump: () => Object.fromEntries(map),
  };
}

test('shopping ticks persist per recipe, survive reload, ignore bad data, and clear cleanly', () => {
  const storage = mockStorage();
  reloadShopping(storage);

  const events = [];
  const unsubscribe = subscribeShopping((slug) => events.push(slug));

  toggleGotItem('fudge-brownies', '0:0', storage);
  toggleGotItem('fudge-brownies', '0:2', storage);
  toggleGotItem('topfenschmarren', '1:0', storage);
  assert.deepEqual([...getGotItems('fudge-brownies')], ['0:0', '0:2']);
  assert.deepEqual([...getGotItems('topfenschmarren')], ['1:0']);
  assert.deepEqual(events, ['fudge-brownies', 'fudge-brownies', 'topfenschmarren']);

  // Reloading from storage restores the exact ticked state.
  const saved = JSON.parse(storage.getItem(SHOPPING_KEY));
  saved['fudge-brownies'].push('bad-id', 42);
  saved[''] = ['0:0'];
  saved.corrupt = 'not-an-array';
  storage.setItem(SHOPPING_KEY, JSON.stringify(saved));

  reloadShopping(storage);
  assert.deepEqual([...getGotItems('fudge-brownies')], ['0:0', '0:2']);
  assert.deepEqual([...getGotItems('topfenschmarren')], ['1:0']);
  assert.equal(getGotItems('corrupt').size, 0);

  // Toggling again unticks; clearing removes all ticks for that recipe only.
  toggleGotItem('fudge-brownies', '0:0', storage);
  assert.deepEqual([...getGotItems('fudge-brownies')], ['0:2']);
  clearGotItems('fudge-brownies', storage);
  assert.equal(getGotItems('fudge-brownies').size, 0);
  assert.deepEqual([...getGotItems('topfenschmarren')], ['1:0']);

  clearGotItems('topfenschmarren', storage);
  unsubscribe();
  reloadShopping(null);
});

test('unavailable storage does not prevent ticking and clearing in memory', () => {
  const blocked = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  reloadShopping(blocked);
  toggleGotItem('fudge-brownies', '0:1', blocked);
  assert.equal(getGotItems('fudge-brownies').has('0:1'), true);
  clearGotItems('fudge-brownies', blocked);
  assert.equal(getGotItems('fudge-brownies').size, 0);
});

test('formatShoppingList omits ticked items and reflects language, units, and scale', () => {
  const got = new Set(['0:0', '0:1']);
  const enCups = formatShoppingList({
    recipe: brownies,
    lang: 'en',
    units: 'cups',
    factor: 1,
    gotItems: got,
  });
  const enLines = enCups.split('\n');
  assert.equal(enLines[0], brownies.en.title);
  assert.equal(enLines.length, 1 + brownies.en.groups[0].items.length - 2);
  assert.ok(!enCups.includes('dark couverture chocolate'));
  assert.ok(!enCups.includes('unsalted butter'));
  assert.ok(enLines.includes('¼ cup + 1 tbsp + 2 tsp unsweetened cocoa powder'));

  const deMetricDouble = formatShoppingList({
    recipe: brownies,
    lang: 'de',
    units: 'metric',
    factor: 2,
    gotItems: got,
  });
  const deLines = deMetricDouble.split('\n');
  assert.equal(deLines[0], brownies.de.title);
  assert.ok(deLines.includes('60 g Backkakao'));
  assert.ok(deLines.includes('500 g Weizenmehl'));

  // Ticking every item produces an empty string.
  const allGot = new Set(
    cinnamonRolls.en.groups.flatMap((g, gi) => g.items.map((_, ii) => `${gi}:${ii}`)),
  );
  assert.equal(formatShoppingList({ recipe: cinnamonRolls, gotItems: allGot }), '');
});

test('shareOrCopyList uses navigator.share on touch devices and navigator.clipboard otherwise', async () => {
  assert.equal(isTouchDevice({ matchMediaFn: () => ({ matches: true }) }), true);
  assert.equal(isTouchDevice({ matchMediaFn: () => ({ matches: false }), win: {}, nav: { maxTouchPoints: 0 } }), false);

  const calls = [];
  const touchNav = {
    share: async (payload) => { calls.push(['share', payload]); },
    clipboard: { writeText: async (text) => { calls.push(['clipboard', text]); } },
  };

  assert.equal(
    await shareOrCopyList({ title: 'Brownies', text: 'Brownies\n175 g chocolate', nav: touchNav, touch: true }),
    'shared',
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'share');

  // Desktop (non-touch) uses clipboard even when navigator.share exists.
  assert.equal(
    await shareOrCopyList({ title: 'Brownies', text: 'Brownies\n175 g chocolate', nav: touchNav, touch: false }),
    'copied',
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[1][0], 'clipboard');

  // Cancelling the share sheet does not fall back to clipboard.
  const abortNav = {
    share: async () => {
      const err = new Error('cancelled');
      err.name = 'AbortError';
      throw err;
    },
    clipboard: { writeText: async () => { calls.push(['unexpected-clipboard']); } },
  };
  assert.equal(
    await shareOrCopyList({ title: 'Brownies', text: 'Brownies\n175 g chocolate', nav: abortNav, touch: true }),
    'aborted',
  );
  assert.equal(calls.length, 2);
});
