import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FAV_KEY,
  decrementBaked,
  getBakedCount,
  incrementBaked,
  isFavorite,
  reloadFav,
  sortFavoritesFirst,
  subscribeFav,
  toggleFavorite,
} from '../src/fav.js';
import { favCopyFor, favText } from '../src/fav-i18n.js';

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

test('favorites and baked counts persist per recipe, survive reload, and ignore bad data', () => {
  const storage = makeStorage();
  reloadFav(storage);

  assert.equal(isFavorite('fudge-brownies'), false);
  assert.equal(getBakedCount('fudge-brownies'), 0);

  assert.equal(toggleFavorite('fudge-brownies', storage), true);
  assert.equal(isFavorite('fudge-brownies'), true);
  assert.equal(incrementBaked('fudge-brownies', storage), 1);
  assert.equal(incrementBaked('fudge-brownies', storage), 2);
  assert.equal(incrementBaked('lotus-cheesecake', storage), 1);

  const saved = JSON.parse(storage.getItem(FAV_KEY));
  assert.deepEqual(saved, {
    favs: ['fudge-brownies'],
    baked: { 'fudge-brownies': 2, 'lotus-cheesecake': 1 },
  });

  reloadFav(storage);
  assert.equal(isFavorite('fudge-brownies'), true);
  assert.equal(isFavorite('lotus-cheesecake'), false);
  assert.equal(getBakedCount('fudge-brownies'), 2);
  assert.equal(getBakedCount('lotus-cheesecake'), 1);

  assert.equal(decrementBaked('fudge-brownies', storage), 1);
  assert.equal(decrementBaked('fudge-brownies', storage), 0);
  assert.equal(decrementBaked('fudge-brownies', storage), 0);
  assert.equal(toggleFavorite('fudge-brownies', storage), false);

  storage.setItem(FAV_KEY, '{not-json');
  reloadFav(storage);
  assert.equal(isFavorite('fudge-brownies'), false);
  assert.equal(getBakedCount('lotus-cheesecake'), 0);

  storage.setItem(
    FAV_KEY,
    JSON.stringify({
      favs: ['topfenschmarren', '', 42, null],
      baked: { topfenschmarren: 3.8, bad: -5, nan: 'nope', zero: 0, huge: 99999 },
    }),
  );
  reloadFav(storage);
  assert.equal(isFavorite('topfenschmarren'), true);
  assert.equal(getBakedCount('topfenschmarren'), 3);
  assert.equal(getBakedCount('bad'), 0);
  assert.equal(getBakedCount('nan'), 0);
  assert.equal(getBakedCount('huge'), 999);
});

test('unavailable storage does not prevent toggling, counting, or subscriber notifications', () => {
  const blocked = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  reloadFav(blocked);

  const events = [];
  const off = subscribeFav((slug) => events.push(slug));
  try {
    assert.equal(toggleFavorite('berry-quark-bake', blocked), true);
    assert.equal(incrementBaked('berry-quark-bake', blocked), 1);
    assert.equal(decrementBaked('berry-quark-bake', blocked), 0);
    assert.equal(isFavorite('berry-quark-bake'), true);
    assert.equal(getBakedCount('berry-quark-bake'), 0);
    assert.deepEqual(events, ['berry-quark-bake', 'berry-quark-bake', 'berry-quark-bake']);
  } finally {
    off();
    reloadFav(makeStorage());
  }
});

test('sortFavoritesFirst floats favorited recipes to the top while keeping original order', () => {
  const storage = makeStorage();
  reloadFav(storage);

  const entries = [
    { recipe: { slug: 'berry-quark-bake', no: 1 } },
    { recipe: { slug: 'best-classic-cinnamon-rolls', no: 2 } },
    { recipe: { slug: 'fudge-brownies', no: 3 } },
    { recipe: { slug: 'lotus-cheesecake', no: 4 } },
    { recipe: { slug: 'topfenschmarren', no: 6 } },
  ];

  // No favorites: returns original list untouched.
  assert.strictEqual(sortFavoritesFirst(entries), entries);

  toggleFavorite('topfenschmarren', storage);
  toggleFavorite('fudge-brownies', storage);

  const sorted = sortFavoritesFirst(entries);
  assert.deepEqual(
    sorted.map((e) => e.recipe.slug),
    [
      'fudge-brownies',
      'topfenschmarren',
      'berry-quark-bake',
      'best-classic-cinnamon-rolls',
      'lotus-cheesecake',
    ],
  );

  // Clean up shared store state.
  reloadFav(makeStorage());
});

test('favText covers EN, Austrian DE, and FR with complete keys and distinct natural copy', () => {
  for (const lang of ['de', 'fr']) {
    for (const [key, value] of Object.entries(favText.en)) {
      assert.ok(Object.hasOwn(favText[lang], key), `missing ${lang} favText key: ${key}`);
      assert.equal(typeof favText[lang][key], typeof value, `${lang}.${key} type mismatch`);
      if (typeof value === 'string') {
        assert.ok(favText[lang][key].trim().length > 0, `${lang}.${key} empty`);
        assert.notEqual(favText[lang][key], value, `${lang}.${key} untranslated`);
      }
    }
  }

  assert.equal(favText.en.bakedCount(3), 'Baked 3\u00d7');
  assert.equal(favText.de.bakedCount(3), '3\u00d7 gebacken');
  assert.equal(favText.fr.bakedCount(3), 'Fait 3\u00d7');

  // WCAG 2.5.3 Label in Name: accessible name includes the visible button text in all languages.
  for (const lang of ['en', 'de', 'fr']) {
    assert.ok(favText[lang].bakedLabel('Brownies', 0).startsWith(favText[lang].bakedIdle));
    assert.ok(favText[lang].bakedLabel('Brownies', 2).startsWith(favText[lang].bakedCount(2)));
  }
  assert.match(favText.en.bakedLabel('Brownies', 0), /Baked it.*Brownies/);
  assert.match(favText.de.bakedLabel('Topfenschmarren', 2), /2\u00d7 gebacken.*Topfenschmarren/);
  assert.match(favText.fr.bakedLabel('Brownies', 2), /Fait 2\u00d7.*Brownies/);

  assert.equal(favCopyFor('unknown'), favText.en);
  assert.equal(favCopyFor('de'), favText.de);
  assert.equal(favCopyFor('fr'), favText.fr);
});

test('RecipeFav, pages, Contents, and idea-fav.css preserve flat-retro and a11y contracts', () => {
  const recipeFavSrc = readFileSync(new URL('../src/RecipeFav.jsx', import.meta.url), 'utf8');
  const pagesSrc = readFileSync(new URL('../src/pages.jsx', import.meta.url), 'utf8');
  const contentsSrc = readFileSync(new URL('../src/Contents.jsx', import.meta.url), 'utf8');
  const favCss = readFileSync(new URL('../src/idea-fav.css', import.meta.url), 'utf8');

  assert.match(recipeFavSrc, /import '\.\/idea-fav\.css';/);
  assert.match(recipeFavSrc, /aria-pressed=\{fav\}/);
  assert.match(pagesSrc, /<RecipeFav recipe=\{recipe\} lang=\{lang\} title=\{r\.title\} measure=\{measure\} \/>/);
  assert.match(contentsSrc, /sortFavoritesFirst\(/);
  assert.match(contentsSrc, /<FavMark \/>/);

  // 44px touch targets, fine-pointer hover guard, reduced motion, no glows/rings/chevrons.
  assert.match(favCss, /\.hero-baked-btn,\s*\.hero-fav-btn\s*\{[\s\S]*min-width:\s*2\.75rem;[\s\S]*min-height:\s*2\.75rem;/);
  assert.match(favCss, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(favCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(favCss, /drop-shadow|backdrop-filter|radial-gradient|linear-gradient|transition:\s*all/);
  assert.doesNotMatch(favCss, /box-shadow:\s+(?!none;)/);
});
