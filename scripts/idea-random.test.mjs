import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  LAST_RANDOM_KEY,
  buildShuffleFrames,
  dieFaceForRecipe,
  getLastRandomSlug,
  pickRandomRecipe,
  randomCopyFor,
  randomText,
  resetLastRandomSlug,
  setLastRandomSlug,
} from '../src/random-recipe.js';

const recipesDir = new URL('../content/recipes/', import.meta.url);
const realRecipes = readdirSync(recipesDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f, i) => ({ no: i + 1, ...JSON.parse(readFileSync(new URL(f, recipesDir), 'utf8')) }));

test('pickRandomRecipe never repeats the same recipe twice in a row and reaches every recipe', () => {
  assert.equal(pickRandomRecipe([]), null);
  assert.equal(pickRandomRecipe([realRecipes[0]], realRecipes[0].slug), realRecipes[0]);

  // Two-recipe list strictly alternates on every roll regardless of RNG value.
  const pair = realRecipes.slice(0, 2);
  for (const r of [0, 0.25, 0.5, 0.999, 1, -0.5, NaN]) {
    assert.equal(pickRandomRecipe(pair, pair[0].slug, () => r).slug, pair[1].slug);
    assert.equal(pickRandomRecipe(pair, pair[1].slug, () => r).slug, pair[0].slug);
  }

  // Over all real recipes, 500 consecutive picks never repeat back-to-back and hit all recipes.
  let seed = 1337;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  let prev = null;
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const picked = pickRandomRecipe(realRecipes, prev, rng);
    assert.ok(picked, 'expected a picked recipe');
    assert.notEqual(picked.slug, prev, `repeated ${prev} on draw ${i}`);
    prev = picked.slug;
    seen.add(picked.slug);
  }
  assert.equal(seen.size, realRecipes.length, 'every recipe should be reachable');
});

test('last random slug persists in storage and falls back cleanly when storage is blocked', () => {
  const store = new Map();
  const mockStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };

  resetLastRandomSlug(mockStorage);
  assert.equal(getLastRandomSlug(mockStorage), null);

  setLastRandomSlug('fudge-brownies', mockStorage);
  assert.equal(store.get(LAST_RANDOM_KEY), 'fudge-brownies');
  assert.equal(getLastRandomSlug(mockStorage), 'fudge-brownies');

  const blocked = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => { throw new Error('blocked'); },
  };
  setLastRandomSlug('topfenschmarren', blocked);
  assert.equal(getLastRandomSlug(blocked), 'topfenschmarren');
  resetLastRandomSlug(mockStorage);
});

test('dieFaceForRecipe and buildShuffleFrames vary faces cleanly before landing on the winner', () => {
  assert.equal(dieFaceForRecipe({ no: 1 }), 1);
  assert.equal(dieFaceForRecipe({ no: 6 }), 6);
  assert.equal(dieFaceForRecipe({ no: 7 }), 1);
  assert.equal(dieFaceForRecipe({ no: 0 }, 5), 5);
  assert.equal(dieFaceForRecipe(null, 5), 5);

  const winner = realRecipes[2];
  const winnerFace = dieFaceForRecipe(winner);
  const frames = buildShuffleFrames(realRecipes, winner, 3, () => 0.42);
  assert.equal(frames.length, 3);
  for (let i = 0; i < frames.length; i++) {
    assert.ok(frames[i].face >= 1 && frames[i].face <= 6);
    assert.notEqual(frames[i].recipe.slug, winner.slug);
    if (i > 0) assert.notEqual(frames[i].face, frames[i - 1].face);
  }
  assert.notEqual(frames.at(-1).face, winnerFace, 'final shuffle step should differ from landing face');
  assert.deepEqual(buildShuffleFrames([], winner, 3), []);
});

test('randomText covers EN, DE, and FR with natural labels, accessible names, and no leaks', () => {
  for (const lang of ['en', 'de', 'fr']) {
    const copy = randomCopyFor(lang);
    assert.equal(copy, randomText[lang]);
    assert.ok(copy.label.trim().length > 0);
    assert.ok(copy.ariaLabel.startsWith(copy.label), `${lang} ariaLabel should start with visible label`);
    assert.ok(copy.opening('Topfenschmarren').includes('Topfenschmarren'));
  }
  assert.equal(randomCopyFor('unknown'), randomText.en);
  assert.notEqual(randomText.en.label, randomText.de.label);
  assert.notEqual(randomText.en.label, randomText.fr.label);
  assert.notEqual(randomText.de.label, randomText.fr.label);
  assert.match(randomText.fr.opening('Brownies'), /Ouverture : Brownies/);
  assert.doesNotMatch(JSON.stringify(randomText.de), /\b(surprise|random|recipe)\b/i);
  assert.doesNotMatch(JSON.stringify(randomText.fr), /\b(surprise|random|recipe)\b/i);
});

test('CoverRandom and idea-random.css preserve flat-retro, 44px target, and reduced-motion contracts', () => {
  const pagesSrc = readFileSync(new URL('../src/pages.jsx', import.meta.url), 'utf8');
  const randomSrc = readFileSync(new URL('../src/CoverRandom.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/idea-random.css', import.meta.url), 'utf8');

  assert.match(pagesSrc, /import CoverRandom from '\.\/CoverRandom\.jsx';/);
  assert.match(pagesSrc, /<CoverRandom lang=\{lang\} \/>/);
  assert.match(randomSrc, /import '\.\/idea-random\.css';/);
  assert.match(randomSrc, /reducedMotion\(\)/);
  assert.match(randomSrc, /aria-live="polite"/);
  assert.doesNotMatch(randomSrc, /filter=|drop-shadow|linearGradient|radialGradient/);

  // 44px touch targets, instant tap feedback, flat retro, reduced motion.
  assert.match(css, /\.cover-random-btn\s*\{[\s\S]*min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
  assert.match(css, /\.cover-random-btn\s*\{[\s\S]*touch-action:\s*manipulation;/);
  assert.match(css, /\.cover-random-btn:active\s*\{[\s\S]*transition-duration:\s*55ms;/);
  assert.doesNotMatch(css, /box-shadow:|text-shadow:|drop-shadow|backdrop-filter|radial-gradient|linear-gradient|glow/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

  // Every @keyframes block animates only transform and opacity.
  for (const [, name, body] of css.matchAll(/@keyframes\s+([a-z-]+)\s*\{([\s\S]*?)\n\}/g)) {
    for (const prop of [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1])) {
      assert.ok(prop === 'transform' || prop === 'opacity', `@keyframes ${name} uses non-composited property: ${prop}`);
    }
  }
});
