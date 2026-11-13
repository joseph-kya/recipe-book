import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { textFor, amountsCreditFor } from '../src/recipe-i18n.js';
import { scaleAmount, offeredFactors } from '../src/scale.js';
import { parseDuration } from '../src/timer.js';
import { LANGS, initialLang, nextLang, ui } from '../src/i18n.js';
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
const measurement = /^[\d\s.,~+–×¼½¾⅓⅔()%°/-]*(?:g|ml|oz|EL|TL|h|min)?(?:[\d\s.,~+–×¼½¾⅓⅔()%°/-]+(?:g|ml|oz|EL|TL|h|min)?)*$/;
const leaks = /Unsalted swap\.|Metal pan, no cream bath\.|as published, cups \+ grams are the author's own|ingredient weight chart|\b(cups?|tbsp|tsp|pinch|size M|to taste|as needed|to dust|to serve)\b/i;
const deLeaksInFr = /\b(Tassen?|EL|TL|Prisen?|Größe M|nach Geschmack|nach Bedarf|zum Bestäuben|zum Servieren)\b/;
const quantities = (text) => text.match(/[\d¼½¾⅓⅔]+(?:[.,]\d+)?/g);

function complete(en, translated, path) {
  if (Array.isArray(en)) {
    assert.ok(Array.isArray(translated), `${path}: missing array`);
    assert.equal(translated.length, en.length, `${path}: entry count`);
    en.forEach((value, i) => complete(value, translated[i], `${path}[${i}]`));
  } else if (en && typeof en === 'object') {
    assert.ok(translated && typeof translated === 'object', `${path}: missing object`);
    for (const [key, value] of Object.entries(en)) {
      assert.ok(Object.hasOwn(translated, key), `${path}.${key}: missing key`);
      complete(value, translated[key], `${path}.${key}`);
    }
  } else if (typeof en === 'string') {
    assert.equal(typeof translated, 'string', `${path}: missing text`);
    if (en.trim()) assert.ok(translated.trim(), `${path}: empty translation`);
    if (en === translated && en.trim()) {
      assert.ok(sharedText.has(en) || measurement.test(en), `${path}: untranslated English: ${en}`);
    }
  }
}

for (const lang of ['de', 'fr']) {
  const label = lang === 'de' ? 'German' : 'French';
  for (const recipe of recipes) {
    test(`${recipe.slug}: complete ${label}, no English fallback or known leaks`, () => {
      complete(recipe.en, recipe[lang], `${recipe.slug}.${lang}`);
      const selected = textFor(recipe, lang);
      assert.equal(selected.lang, lang);
      assert.equal(selected.fallback, false);
      assert.equal(selected.text, recipe[lang]);
      assert.equal(textFor(recipe, 'en').text, recipe.en);
      assert.doesNotMatch(JSON.stringify(recipe[lang]), leaks);
      if (lang === 'fr') assert.doesNotMatch(JSON.stringify(recipe.fr), deLeaksInFr);
      if (recipe.amounts_credit?.en) {
        complete(recipe.amounts_credit.en, recipe.amounts_credit[lang], `${recipe.slug}.amounts_credit.${lang}`);
        const credit = amountsCreditFor(recipe, lang);
        assert.equal(credit.lang, lang);
        assert.equal(credit.label, recipe.amounts_credit[lang].label);
        assert.equal(credit.src, recipe.amounts_credit[lang].src);
        assert.doesNotMatch(JSON.stringify(credit), leaks);
      } else if (recipe.conversions) {
        assert.ok(recipe[lang].conversions, `${recipe.slug}: visible conversion credit needs ${label}`);
      }
      // Adding a language must not change the portion choices in English mode.
      assert.deepEqual(offeredFactors(recipe), offeredFactors({ ...recipe, de: undefined, fr: undefined }));
      for (const [gi, group] of recipe[lang].groups.entries()) {
        for (const [ii, item] of group.items.entries()) {
          for (const key of ['amount', 'metric']) {
            assert.deepEqual(quantities(item[key]), quantities(recipe.en.groups[gi].items[ii][key]), `${recipe.slug}: ${key} quantities changed`);
          }
          for (const factor of [0.1, 0.5, 2, 10]) {
            assert.doesNotMatch(scaleAmount(item.amount, factor, lang, true), leaks);
            assert.doesNotMatch(scaleAmount(item.metric, factor, lang, true), leaks);
          }
        }
      }
      // Every English step timer must parse to the same duration in German and French,
      // and French must match German's parsed step timers on every step.
      const enTimers = recipe.en.steps.map((s) => parseDuration(s.text, s.cue)?.seconds ?? null);
      const langTimers = recipe[lang].steps.map((s) => parseDuration(s.text, s.cue)?.seconds ?? null);
      enTimers.forEach((sec, idx) => {
        if (sec !== null) assert.equal(langTimers[idx], sec, `${recipe.slug}: ${lang} step ${idx + 1} timer mismatch`);
      });
      if (lang === 'fr') {
        const deTimers = recipe.de.steps.map((s) => parseDuration(s.text, s.cue)?.seconds ?? null);
        assert.deepEqual(langTimers, deTimers, `${recipe.slug}: fr step timers differ from de`);
      }
    });
  }
}

test('German and French chrome cover every English UI and theme key', () => {
  function keys(en, other, lang) {
    for (const [key, value] of Object.entries(en)) {
      assert.ok(Object.hasOwn(other, key), `missing ${lang} UI key: ${key}`);
      if (value === null) continue;
      if (typeof value === 'object') keys(value, other[key], lang);
      else assert.equal(typeof other[key], typeof value, `${lang}.${key}`);
    }
  }
  assert.deepEqual(LANGS, ['en', 'de', 'fr']);
  assert.equal(nextLang('en'), 'de');
  assert.equal(nextLang('de'), 'fr');
  assert.equal(nextLang('fr'), 'en');
  assert.equal(nextLang('unknown'), 'en');

  for (const lang of ['de', 'fr']) {
    keys(ui.en, ui[lang], lang);
    keys(themeText.en, themeText[lang], lang);
    assert.equal(themeText[lang].bites.length, 4);
    assert.equal(themeText[lang].tiers.length, MUFFIN_TIER_COUNT);
  }
  assert.equal(themeText.en.changeColor, 'Change color');
  assert.equal(themeText.de.changeColor, 'Farbe wechseln');
  assert.equal(themeText.fr.changeColor, 'Changer de couleur');
  assert.equal(themeText.en.bites.length, 4);
  assert.equal(themeText.en.tiers.length, MUFFIN_TIER_COUNT);
  assert.equal(MUFFIN_TIER_COUNT, 10);

  const allEnGone = new Set();
  const allDeGone = new Set();
  const allFrGone = new Set();
  const allEnReply = new Set();
  const allDeReply = new Set();
  const allFrReply = new Set();

  for (let tierIndex = 0; tierIndex < MUFFIN_TIER_COUNT; tierIndex++) {
    const enTier = themeText.en.tiers[tierIndex];
    const deTier = themeText.de.tiers[tierIndex];
    const frTier = themeText.fr.tiers[tierIndex];
    assert.ok(enTier.allGone.length >= 5, `tier ${tierIndex} needs at least 5 finish lines`);
    assert.equal(deTier.allGone.length, enTier.allGone.length, `tier ${tierIndex} DE finish line count mismatch`);
    assert.equal(frTier.allGone.length, enTier.allGone.length, `tier ${tierIndex} FR finish line count mismatch`);
    assert.ok(enTier.muffinReply.length >= 5, `tier ${tierIndex} needs at least 5 muffin replies`);
    assert.equal(deTier.muffinReply.length, enTier.muffinReply.length, `tier ${tierIndex} DE reply count mismatch`);
    assert.equal(frTier.muffinReply.length, enTier.muffinReply.length, `tier ${tierIndex} FR reply count mismatch`);

    for (let i = 0; i < enTier.allGone.length; i++) {
      const en = enTier.allGone[i];
      const de = deTier.allGone[i];
      const fr = frTier.allGone[i];
      assert.ok(en.trim().length > 0 && de.trim().length > 0 && fr.trim().length > 0);
      assert.notEqual(en, de);
      assert.notEqual(en, fr);
      assert.notEqual(de, fr);
      assert.ok(!allEnGone.has(en), `duplicate EN finish line: ${en}`);
      assert.ok(!allDeGone.has(de), `duplicate DE finish line: ${de}`);
      assert.ok(!allFrGone.has(fr), `duplicate FR finish line: ${fr}`);
      allEnGone.add(en);
      allDeGone.add(de);
      allFrGone.add(fr);
    }

    for (let i = 0; i < enTier.muffinReply.length; i++) {
      const en = enTier.muffinReply[i];
      const de = deTier.muffinReply[i];
      const fr = frTier.muffinReply[i];
      assert.ok(en.trim().length > 0 && de.trim().length > 0 && fr.trim().length > 0);
      assert.notEqual(en, de);
      assert.notEqual(en, fr);
      assert.notEqual(de, fr);
      assert.ok(!allEnReply.has(en), `duplicate EN muffin reply: ${en}`);
      assert.ok(!allDeReply.has(de), `duplicate DE muffin reply: ${de}`);
      assert.ok(!allFrReply.has(fr), `duplicate FR muffin reply: ${fr}`);
      allEnReply.add(en);
      allDeReply.add(de);
      allFrReply.add(fr);
    }
  }

  assert.equal(ui.de.languageEnglish, 'Englisch');
  assert.equal(ui.en.languageFrench, 'Français');
  assert.equal(ui.de.languageFrench, 'Französisch');
  assert.equal(ui.fr.languageEnglish, 'Anglais');
  assert.equal(ui.fr.languageGerman, 'Allemand');
  assert.equal(ui.fr.languageFrench, 'Français');
  assert.match(ui.en.switchLang, /\bEN\b[\s\S]*Deutsch/);
  assert.match(ui.de.switchLang, /\bDE\b[\s\S]*Französisch/);
  assert.match(ui.fr.switchLang, /\bFR\b[\s\S]*anglais/);
  assert.match(ui.en.switchToMetric, /\bcups\b/);
  assert.match(ui.en.switchToCups, /\bg\b/);
  assert.match(ui.de.switchToMetric, /\bTassen\b/);
  assert.match(ui.de.switchToCups, /\bg\b/);
  assert.match(ui.fr.switchToMetric, /\btasses\b/);
  assert.match(ui.fr.switchToCups, /\bg\b/);
  assert.ok(ui.en.keepAwake.trim().length > 0 && ui.de.keepAwake.trim().length > 0 && ui.fr.keepAwake.trim().length > 0);
  assert.match(ui.de.photoAlt('Zimtschnecken', 'Scientifically Sweet'), /Foto von/);
  assert.match(ui.fr.photoAlt('Roulés à la cannelle', 'Scientifically Sweet'), /photo de/);
  assert.match(ui.de.pdfLabel('Zimtschnecken'), /herunterladen/);
  assert.match(ui.fr.pdfLabel('Roulés à la cannelle'), /Télécharger[\s\S]*en anglais/);
  assert.match(ui.de.pageOf(2, 5), /Seite 2 von 5/);
  assert.match(ui.fr.pageOf(2, 5), /Page 2 sur 5/);
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

test('initialLang honors saved en/de/fr and detects de-* / fr-* from navigator.language', () => {
  const origStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const origNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const store = new Map();
  let navLang = 'en-US';
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k) => (store.has(k) ? store.get(k) : null) },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { get language() { return navLang; } },
  });
  try {
    navLang = 'fr-FR';
    assert.equal(initialLang(), 'fr');
    navLang = 'fr';
    assert.equal(initialLang(), 'fr');
    navLang = 'de-AT';
    assert.equal(initialLang(), 'de');
    navLang = 'es-ES';
    assert.equal(initialLang(), 'en');

    store.set('recipe-book:lang', 'fr');
    navLang = 'en-US';
    assert.equal(initialLang(), 'fr');

    store.set('recipe-book:lang', 'de');
    assert.equal(initialLang(), 'de');

    store.set('recipe-book:lang', 'it');
    navLang = 'fr-CA';
    assert.equal(initialLang(), 'fr');
  } finally {
    if (origStorage) Object.defineProperty(globalThis, 'localStorage', origStorage);
    else delete globalThis.localStorage;
    if (origNav) Object.defineProperty(globalThis, 'navigator', origNav);
    else delete globalThis.navigator;
  }
});

