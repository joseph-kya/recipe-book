import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RECIPE_LANGS,
  normalizePhoto,
  normalizeRecipe,
  slimLangBlock,
  slimNutrition,
  sortAndNumberRecipes,
  splitRecipesByLang,
  validateRecipe,
} from '../src/recipe-data.js';
import { textFor } from '../src/recipe-i18n.js';
import { offeredFactors } from '../src/scale.js';
import { loadRecipeBundle } from '../vite.config.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const RECIPES_DIR = join(ROOT, 'content', 'recipes');

const minimalRaw = (overrides = {}) => ({
  en: {
    title: 'Apple Crumble',
    groups: [
      {
        title: 'Filling',
        items: [
          { amount: '2 cups', metric: '250 g', name: 'apples', note: null },
          { amount: '1 pinch', metric: '', name: 'cinnamon' },
        ],
      },
    ],
    steps: [{ title: 'Bake.', text: 'Bake 30 min at 180 °C.' }],
  },
  ...overrides,
});

test('loadRecipeBundle loads all real recipes, preserves content, slims metadata, and splits languages', () => {
  const { base, byLang } = loadRecipeBundle(ROOT);
  const rawFiles = readdirSync(RECIPES_DIR).filter((f) => f.endsWith('.json')).sort();
  assert.equal(base.length, rawFiles.length);
  assert.deepEqual(base.map((r) => r.no), rawFiles.map((_, i) => i + 1));

  for (const fileName of rawFiles) {
    const raw = JSON.parse(readFileSync(join(RECIPES_DIR, fileName), 'utf8'));
    const entry = base.find((r) => r.slug === raw.slug);
    assert.ok(entry, `missing base entry for ${raw.slug}`);
    assert.equal(entry.route, raw.route || raw.slug);
    assert.equal('photoCredit' in entry, false, 'dead photoCredit field should be omitted');
    assert.equal('number' in entry, false, 'internal sort number should be omitted');
    assert.equal('en' in entry, false, 'full trilingual recipe should move en to byLang');
    assert.equal('de' in entry, false, 'full trilingual recipe should move de to byLang');
    assert.equal('fr' in entry, false, 'full trilingual recipe should move fr to byLang');
    assert.deepEqual(entry.offered, offeredFactors(raw), `${raw.slug}: precomputed offered factors`);
    assert.equal(entry.pdf, `/content/pdfs/${raw.slug}.pdf`);

    if (entry.nutrition) {
      assert.equal('ingredients' in entry.nutrition, false);
      assert.equal('left_out' in entry.nutrition, false);
      assert.equal('sugar' in entry.nutrition.per_serving, false);
      assert.deepEqual(Object.keys(entry.nutrition.per_serving).sort(), ['carbs', 'fat', 'kcal', 'protein']);
    }

    for (const lang of RECIPE_LANGS) {
      const slim = byLang[lang][raw.slug];
      assert.ok(slim, `${raw.slug}: missing ${lang} chunk`);
      assert.equal('sticker' in slim, false);
      assert.equal('tagline_grams' in slim, false);
      assert.equal(slim.title, raw[lang].title);
      assert.deepEqual(slim.title_lines, raw[lang].title_lines);
      assert.deepEqual(slim.stats, raw[lang].stats);
      assert.equal(slim.steps.length, raw[lang].steps.length);
      slim.steps.forEach((step, idx) => {
        assert.equal(step.title, raw[lang].steps[idx].title);
        assert.equal(step.text, raw[lang].steps[idx].text);
        assert.equal(step.cue ?? null, raw[lang].steps[idx].cue ?? null);
      });
      slim.groups.forEach((group, gi) => {
        const rawGroup = raw[lang].groups[gi];
        assert.equal(group.items.length, rawGroup.items.length);
        group.items.forEach((item, ii) => {
          assert.equal(item.amount, rawGroup.items[ii].amount);
          assert.equal(item.metric ?? '', rawGroup.items[ii].metric ?? '');
          assert.equal(item.name, rawGroup.items[ii].name);
          assert.equal(item.note ?? null, rawGroup.items[ii].note ?? null);
        });
      });
    }
  }
});

test('dropping a minimal single JSON + PDF works with zero index edits and falls back in DE/FR', () => {
  const dir = mkdtempSync(join(tmpdir(), 'recipe-book-dropin-'));
  try {
    mkdirSync(join(dir, 'content', 'recipes'), { recursive: true });
    mkdirSync(join(dir, 'content', 'pdfs'), { recursive: true });
    mkdirSync(join(dir, 'public', 'photos'), { recursive: true });

    writeFileSync(join(dir, 'content', 'recipes', 'apple-crumble.json'), JSON.stringify(minimalRaw()));
    writeFileSync(join(dir, 'content', 'pdfs', 'apple-crumble.pdf'), '%PDF-1.4\n');
    writeFileSync(join(dir, 'public', 'photos', 'apple-crumble-400.webp'), 'RIFF');

    const { base, byLang } = loadRecipeBundle(dir);
    assert.equal(base.length, 1);
    const r = base[0];
    assert.equal(r.slug, 'apple-crumble');
    assert.equal(r.route, 'apple-crumble');
    assert.equal(r.no, 1);
    assert.equal(r.pdf, '/content/pdfs/apple-crumble.pdf');
    assert.equal(r.gramsPdf, null);
    assert.deepEqual(r.photo, { path: 'photos/apple-crumble', credit: null });
    assert.equal(r.nutrition, null);
    assert.deepEqual(r.offered, [0.5, 1, 1.5, 2, 3]);

    // Missing de/fr keeps en on base so textFor falls back synchronously.
    assert.ok(r.en);
    assert.deepEqual(r.en.title_lines, ['Apple Crumble']);
    assert.deepEqual(r.en.stats, []);
    assert.equal(r.en.ingredients_headline, 'Ingredients');
    assert.equal(r.en.method_headline, 'Method');
    assert.equal('en' in byLang && 'apple-crumble' in byLang.en, false);
    assert.equal('apple-crumble' in byLang.de, false);
    assert.equal('apple-crumble' in byLang.fr, false);

    const de = textFor(r, 'de');
    assert.equal(de.lang, 'en');
    assert.equal(de.fallback, true);
    assert.equal(de.text.title, 'Apple Crumble');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('inline photo and nutrition on a recipe JSON are normalized and slimmed', () => {
  const recipe = normalizeRecipe(
    minimalRaw({
      photo: 'photos/apple-crumble',
      nutrition: {
        servings: 4,
        serving_basis: '4 slices',
        per_serving: { kcal: 240, protein: 4, carbs: 38, fat: 8, sugar: 19 },
        total: { kcal: 960, protein: 16 },
        ingredients: [{ ingredient: 'apples', grams: 250 }],
      },
    }),
    { fileName: 'apple-crumble.json' },
  );
  assert.deepEqual(recipe.photo, { path: 'photos/apple-crumble', credit: null });
  assert.deepEqual(recipe.nutrition, {
    servings: 4,
    serving_basis: '4 slices',
    per_serving: { kcal: 240, protein: 4, carbs: 38, fat: 8 },
    total: { kcal: 960 },
  });
  assert.equal(slimNutrition(null), null);
  assert.equal(normalizePhoto(null), null);
});

test('slimLangBlock strips PDF-only fields and empty nulls while preserving recipe data', () => {
  const slim = slimLangBlock({
    title: 'Brownies',
    sticker: ['Fudgy!'],
    tagline_grams: 'Metric tagline',
    sticker_grams: ['Grams!'],
    tips_grams: [{ title: 'T', text: 'B' }],
    groups: [{ title: 'Batter', items: [{ amount: '1 cup', metric: '', name: 'flour', note: null }] }],
    steps: [{ title: 'Mix.', text: 'Stir together.', cue: null }],
  });
  assert.equal('sticker' in slim, false);
  assert.equal('tagline_grams' in slim, false);
  assert.equal('sticker_grams' in slim, false);
  assert.equal('tips_grams' in slim, false);
  assert.deepEqual(slim.groups[0].items[0], { amount: '1 cup', name: 'flour' });
  assert.deepEqual(slim.steps[0], { title: 'Mix.', text: 'Stir together.' });
});

test('validation rejects malformed recipes, duplicate slugs, and duplicate routes', () => {
  assert.throws(() => validateRecipe(null, 'bad.json'), /must be an object/);
  assert.throws(() => validateRecipe({}, 'bad.json'), /missing required "en"/);
  assert.throws(() => validateRecipe({ en: { title: '' } }, 'bad.json'), /missing required "en\.title"/);
  assert.throws(() => validateRecipe({ en: { title: 'X', groups: [], steps: [{}] } }, 'bad.json'), /en\.groups/);
  assert.throws(() => validateRecipe({ en: { title: 'X', groups: [{}], steps: [] } }, 'bad.json'), /en\.steps/);

  const a = normalizeRecipe(minimalRaw({ slug: 'dup', route: 'r1', number: 2 }));
  const b = normalizeRecipe(minimalRaw({ slug: 'dup', route: 'r2', number: 1 }));
  assert.throws(() => sortAndNumberRecipes([a, b]), /Duplicate recipe slug/);

  const c = normalizeRecipe(minimalRaw({ slug: 'one', route: 'same', number: 2 }));
  const d = normalizeRecipe(minimalRaw({ slug: 'two', route: 'same', number: 1 }));
  assert.throws(() => sortAndNumberRecipes([c, d]), /Duplicate recipe route/);
});

test('sortAndNumberRecipes orders by number, puts unnumbered recipes last by slug, and numbers contiguously', () => {
  const list = [
    normalizeRecipe(minimalRaw({ slug: 'zebra' })),
    normalizeRecipe(minimalRaw({ slug: 'second', number: 20 })),
    normalizeRecipe(minimalRaw({ slug: 'alpha' })),
    normalizeRecipe(minimalRaw({ slug: 'first', number: 5 })),
  ];
  const sorted = sortAndNumberRecipes(list);
  assert.deepEqual(sorted.map((r) => [r.no, r.slug]), [
    [1, 'first'],
    [2, 'second'],
    [3, 'alpha'],
    [4, 'zebra'],
  ]);
  const { base } = splitRecipesByLang(sorted);
  assert.equal(base.length, 4);
});

test('src/theme.js keeps THEMES decoupled from runtime helpers for tree-shaking', () => {
  const themeSrc = readFileSync(new URL('../src/theme.js', import.meta.url), 'utf8');
  assert.match(themeSrc, /export const THEME_IDS = Object\.keys\(GROUNDS\);/);
  assert.match(themeSrc, /GROUNDS\[safe\]/);
  assert.doesNotMatch(themeSrc, /THEMES\[safe\]/);
});
