import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COLLECTIONS,
  LANGS,
  LIMITS,
  checkFeedback,
  checkSuggestion,
  cleanRoute,
  cleanUrl,
  urlError,
} from '../src/auth/feedback.js';
import { sheetText } from '../src/auth/feedback-i18n.js';
import { noteText } from '../src/fav-i18n.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const rules = read('firestore.rules');

// ---------- validation ----------

test('feedback needs some text and at most 2000 characters', () => {
  assert.deepEqual(checkFeedback({ text: '   \n ', route: '', lang: 'en' }).errors, { text: 'textEmpty' });
  assert.deepEqual(checkFeedback({ text: 'x'.repeat(2001), route: '', lang: 'en' }).errors, { text: 'textTooLong' });
  const ok = checkFeedback({ text: `  ${'x'.repeat(2000)}  `, route: 'r/apple-pie', lang: 'de' });
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.doc.text.length, 2000, 'trimmed before counting');
  assert.deepEqual(Object.keys(ok.doc).sort(), ['lang', 'route', 'text', 'type']);
  assert.equal(ok.doc.type, 'feedback');
  assert.equal(ok.doc.lang, 'de');
  assert.equal(checkFeedback({ text: 'hi\nthere', lang: 'xx' }).doc.text, 'hi\nthere', 'keeps inner newlines');
  assert.equal(checkFeedback({ text: 'hi', lang: 'xx' }).doc.lang, 'en', 'unknown language falls back to en');
  assert.equal(checkFeedback({ text: 'hi' }).doc.route, '', 'route is optional');
});

test('suggestion links must be full http(s) URLs up to 500 characters', () => {
  for (const bad of ['', '   ', 'example.com/cake', 'ftp://example.com/x', 'javascript:alert(1)', 'https://', 'https://exa mple.com', 'https://nodot', 'data:text/html,hi']) {
    assert.ok(urlError(bad), `rejects ${JSON.stringify(bad)}`);
  }
  assert.equal(urlError(''), 'urlEmpty');
  assert.equal(urlError('example.com'), 'urlInvalid');
  assert.equal(urlError(`https://example.com/${'a'.repeat(500)}`), 'urlTooLong');
  for (const good of ['https://example.com', 'http://www.chefkoch.de/rezepte/123/Apfelstrudel.html', '  HTTPS://Example.com/a?b=c#d  ', 'http://localhost:5173/x']) {
    assert.equal(urlError(good), '', `accepts ${good}`);
  }
  assert.equal(cleanUrl('  HTTPS://Example.com/A  '), 'https://Example.com/A', 'scheme lowercased, rest kept');
});

test('suggestion note is optional and capped at 500', () => {
  const ok = checkSuggestion({ url: 'https://example.com/strudel', note: '', route: 'contents', lang: 'fr' });
  assert.deepEqual(ok.doc, { type: 'suggestion', url: 'https://example.com/strudel', note: '', route: 'contents', lang: 'fr' });
  const bad = checkSuggestion({ url: 'nope', note: 'n'.repeat(501), lang: 'en' });
  assert.deepEqual(bad.errors, { url: 'urlInvalid', note: 'noteTooLong' });
  assert.equal(bad.doc, null);
});

test('route is flattened and cut to fit', () => {
  assert.equal(cleanRoute(' r/apple-pie\n'), 'r/apple-pie');
  assert.equal(cleanRoute('a\u0000b'), 'a b');
  assert.equal(cleanRoute('x'.repeat(300)).length, LIMITS.route);
  assert.equal(cleanRoute(undefined), '');
});

// ---------- rules shape ----------

function block(name) {
  const start = rules.indexOf(`match /${name}/{id} {`);
  assert.ok(start > 0, `rules have a ${name} block`);
  return rules.slice(start, rules.indexOf('\n    }', start));
}

const keysIn = (src, fn) => src.match(new RegExp(`${fn}\\(\\[([^\\]]+)\\]\\)`))[1].match(/'([^']+)'/g).map((k) => k.slice(1, -1));

test('feedback and suggestions are create-only with an exact key allowlist', () => {
  const samples = {
    feedback: checkFeedback({ text: 'hi', route: 'contents', lang: 'en' }).doc,
    suggestion: checkSuggestion({ url: 'https://example.com', note: '', route: '', lang: 'en' }).doc,
  };
  for (const [kind, name] of Object.entries(COLLECTIONS)) {
    const b = block(name);
    assert.match(b, /allow create: if/);
    assert.doesNotMatch(b, /allow (read|write|update|delete|get|list)/, `${name}: clients can only create`);
    const sent = [...Object.keys(samples[kind]), 'uid', 'createdAt'].sort();
    assert.deepEqual(keysIn(b, 'hasOnly').sort(), sent, `${name}: allowlist matches what the app sends`);
    assert.deepEqual(keysIn(b, 'hasAll').sort(), sent, `${name}: every key is required`);
    assert.match(b, new RegExp(`data\\.type == '${kind}'`));
    assert.match(b, /validMeta\(request\.resource\.data\)/);
  }
  assert.doesNotMatch(rules, /match \/(feedback|suggestions)\/\{id\} \{[^}]*allow read/);
});

test('rules limits, types and regex mirror the client checks', () => {
  const fb = block('feedback');
  assert.match(fb, /text is string/);
  assert.match(fb, new RegExp(`text\\.size\\(\\) <= ${LIMITS.text}\\b`));
  assert.match(fb, /text\.size\(\) > 0/);

  const sg = block('suggestions');
  assert.match(sg, /url is string/);
  assert.match(sg, new RegExp(`url\\.size\\(\\) <= ${LIMITS.url}\\b`));
  assert.match(sg, /note is string/);
  assert.match(sg, new RegExp(`note\\.size\\(\\) <= ${LIMITS.note}\\b`));

  // The rules' URL regex (a rules string literal) as a JS RegExp.
  const literal = sg.match(/url\.matches\('([^']+)'\)/)[1];
  assert.match(literal, /^\^https\?:\/\//, 'regex is anchored on http(s)://');
  const re = new RegExp(literal.replace(/\\\\/g, '\\'));
  for (const u of ['https://example.com', '  HTTPS://Example.com/a  ', 'http://www.chefkoch.de/x?y=1']) {
    assert.equal(urlError(u), '');
    assert.ok(re.test(cleanUrl(u)), `rules accept what the app sends: ${u}`);
  }
  for (const u of ['ftp://x.com', 'javascript:alert(1)', 'https://a b.com', 'HTTPS://x.com']) {
    assert.ok(!re.test(u), `rules refuse ${u}`);
  }

  const meta = rules.slice(rules.indexOf('function validMeta'), rules.indexOf('match /feedback/'));
  assert.match(meta, new RegExp(`route\\.size\\(\\) <= ${LIMITS.route}\\b`));
  assert.match(meta, new RegExp(`d\\.lang in \\[${LANGS.map((l) => `'${l}'`).join(', ')}\\]`));
  assert.match(meta, /d\.uid == null \|\| \(request\.auth != null && d\.uid == request\.auth\.uid\)/);
  assert.match(meta, /d\.createdAt == request\.time/);
});

test('users rules are untouched and everything else stays closed', () => {
  const users = rules.slice(rules.indexOf('match /users/{uid}'), rules.indexOf('"Send feedback"'));
  assert.doesNotMatch(users, /feedback|suggestion/);
  assert.match(users, /allow read, delete: if isOwner\(\);/);
  assert.match(users, /allow create: if isOwner\(\) && validDoc\(\);/);
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
});

// ---------- copy and wiring ----------

test('sheet and entry copy exists in EN, Austrian DE (du), and FR', () => {
  const shape = (o) =>
    Object.entries(o)
      .map(([k, v]) => (v && typeof v === 'object' ? `${k}{${shape(v)}}` : `${k}:${typeof v}`))
      .sort()
      .join(',');
  for (const lang of ['de', 'fr']) {
    assert.equal(shape(sheetText[lang]), shape(sheetText.en), `${lang} sheet keys`);
    assert.deepEqual(Object.keys(noteText[lang]), Object.keys(noteText.en));
    assert.notEqual(sheetText[lang].feedback.title, sheetText.en.feedback.title);
    assert.notEqual(noteText[lang].suggest, noteText.en.suggest);
  }
  for (const lang of LANGS) {
    const t = sheetText[lang];
    for (const key of ['textEmpty', 'textTooLong', 'urlEmpty', 'urlInvalid', 'urlTooLong', 'noteTooLong', 'failed']) {
      assert.ok(t[key], `${lang}.${key}`);
    }
    assert.match(t.left(12), /12/);
  }
  const de = JSON.stringify(sheetText.de) + JSON.stringify(noteText.de);
  assert.doesNotMatch(de, /\b(Sie|Ihre?n?)\b/, 'DE uses du');
});

test('entries are quiet, lazy and hidden without Firebase; the link is never fetched', () => {
  const contents = read('src/Contents.jsx');
  assert.doesNotMatch(contents, /FeedbackEntry/);
  const book = read('src/Book.jsx');
  assert.match(book, /import\(['"]\.\/Settings\.jsx['"]\)/, 'Settings (and FeedbackEntry) stay out of the initial bundle');
  const sections = read('src/SettingsSections.jsx');
  assert.match(sections, /<FeedbackEntry\b/);

  const entry = read('src/auth/FeedbackEntry.jsx');
  assert.match(entry, /if \(!authEnabled\) return null;/);
  assert.match(entry, /import\('\.\/FeedbackSheet\.jsx'\)/, 'sheet stays out of the initial bundle');
  assert.doesNotMatch(entry, /firebase|feedback-i18n|feedback\.css|\.\/feedback\.js/);
  assert.doesNotMatch(entry, /position:\s*fixed|floating/);

  const sheet = read('src/auth/FeedbackSheet.jsx');
  assert.doesNotMatch(sheet, /from ['"]firebase/, 'Firestore only via the lazy sync chunk');
  assert.match(sheet, /loadSync\(\)\s*\.then\(\(m\) => m\.submit\(/);
  assert.doesNotMatch(sheet, /\bfetch\(|XMLHttpRequest|new Image|<img|<iframe|href=\{values/, 'never loads the link');
  assert.match(sheet, /maxLength=\{LIMITS\.text\}/);
  assert.match(sheet, /maxLength=\{LIMITS\.url\}/);
  assert.match(sheet, /maxLength=\{LIMITS\.note\}/);

  const sync = read('src/auth/sync.js');
  assert.match(sync, /export async function submit\(/);
  assert.match(sync, /createdAt: serverTimestamp\(\)/);
  assert.match(sync, /auth\.currentUser\?\.uid \|\| null/);

  const css = read('src/auth/feedback.css');
  assert.doesNotMatch(css, /box-shadow|border:(?!\s*0;)|\bring\b|glow|ribbon|chevron/i, 'flat: no shadows, borders, rings or glows');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /min-height: 2\.75rem/);
  assert.match(css, /width: 2\.75rem;\s*height: 2\.75rem;/, '44px close button');
  assert.match(css, /font-size: 1rem/, '16px fields avoid iOS zoom');
  // Only the book's shared keyboard-focus outline, never a decorative one.
  for (const m of css.matchAll(/([^{}]+)\{[^}]*\boutline: 3px/g)) assert.match(m[1], /focus-visible/);
});
