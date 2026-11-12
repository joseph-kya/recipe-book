// Portion scaling rules, against the real recipe amounts. Run: node --test scripts/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { formatSpoons, roundMetric, scaleAmount, scaleStat, spoonTotal } from '../src/scale.js';

const dir = new URL('../content/recipes/', import.meta.url);
const recipes = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));

// every amount and metric value, with the language its recipe text is in
const amounts = recipes.flatMap((r) =>
  ['en', 'de']
    .filter((lang) => r[lang])
    .flatMap((lang) =>
      r[lang].groups.flatMap((g) => g.items.flatMap((it) => [it.amount, it.metric].map((text) => ({ text, lang, slug: r.slug })))),
    ),
);

const LEAVE = ['to taste', 'as needed', 'a splash', 'a little', 'to dust', 'to serve', 'optional', ''];

test('the real recipes give the tests something to chew on', () => {
  assert.ok(amounts.length > 100);
  assert.ok(amounts.some((a) => a.lang === 'de'));
});

test('1× always returns the JSON text untouched', () => {
  for (const { text, lang } of amounts) assert.equal(scaleAmount(text, 1, lang), text);
});

for (const factor of [0.5, 2]) {
  test(`spoon sums keep their total at ${factor}× (within ¼ tsp, or a pinch)`, () => {
    for (const { text, lang } of amounts) {
      const before = spoonTotal(text);
      if (before === null) continue;
      const out = scaleAmount(text, factor, lang);
      if (/pinch|Prise/.test(out)) {
        assert.ok(before * factor < 0.2, `${text} → ${out}`);
        continue;
      }
      const after = spoonTotal(out);
      assert.notEqual(after, null, `${text} → ${out} must stay a spoon sum`);
      assert.ok(Math.abs(after - before * factor) <= 0.25 + 1e-9, `${text} × ${factor} → ${out}`);
    }
  });

  test(`grams and ml follow the rounding rule at ${factor}×`, () => {
    for (const { text, lang } of amounts) {
      const m = String(text).match(/^(\d+(?:\.\d+)?) (g|ml)$/);
      if (!m) continue;
      const expected = roundMetric(Number(m[1]) * factor);
      const shown = lang === 'de' ? String(expected).replace('.', ',') : String(expected);
      assert.equal(scaleAmount(text, factor, lang), `${shown} ${m[2]}`);
    }
  });

  test(`words and empty values never change at ${factor}×`, () => {
    for (const { text, lang } of amounts) {
      if (LEAVE.includes(text)) assert.equal(scaleAmount(text, factor, lang), text);
    }
  });

  test(`no amount grows a long tail of parts at ${factor}×`, () => {
    for (const { text, lang } of amounts) {
      const out = scaleAmount(text, factor, lang);
      assert.ok(String(out).split(' + ').length <= 3, `${text} → ${out}`);
    }
  });
}

test('spoons normalise to readable cups, tablespoons and teaspoons', () => {
  const cases = [
    ['1 cup + 1½ tsp', 2, 'en', '2 cups + 1 tbsp'],
    ['1 cup + 1½ tsp', 0.5, 'en', '½ cup + ¾ tsp'],
    ['2 cups + 1 tbsp + 1 tsp', 2, 'en', '4 cups + 2 tbsp + 2 tsp'],
    ['2 cups + 1 tbsp + 1 tsp', 0.5, 'en', '1 cup + 2 tsp'],
    ['¼ cup + 1 tbsp + 2 tsp', 2, 'en', '⅔ cup + 2 tsp'],
    ['⅓ cup', 0.5, 'en', '2 tbsp + 2 tsp'],
    ['2 tbsp', 3, 'en', '6 tbsp'],
    ['¾ cup + 1 tbsp', 3, 'en', '2¼ cups + 3 tbsp'],
    ['4 tsp', 2, 'en', '2 tbsp + 2 tsp'],
    ['1¼ cups', 0.5, 'en', '½ cup + 2 tbsp'],
    ['¼ tsp', 0.5, 'en', '1 pinch'],
  ];
  for (const [text, f, lang, want] of cases) assert.equal(scaleAmount(text, f, lang), want, `${text} × ${f}`);
});

test('German amounts scale in German units', () => {
  const cases = [
    ['1 Tasse + 1½ TL', 2, '2 Tassen + 1 EL'],
    ['1 Tasse + 1½ TL', 0.5, '½ Tasse + ¾ TL'],
    ['¼ Tasse + 1 EL + 2 TL', 0.5, '2 EL + 2½ TL'],
    ['2 Tassen', 0.5, '1 Tasse'],
    ['½ Tasse (8 EL)', 2, '1 Tasse (16 EL)'],
    ['1½ EL', 0.5, '2¼ TL'],
    ['3 EL', 2, '6 EL'],
    ['½ TL', 0.5, '¼ TL'],
  ];
  for (const [text, f, want] of cases) assert.equal(scaleAmount(text, f, 'de'), want, `${text} × ${f}`);
  assert.equal(scaleAmount('1.5 g', 3, 'de'), '4,5 g');
});

test('qualifiers, parentheticals, ranges, pinches and countables', () => {
  const cases = [
    ['1 heaped cup', 2, '2 heaped cups'],
    ['1 heaped cup', 0.5, '½ heaped cup'],
    ['scant ½ cup', 2, 'scant 1 cup'],
    ['~1½ cups', 0.5, '~¾ cup'],
    ['½ cup (8 tbsp)', 2, '1 cup (16 tbsp)'],
    ['¼ cup (4 tbsp)', 0.5, '2 tbsp'],
    ['10–20 ml', 2, '20–40 ml'],
    ['1 pinch', 2, '2 pinches'],
    ['1 pinch', 0.5, '1 pinch'],
    ['pinch + ¼ tsp', 2, 'pinch + ½ tsp'],
    ['pinch + ¼ tsp', 0.5, '2 pinches'],
    ['4', 0.5, '2'],
    ['1', 0.5, '½'],
    ['½', 0.5, '½'],
    ['1 large', 2, '2 large'],
    ['4 (size M)', 2, '8 (size M)'],
    ['4 oz', 0.5, '2 oz'],
    ['175 g', 0.5, '88 g'],
    ['568 g', 2, '1135 g'],
    ['1.5 g', 0.5, '1 g'],
  ];
  for (const [text, f, want] of cases) assert.equal(scaleAmount(text, f, 'en'), want, `${text} × ${f}`);
});

test('only plain-number stats scale (yields), never times or kcal', () => {
  assert.equal(scaleStat('24', 0.5), '12');
  assert.equal(scaleStat('12', 2), '24');
  assert.equal(scaleStat('1', 0.5), '½');
  assert.equal(scaleStat('2', 3), '6');
  for (const v of ['30 min', '35 Min', '~1 h 15 min', '470 kcal · 48 g protein', '30–40 min', '5 + 5 + 5 min']) {
    assert.equal(scaleStat(v, 2), v);
  }
});

test('metric rounding: under 10 to 0.5, under 100 whole, else nearest 5', () => {
  assert.equal(roundMetric(5.4), 5.5);
  assert.equal(roundMetric(87.5), 88);
  assert.equal(roundMetric(1136), 1135);
  assert.equal(formatSpoons(0.1, 'en'), '1 pinch');
});
