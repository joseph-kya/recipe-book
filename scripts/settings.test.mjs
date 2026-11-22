import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { settingsCopyFor, settingsText } from '../src/settings-i18n.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const EXPECTED_KEYS = [
  'title',
  'open',
  'openHint',
  'close',
  'language',
  'amounts',
  'cups',
  'grams',
  'colours',
  'awake',
  'awakeHint',
  'sync',
  'syncHint',
  'feedback',
  'device',
  'clear',
  'clearHint',
  'clearConfirm',
  'clearCancel',
  'themeNow',
].sort();

// ---------- settings-i18n ----------

test('settingsText has identical non-empty EN/DE/FR keys and working themeNow', () => {
  for (const lang of ['en', 'de', 'fr']) {
    const copy = settingsText[lang];
    assert.deepEqual(Object.keys(copy).sort(), EXPECTED_KEYS, `${lang} key set`);
    for (const [key, value] of Object.entries(copy)) {
      if (key === 'themeNow') {
        assert.equal(typeof value, 'function', `${lang}.themeNow should be a function`);
        const out = value('X');
        assert.equal(typeof out, 'string');
        assert.ok(out.includes('X'), `${lang}.themeNow('X') should contain 'X'`);
      } else {
        assert.equal(typeof value, 'string', `${lang}.${key} should be a string`);
        assert.ok(value.trim().length > 0, `${lang}.${key} must not be empty`);
      }
    }
  }
  assert.notEqual(settingsText.de.title, settingsText.en.title);
  assert.notEqual(settingsText.fr.title, settingsText.en.title);
  assert.notEqual(settingsText.de.clear, settingsText.en.clear);
  assert.notEqual(settingsText.fr.clear, settingsText.en.clear);
});

test('settingsText follows Austrian DE du-form and FR vous + non-breaking space before high punctuation', () => {
  const deStrings = Object.values(settingsText.de).map((v) => (typeof v === 'function' ? v('Kirsche') : v));
  assert.doesNotMatch(deStrings.join(' '), /\b(Sie|Ihre?n?)\b/, 'DE uses du-form');
  assert.match(settingsText.de.awakeHint, /\bdein\b/);
  assert.match(settingsText.de.syncHint, /\bdeinen\b/);

  const frStrings = Object.values(settingsText.fr).map((v) => (typeof v === 'function' ? v('Cerise') : v));
  assert.match(frStrings.join(' '), /\bvous\b/i, 'FR uses vous');
  for (const text of frStrings) {
    for (const m of text.matchAll(/(.?)([:;!?])/g)) {
      assert.ok(
        m[1] === '\u00a0' || m[1] === '\u202f',
        `FR punctuation ${JSON.stringify(m[2])} in ${JSON.stringify(text)} must be preceded by a non-breaking space`,
      );
    }
  }
});

test('settingsCopyFor returns the requested language and falls back to en', () => {
  assert.equal(settingsCopyFor('en'), settingsText.en);
  assert.equal(settingsCopyFor('de'), settingsText.de);
  assert.equal(settingsCopyFor('fr'), settingsText.fr);
  assert.equal(settingsCopyFor('xx'), settingsText.en);
  assert.equal(settingsCopyFor(''), settingsText.en);
  assert.equal(settingsCopyFor(undefined), settingsText.en);
});

// ---------- clear-data (slice B) ----------

test('deviceKeys returns only recipe-book: keys from a Storage-like object', async () => {
  const { deviceKeys } = await import('../src/clear-data.js');

  function makeFakeStorage(entries = {}) {
    const map = new Map(Object.entries(entries));
    return {
      get length() {
        return map.size;
      },
      key(i) {
        return [...map.keys()][i] ?? null;
      },
      getItem(k) {
        return map.has(k) ? map.get(k) : null;
      },
      removeItem(k) {
        map.delete(k);
      },
    };
  }

  const storage = makeFakeStorage({
    'recipe-book:lang': 'de',
    'recipe-book:theme': 'soda',
    'recipe-book:units': 'metric',
    'recipe-book:book': '{}',
    'other-app:theme': 'dark',
    'recipe-book': 'no-colon',
    'my-recipe-book:lang': 'en',
  });

  assert.deepEqual(
    deviceKeys(storage).sort(),
    ['recipe-book:book', 'recipe-book:lang', 'recipe-book:theme', 'recipe-book:units'],
  );
  assert.equal(storage.length, 7, 'deviceKeys only inspects storage without removing keys');
  assert.deepEqual(deviceKeys(makeFakeStorage()), []);
});

// ---------- source-shape contracts (slices A & B) ----------

test('Controls replaces lang-btn with ctl--settings calling openSettings', () => {
  const src = read('src/Controls.jsx');
  assert.doesNotMatch(src, /lang-btn/);
  assert.match(src, /ctl--settings/);
  assert.match(src, /openSettings\(/);
});

test('Contents drops SyncEntry/FeedbackEntry and renders a settings entry', () => {
  const src = read('src/Contents.jsx');
  assert.doesNotMatch(src, /SyncEntry|FeedbackEntry/);
  assert.match(src, /settings-entry/);
  assert.match(src, /openSettings\(/);
});

test('SettingsSections renders SyncEntry and FeedbackEntry', () => {
  const src = read('src/SettingsSections.jsx');
  assert.match(src, /<SyncEntry\b/);
  assert.match(src, /<FeedbackEntry\b/);
});

test('Settings sheet has dialog semantics', () => {
  const src = read('src/Settings.jsx');
  assert.match(src, /role="dialog"/);
  assert.match(src, /aria-modal="true"/);
});

test('settings-store exports openSettings, closeSettings, and useSettingsOpen', () => {
  const src = read('src/settings-store.js');
  const exportsName = (name) =>
    new RegExp(`export\\s+(?:(?:async\\s+)?function|const|let)\\s+${name}\\b|export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`).test(src);
  assert.ok(exportsName('openSettings'), 'exports openSettings');
  assert.ok(exportsName('closeSettings'), 'exports closeSettings');
  assert.ok(exportsName('useSettingsOpen'), 'exports useSettingsOpen');
});

test('theme store uses useSyncExternalStore so cover cupcake and Settings stay in sync', () => {
  const src = read('src/theme.js');
  assert.match(src, /useSyncExternalStore/);
});

test('settings CSS stays flat (no box-shadow, decorative outline, or transition: all) and respects reduced motion', () => {
  for (const file of ['src/settings.css', 'src/settings-sections.css']) {
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(css, /box-shadow\s*:(?!\s*none\b)/i, `${file} must not use box-shadow`);
    assert.doesNotMatch(css, /transition(?:-property)?\s*:[^;]*\ball\b/i, `${file} must not use transition: all`);
    assert.match(css, /prefers-reduced-motion/, `${file} must respect prefers-reduced-motion`);

    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = m[1].trim();
      const body = m[2];
      for (const decl of body.matchAll(/(?:^|[;\s])outline\s*:\s*([^;]+)/gi)) {
        const val = decl[1].trim();
        if (/^(?:none|0)\b/i.test(val)) continue;
        assert.match(
          selector,
          /:focus-visible\b/,
          `${file}: non-none outline (${val}) is only allowed on :focus-visible, found on ${selector}`,
        );
      }
    }
  }
});
