import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  computeDifficulty,
  computeTotalTime,
  formatTotalTime,
  parseStatTime,
  recipeSummary,
} from '../src/recipeMeta.js';
import { readingCopyFor, readingText } from '../src/recipe-reading-i18n.js';

const recipesDir = new URL('../content/recipes/', import.meta.url);
const recipes = readdirSync(recipesDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, recipesDir), 'utf8')));

test('parseStatTime parses minutes, hours, ranges, sums and ignores non-time stats', () => {
  assert.deepEqual(parseStatTime('30 min'), { min: 30, max: 30, approx: false });
  assert.deepEqual(parseStatTime('~20 min'), { min: 20, max: 20, approx: true });
  assert.deepEqual(parseStatTime('30–40 min'), { min: 30, max: 40, approx: false });
  assert.deepEqual(parseStatTime('2 hrs'), { min: 120, max: 120, approx: false });
  assert.deepEqual(parseStatTime('5 + 5 + 5 min'), { min: 15, max: 15, approx: false });
  assert.deepEqual(parseStatTime('10 + 45 min'), { min: 55, max: 55, approx: false });
  assert.deepEqual(parseStatTime('1–2 h + 30–60 min'), { min: 90, max: 180, approx: false });
  assert.deepEqual(parseStatTime('~1 h 15 min'), { min: 75, max: 75, approx: true });
  assert.equal(parseStatTime('24'), null);
  assert.equal(parseStatTime('~100 kcal · 8 g protein'), null);
  assert.equal(parseStatTime(''), null);
});

test('recipeSummary computes honest total time and difficulty for every real recipe', () => {
  const bySlug = Object.fromEntries(recipes.map((r) => [r.slug, recipeSummary(r)]));

  assert.equal(bySlug['berry-quark-bake'].totalTimeLabel, '~50–60 min');
  assert.equal(bySlug['berry-quark-bake'].difficulty.key, 'easy');

  assert.equal(bySlug['best-classic-cinnamon-rolls'].totalTimeLabel, '1 h 50–3 h 25');
  assert.equal(bySlug['best-classic-cinnamon-rolls'].difficulty.key, 'involved');

  assert.equal(bySlug['fudge-brownies'].totalTimeLabel, '1 h 5 min');
  assert.equal(bySlug['fudge-brownies'].difficulty.key, 'easy');

  assert.equal(bySlug['lotus-cheesecake'].totalTimeLabel, '2 h 30 min');
  assert.equal(bySlug['lotus-cheesecake'].difficulty.key, 'medium');

  // Uses the explicit total stat without double-counting the oven sub-stat.
  assert.equal(bySlug['protein-cloud-cheesecake'].totalTimeLabel, '~1 h 15 min');
  assert.equal(bySlug['protein-cloud-cheesecake'].difficulty.key, 'medium');

  assert.equal(bySlug['topfenschmarren'].totalTimeLabel, '15 min');
  assert.equal(bySlug['topfenschmarren'].difficulty.key, 'easy');

  for (const r of recipes) {
    const summary = bySlug[r.slug];
    assert.ok(summary.totalTime && summary.totalTime.min > 0, `${r.slug}: missing totalTime`);
    assert.ok(summary.totalTimeLabel, `${r.slug}: missing totalTimeLabel`);
    assert.ok([1, 2, 3].includes(summary.difficulty.level), `${r.slug}: invalid difficulty level`);
  }
});

test('computeTotalTime and formatTotalTime handle edge cases cleanly', () => {
  assert.equal(computeTotalTime({ en: { stats: [{ value: '12', label: 'cookies' }] } }), null);
  assert.equal(formatTotalTime(null), null);
  assert.equal(formatTotalTime({ min: 60, max: 120, approx: false }), '1–2 h');
  assert.equal(formatTotalTime({ min: 120, max: 120, approx: false }), '2 h');
  assert.equal(computeDifficulty({ en: { groups: [], steps: [] } }, null).key, 'easy');
});

test('readingText covers EN, DE, and FR with complete keys and distinct translations', () => {
  function checkKeys(en, other, lang) {
    for (const [key, value] of Object.entries(en)) {
      assert.ok(Object.hasOwn(other, key), `missing ${lang} readingText key: ${key}`);
      if (typeof value === 'object' && value !== null) {
        checkKeys(value, other[key], lang);
      } else {
        assert.equal(typeof other[key], typeof value, `${lang}.${key} type mismatch`);
        if (typeof value === 'string') {
          assert.ok(other[key].trim().length > 0, `${lang}.${key} empty`);
        }
      }
    }
  }
  for (const lang of ['de', 'fr']) {
    checkKeys(readingText.en, readingText[lang], lang);
    assert.notEqual(readingText.en.effort, readingText[lang].effort);
    assert.notEqual(readingText.en.difficulty.easy, readingText[lang].difficulty.easy);
    assert.notEqual(readingText.en.difficulty.involved, readingText[lang].difficulty.involved);
    assert.notEqual(readingText.en.currentStep, readingText[lang].currentStep);
  }
  assert.equal(readingCopyFor('unknown'), readingText.en);
  assert.equal(readingCopyFor('de'), readingText.de);
  assert.equal(readingCopyFor('fr'), readingText.fr);
});

test('Ingredients, Method, and recipe-reading.css preserve tactile flat-retro contracts', () => {
  const ingredientsSrc = readFileSync(new URL('../src/Ingredients.jsx', import.meta.url), 'utf8');
  const methodSrc = readFileSync(new URL('../src/Method.jsx', import.meta.url), 'utf8');
  const readingCss = readFileSync(new URL('../src/recipe-reading.css', import.meta.url), 'utf8');

  assert.match(ingredientsSrc, /import '\.\/recipe-reading\.css';/);
  assert.match(ingredientsSrc, /<RecipeGlance recipe=\{recipe\} lang=\{lang\} \/>/);
  assert.match(ingredientsSrc, /className="menu-bar"/);
  assert.match(ingredientsSrc, /<StepProgress className="menu-progress" doneCount=\{gotCount\} totalSteps=\{totalItems\} \/>/);

  assert.match(methodSrc, /import '\.\/recipe-reading\.css';/);
  assert.match(methodSrc, /className="step-head-btn"/);
  assert.match(methodSrc, /isCurrent && 'step--current'/);

  // 44px touch targets, reduced motion, no glows/drop-shadow/chevrons.
  assert.match(readingCss, /\.ticket \.step-head-btn\s*\{[\s\S]*min-height:\s*2\.75rem;/);
  assert.match(readingCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(readingCss, /box-shadow:|drop-shadow|backdrop-filter|radial-gradient|linear-gradient/);
});
