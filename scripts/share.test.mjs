import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  formatScaleBadge,
  hashForSpread,
  recipeHash,
  recipeShareUrl,
  routeOfHash,
  shareRecipe,
  spreadMatchesRoute,
} from '../src/share.js';
import { shareCopyFor, shareText } from '../src/share-i18n.js';

const recipesDir = new URL('../content/recipes/', import.meta.url);
const recipes = readdirSync(recipesDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, recipesDir), 'utf8')));

function mockSpreads() {
  const spreads = [
    { route: '', kind: 'cover', offset: 0 },
    { route: 'contents', kind: 'contents', offset: 0 },
  ];
  for (const r of recipes) {
    const route = r.route || r.slug;
    spreads.push({ route, kind: 'recipe', recipe: { slug: r.slug, route }, offset: 0 });
    spreads.push({ route, kind: 'recipe', recipe: { slug: r.slug, route }, offset: 1 });
  }
  return spreads;
}

const findFirst = (spreads, route) => {
  const idx = spreads.findIndex((s) => spreadMatchesRoute(s, route));
  return idx === -1 ? 0 : idx;
};

test('deep link hashes parse and resolve #/r/<slug>, #/r/<route>, #/<route>, and #/<slug> for every recipe', () => {
  const spreads = mockSpreads();

  assert.equal(findFirst(spreads, routeOfHash('')), 0);
  assert.equal(findFirst(spreads, routeOfHash('#/')), 0);
  assert.equal(findFirst(spreads, routeOfHash('#/contents')), 1);
  assert.equal(findFirst(spreads, routeOfHash('#/contents/')), 1);
  assert.equal(findFirst(spreads, routeOfHash('#/r/does-not-exist')), 0);
  assert.equal(findFirst(spreads, routeOfHash('#/r/%E0%A4%A')), 0);

  for (const r of recipes) {
    const route = r.route || r.slug;
    const expected = spreads.findIndex((s) => s.recipe?.slug === r.slug && s.offset === 0);
    assert.ok(expected >= 2, `${r.slug}: expected spread index`);

    for (const hash of [
      recipeHash(r),
      `#/r/${r.slug}`,
      `#/r/${r.slug}/`,
      `#/r/${r.slug.toUpperCase()}`,
      `#/r/${r.slug}?utm_source=msg`,
      `#/r/${route}`,
      `#/${route}`,
      `#/${r.slug}`,
    ]) {
      assert.equal(findFirst(spreads, routeOfHash(hash)), expected, `${r.slug} failed for ${hash}`);
    }

    assert.equal(hashForSpread(spreads[expected]), `#/r/${r.slug}`);
    assert.equal(spreadMatchesRoute(spreads[expected], routeOfHash(hashForSpread(spreads[expected]))), true);
  }

  assert.equal(hashForSpread(spreads[0]), '#/');
  assert.equal(hashForSpread(spreads[1]), '#/contents');
});

test('recipeShareUrl preserves origin and base path while emitting canonical #/r/<slug>', () => {
  const r = { slug: 'fudge-brownies', route: 'brownies' };
  assert.equal(
    recipeShareUrl(r, { href: 'https://joseph.example/recipe-book/#/brownies' }),
    'https://joseph.example/recipe-book/#/r/fudge-brownies',
  );
  assert.equal(
    recipeShareUrl(r, { href: 'http://localhost:5173/' }),
    'http://localhost:5173/#/r/fudge-brownies',
  );
  assert.equal(recipeShareUrl(r, null), '#/r/fudge-brownies');
});

test('shareRecipe prefers navigator.share, honors AbortError, and falls back to clipboard cleanly', async () => {
  const calls = [];
  const nativeNav = {
    share: async (payload) => {
      calls.push(['share', payload]);
    },
    clipboard: {
      writeText: async (text) => {
        calls.push(['clipboard', text]);
      },
    },
  };

  assert.equal(
    await shareRecipe({ title: 'Fudge Brownies', url: 'https://x.test/#/r/fudge-brownies', nav: nativeNav }),
    'shared',
  );
  assert.deepEqual(calls, [['share', { title: 'Fudge Brownies', url: 'https://x.test/#/r/fudge-brownies' }]]);

  // Cancelling native share must not silently copy to clipboard.
  const abortNav = {
    share: async () => {
      const err = new Error('User cancelled');
      err.name = 'AbortError';
      throw err;
    },
    clipboard: {
      writeText: async () => {
        calls.push(['unexpected-clipboard']);
      },
    },
  };
  assert.equal(
    await shareRecipe({ title: 'Fudge Brownies', url: 'https://x.test/#/r/fudge-brownies', nav: abortNav }),
    'aborted',
  );
  assert.equal(calls.length, 1);

  // Non-abort share error falls back to navigator.clipboard.writeText.
  const fallbackNav = {
    share: async () => {
      throw new TypeError('share blocked');
    },
    clipboard: {
      writeText: async (text) => {
        calls.push(['fallback-clipboard', text]);
      },
    },
  };
  assert.equal(
    await shareRecipe({ title: 'Fudge Brownies', url: 'https://x.test/#/r/fudge-brownies', nav: fallbackNav }),
    'copied',
  );
  assert.deepEqual(calls[1], ['fallback-clipboard', 'https://x.test/#/r/fudge-brownies']);

  // Desktop without navigator.share uses clipboard directly.
  const desktopNav = {
    clipboard: {
      writeText: async (text) => {
        calls.push(['desktop-clipboard', text]);
      },
    },
  };
  assert.equal(
    await shareRecipe({ title: 'Fudge Brownies', url: 'https://x.test/#/r/fudge-brownies', nav: desktopNav }),
    'copied',
  );
  assert.deepEqual(calls[2], ['desktop-clipboard', 'https://x.test/#/r/fudge-brownies']);

  // Legacy textarea fallback works when clipboard API is unavailable.
  let copiedText = '';
  const fakeDoc = {
    body: { appendChild: () => {} },
    createElement: () => ({
      value: '',
      style: {},
      setAttribute: () => {},
      select() {
        copiedText = this.value;
      },
      remove: () => {},
    }),
    execCommand: (cmd) => cmd === 'copy',
  };
  assert.equal(
    await shareRecipe({ title: 'Fudge Brownies', url: 'https://x.test/#/r/fudge-brownies', nav: {}, doc: fakeDoc }),
    'copied',
  );
  assert.equal(copiedText, 'https://x.test/#/r/fudge-brownies');

  assert.equal(await shareRecipe({ title: 'Empty', url: '' }), 'empty');
});

test('shareText covers EN, Austrian DE, and FR with complete keys and distinct translations', () => {
  for (const lang of ['de', 'fr']) {
    for (const [key, value] of Object.entries(shareText.en)) {
      assert.ok(Object.hasOwn(shareText[lang], key), `missing ${lang}.${key}`);
      assert.equal(typeof shareText[lang][key], typeof value, `${lang}.${key} type mismatch`);
      if (typeof value === 'string') {
        assert.ok(shareText[lang][key].trim().length > 0, `${lang}.${key} empty`);
        assert.notEqual(shareText[lang][key], value, `${lang}.${key} matches EN`);
      }
    }
  }
  assert.equal(shareCopyFor('unknown'), shareText.en);
  assert.equal(shareCopyFor('de'), shareText.de);
  assert.equal(shareCopyFor('fr'), shareText.fr);
  assert.match(shareText.de.shareTitle('Topfenschmarren'), /Topfenschmarren teilen/);
  assert.match(shareText.fr.shareTitle('Topfenschmarren'), /Partager Topfenschmarren/);
  assert.equal(formatScaleBadge(2, false, 'en'), '2×');
  assert.equal(formatScaleBadge(0.5, false, 'en'), '½×');
  assert.equal(formatScaleBadge(1.7, true, 'de'), '1,7×');
  assert.equal(formatScaleBadge(1.7, true, 'fr'), '1,7×');
  assert.equal(formatScaleBadge(1.7, true, 'en'), '1.7×');
});

test('idea-share.css preserves flat retro craft, 44px touch targets, reduced motion, and ink-friendly A4 print rules', () => {
  const css = readFileSync(new URL('../src/idea-share.css', import.meta.url), 'utf8');
  const shareSrc = readFileSync(new URL('../src/Share.jsx', import.meta.url), 'utf8');
  const pagesSrc = readFileSync(new URL('../src/pages.jsx', import.meta.url), 'utf8');
  const bookSrc = readFileSync(new URL('../src/Book.jsx', import.meta.url), 'utf8');

  assert.match(shareSrc, /import '\.\/idea-share\.css';/);
  assert.match(pagesSrc, /<ShareButton\b/);
  assert.match(bookSrc, /<PrintRecipe\b/);

  // 44px touch target, small inner visual face, reduced-motion fallback, zero glows/shadows/gradients.
  assert.match(css, /\.share-btn\s*\{[\s\S]*min-width:\s*44px;[\s\S]*min-height:\s*44px;/);
  assert.match(css, /\.share-btn-face\s*\{[\s\S]*width:\s*2rem;[\s\S]*height:\s*2rem;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /box-shadow:|drop-shadow|backdrop-filter|radial-gradient|linear-gradient/);

  // A4 single-page ink-friendly print stylesheet.
  assert.match(css, /@page\s*\{[\s\S]*size:\s*A4 portrait;/);
  assert.match(css, /@media print\s*\{/);
  assert.match(css, /background:\s*#fff\s*!important;/);
  assert.match(css, /color:\s*#111\s*!important;/);
  assert.match(css, /\.print-sheet--dense\b/);
});
