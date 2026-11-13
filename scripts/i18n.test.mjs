import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { textFor, amountsCreditFor } from '../src/recipe-i18n.js';
import { scaleAmount, offeredFactors } from '../src/scale.js';
import { ui } from '../src/i18n.js';
import {
  MUFFIN_FINISHES_KEY,
  MUFFIN_TIER_COUNT,
  getMuffinFinishes,
  pickNextIndex,
  recordMuffinFinish,
  themeText,
  tierForFinishes,
} from '../src/theme-i18n.js';

const directory = new URL('../content/recipes/', import.meta.url);
const recipes = readdirSync(directory).filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(new URL(file, directory), 'utf8')));
const sharedText = new Set(['Fudge Brownies', 'Fudge', 'Brownies', 'Topfenschmarren', 'Topfen-', 'schmarren', 'Type 405']);
const measurement = /^[\d\s.,~+–×¼½¾⅓⅔⅛()%°/-]*(?:g|ml|oz|EL|TL|h|min)?(?:[\d\s.,~+–×¼½¾⅓⅔⅛()%°/-]+(?:g|ml|oz|EL|TL|h|min)?)*$/;
const leaks = /Unsalted swap\.|Metal pan, no cream bath\.|as published, cups \+ grams are the author's own|ingredient weight chart|\b(cups?|tbsp|tsp|pinch|size M|to taste|as needed|to dust|to serve)\b/i;
const quantities = (text) => text.match(/[\d¼½¾⅓⅔⅛]+(?:[.,]\d+)?/g);

function complete(en, de, path) {
  if (Array.isArray(en)) {
    assert.ok(Array.isArray(de), `${path}: missing array`);
    assert.equal(de.length, en.length, `${path}: entry count`);
    en.forEach((value, i) => complete(value, de[i], `${path}[${i}]`));
  } else if (en && typeof en === 'object') {
    assert.ok(de && typeof de === 'object', `${path}: missing object`);
    for (const [key, value] of Object.entries(en)) {
      assert.ok(Object.hasOwn(de, key), `${path}.${key}: missing key`);
      complete(value, de[key], `${path}.${key}`);
    }
  } else if (typeof en === 'string') {
    assert.equal(typeof de, 'string', `${path}: missing text`);
    if (en.trim()) assert.ok(de.trim(), `${path}: empty translation`);
    if (en === de && en.trim()) {
      assert.ok(sharedText.has(en) || measurement.test(en), `${path}: untranslated English: ${en}`);
    }
  }
}

for (const recipe of recipes) {
  test(`${recipe.slug}: complete German, no English fallback or known leaks`, () => {
    complete(recipe.en, recipe.de, recipe.slug);
    const selected = textFor(recipe, 'de');
    assert.equal(selected.lang, 'de');
    assert.equal(selected.fallback, false);
    assert.equal(selected.text, recipe.de);
    assert.equal(textFor(recipe, 'en').text, recipe.en);
    assert.doesNotMatch(JSON.stringify(recipe.de), leaks);
    if (recipe.amounts_credit?.en) {
      complete(recipe.amounts_credit.en, recipe.amounts_credit.de, `${recipe.slug}.amounts_credit`);
      const credit = amountsCreditFor(recipe, 'de');
      assert.equal(credit.lang, 'de');
      assert.equal(credit.label, recipe.amounts_credit.de.label);
      assert.equal(credit.src, recipe.amounts_credit.de.src);
      assert.doesNotMatch(JSON.stringify(credit), leaks);
    } else if (recipe.conversions) {
      assert.ok(recipe.de.conversions, `${recipe.slug}: visible conversion credit needs German`);
    }
    // Adding a language must not change the portion choices in English mode.
    assert.deepEqual(offeredFactors(recipe), offeredFactors({ ...recipe, de: undefined }));
    for (const [gi, group] of recipe.de.groups.entries()) {
      for (const [ii, item] of group.items.entries()) {
        for (const key of ['amount', 'metric']) {
          assert.deepEqual(quantities(item[key]), quantities(recipe.en.groups[gi].items[ii][key]), `${recipe.slug}: ${key} quantities changed`);
        }
        for (const factor of [0.1, 0.5, 2, 10]) {
          assert.doesNotMatch(scaleAmount(item.amount, factor, 'de', true), leaks);
          assert.doesNotMatch(scaleAmount(item.metric, factor, 'de', true), leaks);
        }
      }
    }
  });
}

test('German chrome covers every English UI and theme key', () => {
  function keys(en, de) {
    for (const [key, value] of Object.entries(en)) {
      assert.ok(Object.hasOwn(de, key), `missing German UI key: ${key}`);
      if (value === null) continue;
      if (typeof value === 'object') keys(value, de[key]);
      else assert.equal(typeof de[key], typeof value, key);
    }
  }
  keys(ui.en, ui.de);
  keys(themeText.en, themeText.de);
  assert.equal(themeText.en.changeColor, 'Change color');
  assert.equal(themeText.de.changeColor, 'Farbe wechseln');
  assert.equal(themeText.en.bites.length, 4);
  assert.equal(themeText.de.bites.length, 4);
  assert.equal(themeText.en.tiers.length, MUFFIN_TIER_COUNT);
  assert.equal(themeText.de.tiers.length, MUFFIN_TIER_COUNT);
  assert.equal(MUFFIN_TIER_COUNT, 10);

  const allEnGone = new Set();
  const allDeGone = new Set();
  const allEnReply = new Set();
  const allDeReply = new Set();

  for (let tierIndex = 0; tierIndex < MUFFIN_TIER_COUNT; tierIndex++) {
    const enTier = themeText.en.tiers[tierIndex];
    const deTier = themeText.de.tiers[tierIndex];
    assert.ok(enTier.allGone.length >= 5, `tier ${tierIndex} needs at least 5 finish lines`);
    assert.equal(deTier.allGone.length, enTier.allGone.length, `tier ${tierIndex} finish line count mismatch`);
    assert.ok(enTier.muffinReply.length >= 5, `tier ${tierIndex} needs at least 5 muffin replies`);
    assert.equal(deTier.muffinReply.length, enTier.muffinReply.length, `tier ${tierIndex} reply count mismatch`);

    for (let i = 0; i < enTier.allGone.length; i++) {
      const en = enTier.allGone[i];
      const de = deTier.allGone[i];
      assert.ok(en.trim().length > 0 && de.trim().length > 0);
      assert.notEqual(en, de);
      assert.ok(!allEnGone.has(en), `duplicate EN finish line: ${en}`);
      assert.ok(!allDeGone.has(de), `duplicate DE finish line: ${de}`);
      allEnGone.add(en);
      allDeGone.add(de);
    }

    for (let i = 0; i < enTier.muffinReply.length; i++) {
      const en = enTier.muffinReply[i];
      const de = deTier.muffinReply[i];
      assert.ok(en.trim().length > 0 && de.trim().length > 0);
      assert.notEqual(en, de);
      assert.ok(!allEnReply.has(en), `duplicate EN muffin reply: ${en}`);
      assert.ok(!allDeReply.has(de), `duplicate DE muffin reply: ${de}`);
      allEnReply.add(en);
      allDeReply.add(de);
    }
  }

  assert.equal(ui.de.languageEnglish, 'Englisch');
  assert.match(ui.en.switchLang, /\bEN\b/);
  assert.match(ui.de.switchLang, /\bDE\b/);
  assert.match(ui.en.switchToMetric, /\bcups\b/);
  assert.match(ui.en.switchToCups, /\bg\b/);
  assert.match(ui.de.switchToMetric, /\bTassen\b/);
  assert.match(ui.de.switchToCups, /\bg\b/);
  assert.ok(ui.en.keepAwake.trim().length > 0 && ui.de.keepAwake.trim().length > 0);
  assert.match(ui.de.photoAlt('Zimtschnecken', 'Scientifically Sweet'), /Foto von/);
  assert.match(ui.de.pdfLabel('Zimtschnecken'), /herunterladen/);
  assert.match(ui.de.pageOf(2, 5), /Seite 2 von 5/);
});

test('tierForFinishes escalates every 5 finishes up to tier 10 (45-50+)', () => {
  for (const [finishes, expectedTier] of [
    [0, 0], [1, 0], [4, 0],
    [5, 1], [9, 1],
    [10, 2], [14, 2],
    [15, 3], [19, 3],
    [20, 4], [24, 4],
    [25, 5], [29, 5],
    [30, 6], [34, 6],
    [35, 7], [39, 7],
    [40, 8], [44, 8],
    [45, 9], [49, 9], [50, 9], [99, 9],
    [-3, 0], [NaN, 0],
  ]) {
    assert.equal(tierForFinishes(finishes), expectedTier, `finishes=${finishes}`);
  }
});

test('muffin finishes persist in localStorage and handle blocked or corrupt storage', () => {
  const store = new Map();
  const mockStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  };

  assert.equal(getMuffinFinishes(mockStorage), 0);
  for (let expected = 1; expected <= 50; expected++) {
    assert.equal(recordMuffinFinish(mockStorage), expected);
    assert.equal(store.get(MUFFIN_FINISHES_KEY), String(expected));
    assert.equal(getMuffinFinishes(mockStorage), expected);
  }
  assert.equal(tierForFinishes(getMuffinFinishes(mockStorage)), 9);

  store.set(MUFFIN_FINISHES_KEY, 'not-a-number');
  assert.equal(getMuffinFinishes(mockStorage), 0);
  store.set(MUFFIN_FINISHES_KEY, '-7');
  assert.equal(getMuffinFinishes(mockStorage), 0);

  const blockedStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  const firstFallback = recordMuffinFinish(blockedStorage);
  assert.equal(recordMuffinFinish(blockedStorage), firstFallback + 1);
});

test('pickNextIndex picks across the full pool and never repeats twice in a row', () => {
  assert.equal(pickNextIndex(1, 0, () => 0.5), 0);
  for (const size of [5, 20]) {
    const firstPool = new Set();
    for (let i = 0; i < size; i++) {
      firstPool.add(pickNextIndex(size, -1, () => i / size));
    }
    assert.equal(firstPool.size, size);

    for (let last = 0; last < size; last++) {
      const seen = new Set();
      for (let step = 0; step < size - 1; step++) {
        const next = pickNextIndex(size, last, () => step / (size - 1));
        assert.notEqual(next, last);
        assert.ok(next >= 0 && next < size);
        seen.add(next);
      }
      assert.equal(seen.size, size - 1);
      assert.notEqual(pickNextIndex(size, last, () => 0.999999), last);
    }
  }
});
