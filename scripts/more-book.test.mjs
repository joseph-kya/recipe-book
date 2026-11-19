import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BOOKMARK_KEY,
  clearBookmark,
  computePageFolios,
  computeStackDepths,
  getBookmark,
  reloadBookmark,
  resolveBookmarkSpread,
  setBookmark,
  subscribeBookmark,
} from '../src/bookmark.js';
import { moreBookCopyFor, moreBookText } from '../src/more-book-i18n.js';

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('bookmark persists to localStorage, survives reload, ignores bad data, and handles blocked storage', () => {
  const storage = makeStorage();
  reloadBookmark(storage);
  assert.equal(getBookmark(), null);

  const events = [];
  const off = subscribeBookmark((bm) => events.push(bm));
  try {
    const saved = setBookmark('fudge-brownies', 1, storage, () => 1700000000000);
    assert.deepEqual(saved, { slug: 'fudge-brownies', offset: 1, updatedAt: 1700000000000 });
    assert.deepEqual(getBookmark(), saved);
    assert.deepEqual(JSON.parse(storage.getItem(BOOKMARK_KEY)), saved);
    assert.equal(events.length, 1);

    // Repeating the same slug+offset is a no-op (avoids redundant writes/renders).
    setBookmark('fudge-brownies', 1, storage, () => 1700000005000);
    assert.equal(events.length, 1);

    // Reloading from storage restores the exact reading position.
    reloadBookmark(storage);
    assert.deepEqual(getBookmark(), saved);

    // Corrupt or malformed data resets cleanly to null.
    storage.setItem(BOOKMARK_KEY, '{bad-json');
    assert.equal(reloadBookmark(storage), null);

    storage.setItem(BOOKMARK_KEY, JSON.stringify({ slug: '   ', offset: 2 }));
    assert.equal(reloadBookmark(storage), null);

    storage.setItem(BOOKMARK_KEY, JSON.stringify({ slug: 'topfenschmarren', offset: -3, updatedAt: 'nope' }));
    assert.deepEqual(reloadBookmark(storage), { slug: 'topfenschmarren', offset: 0, updatedAt: 0 });

    // Clearing removes persisted state and notifies subscribers.
    clearBookmark(storage);
    assert.equal(getBookmark(), null);
    assert.equal(storage.getItem(BOOKMARK_KEY), null);

    // Blocked storage still keeps in-memory bookmark working during the session.
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    reloadBookmark(blocked);
    assert.equal(getBookmark(), null);
    const inMem = setBookmark('lotus-cheesecake', 2, blocked, () => 42);
    assert.deepEqual(inMem, { slug: 'lotus-cheesecake', offset: 2, updatedAt: 42 });
    assert.deepEqual(getBookmark(), inMem);
    clearBookmark(blocked);
    assert.equal(getBookmark(), null);
  } finally {
    off();
    reloadBookmark(makeStorage());
  }
});

test('resolveBookmarkSpread restores exact spread offset on wide layouts and clamps safely on narrow or repaginated layouts', () => {
  const wideSpreads = [
    { kind: 'cover', route: '', offset: 0 },
    { kind: 'contents', route: 'contents', offset: 0 },
    { kind: 'recipe', route: 'brownies', recipe: { slug: 'fudge-brownies' }, offset: 0 },
    { kind: 'recipe', route: 'brownies', recipe: { slug: 'fudge-brownies' }, offset: 1 },
    { kind: 'recipe', route: 'cinnamon-rolls', recipe: { slug: 'best-classic-cinnamon-rolls' }, offset: 0 },
  ];

  assert.equal(resolveBookmarkSpread(wideSpreads, { slug: 'fudge-brownies', offset: 0 }), 2);
  assert.equal(resolveBookmarkSpread(wideSpreads, { slug: 'fudge-brownies', offset: 1 }), 3);
  assert.equal(resolveBookmarkSpread(wideSpreads, { slug: 'fudge-brownies', offset: 5 }), 3);
  assert.equal(resolveBookmarkSpread(wideSpreads, { slug: 'best-classic-cinnamon-rolls', offset: 0 }), 4);
  assert.equal(resolveBookmarkSpread(wideSpreads, { slug: 'missing-recipe', offset: 0 }), -1);
  assert.equal(resolveBookmarkSpread(wideSpreads, null), -1);

  const narrowSpreads = [
    { kind: 'cover', route: '', offset: 0 },
    { kind: 'contents', route: 'contents', offset: 0 },
    { kind: 'recipe', route: 'brownies', recipe: { slug: 'fudge-brownies' }, offset: 0 },
  ];
  assert.equal(resolveBookmarkSpread(narrowSpreads, { slug: 'fudge-brownies', offset: 2 }), 2);
});

test('computePageFolios leaves Cover and Blank faces unprinted while numbering Contents (i/ii) and Recipes sequentially', () => {
  const wideSpreads = [
    { kind: 'cover', L: null, R: { type: 'cover' } },
    { kind: 'contents', L: { type: 'contentsLeft' }, R: { type: 'contentsList' } },
    { kind: 'recipe', L: { type: 'recipePage' }, R: { type: 'recipePage' } },
    { kind: 'recipe', L: { type: 'recipePage' }, R: { type: 'blank' } },
    { kind: 'recipe', L: { type: 'recipePage' }, R: { type: 'recipePage' } },
  ];
  assert.deepEqual(computePageFolios(wideSpreads, true), [
    { L: null, R: null },
    { L: 'i', R: 'ii' },
    { L: '1', R: '2' },
    { L: '3', R: null }, // blank leaf silently consumes page 4
    { L: '5', R: '6' },
  ]);

  const narrowSpreads = [
    { kind: 'cover', L: null, R: { type: 'cover' } },
    { kind: 'contents', L: null, R: { type: 'contentsList' } },
    { kind: 'recipe', L: null, R: { type: 'recipeFull' } },
    { kind: 'recipe', L: null, R: { type: 'recipeFull' } },
  ];
  assert.deepEqual(computePageFolios(narrowSpreads, false), [
    { L: null, R: null },
    { L: null, R: 'i' },
    { L: null, R: '1' },
    { L: null, R: '2' },
  ]);
});

test('computeStackDepths reflects closed cover and shifts left/right paper stack depth across the book', () => {
  assert.deepEqual(computeStackDepths(0, 8), { left: 0, right: 3 });
  assert.deepEqual(computeStackDepths(1, 8), { left: 1, right: 3 });
  assert.deepEqual(computeStackDepths(4, 8), { left: 2, right: 2 });
  assert.deepEqual(computeStackDepths(7, 8), { left: 3, right: 1 });
  assert.deepEqual(computeStackDepths(8, 8), { left: 3, right: 1 });
});

test('more-book-i18n covers EN, Austrian German, and French with complete keys and distinct translations', () => {
  for (const lang of ['en', 'de', 'fr']) {
    const copy = moreBookCopyFor(lang);
    assert.ok(copy.continueLabel.trim().length > 0, `${lang}.continueLabel`);
    assert.ok(copy.leftOff.trim().length > 0, `${lang}.leftOff`);
    assert.ok(copy.continueAria('Topfenschmarren').includes('Topfenschmarren'), `${lang}.continueAria`);
    assert.ok(copy.bookmarkTitle('Topfenschmarren').includes('Topfenschmarren'), `${lang}.bookmarkTitle`);
    assert.ok(copy.pageLabel('3').includes('3'), `${lang}.pageLabel`);
  }

  assert.notEqual(moreBookText.en.continueLabel, moreBookText.de.continueLabel);
  assert.notEqual(moreBookText.en.continueLabel, moreBookText.fr.continueLabel);
  assert.notEqual(moreBookText.de.continueLabel, moreBookText.fr.continueLabel);

  assert.equal(moreBookText.de.continueLabel, 'Weiterlesen');
  assert.match(moreBookText.de.leftOff, /aufgeh\u00f6rt/i);
  assert.equal(moreBookText.fr.continueLabel, 'Reprendre');
  assert.match(moreBookText.fr.leftOff, /o\u00f9 vous en \u00e9tiez/i);
  assert.strictEqual(moreBookCopyFor('unknown'), moreBookText.en);
});

test('more-book.css, BookChrome.jsx, and Book.jsx uphold flat-retro, 44px target, reduced-motion, and .shade contracts', () => {
  const css = readFileSync(new URL('../src/more-book.css', import.meta.url), 'utf8');
  const chrome = readFileSync(new URL('../src/BookChrome.jsx', import.meta.url), 'utf8');
  const book = readFileSync(new URL('../src/Book.jsx', import.meta.url), 'utf8');

  // Strictly flat: no glow gradients, no drop-shadow filters, no blurred box-shadows.
  assert.doesNotMatch(css, /radial-gradient|filter:\s*drop-shadow|backdrop-filter/i);
  const shadows = [...css.matchAll(/box-shadow:\s*([^;]+);/g)].map((m) => m[1]);
  assert.ok(shadows.length > 0);
  for (const shadow of shadows) {
    if (shadow.trim() === 'none') continue;
    for (const part of shadow.split(/,(?![^(]*\))/)) {
      const lengths = part.match(/-?\d+(?:\.\d+)?px|-?\d+(?:\.\d+)?rem|\b0\b/g) || [];
      // 3rd length in box-shadow is blur radius: must be 0.
      if (lengths.length >= 3) {
        assert.equal(lengths[2], '0', `box-shadow blur must stay 0 (flat retro): ${part.trim()}`);
      }
    }
  }

  // No chevrons anywhere in the bookmark chrome.
  assert.doesNotMatch(chrome, /chevron|›|»|M9 5l7 7-7 7|M15 5 8 12l7 7/i);

  // 44px touch target, gated hover, instant press, reduced motion, and print hiding.
  assert.match(css, /\.book-ribbon-btn[\s\S]*min-width:\s*44px;\s*min-height:\s*44px;/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*\.book-ribbon-btn:hover/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.book-ribbon-btn/);
  assert.match(css, /@media print[\s\S]*\.book-ribbon/);

  // .shade must remain the lastElementChild of .face so Book.jsx paint() works.
  assert.match(book, /<FacePaperChrome[\s\S]*?\/>\s*<div className="shade" aria-hidden="true" \/>\s*<\/div>/);
});
