import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { textFor, amountsCreditFor } from '../src/recipe-i18n.js';
import { scaleAmount, offeredFactors } from '../src/scale.js';
import { ui } from '../src/i18n.js';
import { themeText } from '../src/theme-i18n.js';

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
  assert.equal(ui.de.languageEnglish, 'Englisch');
  assert.match(ui.de.photoAlt('Zimtschnecken', 'Scientifically Sweet'), /Foto von/);
  assert.match(ui.de.pdfLabel('Zimtschnecken'), /herunterladen/);
  assert.match(ui.de.pageOf(2, 5), /Seite 2 von 5/);
});
