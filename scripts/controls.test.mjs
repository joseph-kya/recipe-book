import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controlsSrc = readFileSync(new URL('../src/Controls.jsx', import.meta.url), 'utf8');
const pagesSrc = readFileSync(new URL('../src/pages.jsx', import.meta.url), 'utf8');
const ingredientsSrc = readFileSync(new URL('../src/Ingredients.jsx', import.meta.url), 'utf8');
const awakeSrc = readFileSync(new URL('../src/Awake.jsx', import.meta.url), 'utf8');
const bookSrc = readFileSync(new URL('../src/Book.jsx', import.meta.url), 'utf8');
const i18nSrc = readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8');
const unitsSrc = readFileSync(new URL('../src/units.js', import.meta.url), 'utf8');
const paginateSrc = readFileSync(new URL('../src/paginate.js', import.meta.url), 'utf8');
const stylesCss = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const motionCss = readFileSync(new URL('../src/motion.css', import.meta.url), 'utf8');

test('Controls uses compact single-button tap toggles for language and units instead of sliders', () => {
  assert.doesNotMatch(controlsSrc, /Segments|slidePill|seg-indicator|role="group"/);
  assert.match(controlsSrc, /function TapToggle/);
  assert.match(controlsSrc, /className="lang-btn"/);
  assert.match(controlsSrc, /className="unit-btn"/);
  assert.match(controlsSrc, /setLang\(nextLang\(lang\)\)/);
  assert.match(controlsSrc, /setUnits\(units === 'cups' \? 'metric' : 'cups'\)/);
});

test('keep-screen-on sun toggle lives in Controls and not beside equipment in Method', () => {
  assert.match(controlsSrc, /<AwakeToggle label=\{t\.keepAwake\} \/>/);
  assert.match(awakeSrc, /className="ctl ctl--awake"/);
  assert.match(awakeSrc, /aria-pressed=\{on\}/);
  assert.doesNotMatch(pagesSrc, /AwakeToggle|method-tools/);
});

test('CSS keeps flat retro look, 44px mobile targets, and reduced-motion fallbacks', () => {
  assert.doesNotMatch(stylesCss, /\.seg\b|\.seg-btn|\.method-tools|\.awake-icon/);
  assert.doesNotMatch(motionCss, /\.seg-indicator|\.seg-label-active|\.seg-btn/);
  assert.match(stylesCss, /min-width:\s*44px;\s*min-height:\s*44px;/);
  assert.match(stylesCss, /\.ctl--toggle\b[\s\S]*overflow:\s*hidden;/);
  assert.match(stylesCss, /\.ctl--awake\b[\s\S]*overflow:\s*hidden;/);
  assert.match(stylesCss, /\.ctl-flip-box\b/);
  assert.match(stylesCss, /\.ctl-flip--out\[hidden\]\s*\{\s*display:\s*none;\s*\}/);
  assert.match(controlsSrc, /className="ctl-flip-box"/);
  assert.match(controlsSrc, /className="ctl-flip ctl-flip--out"\s+aria-hidden="true"\s+hidden/);
  assert.match(controlsSrc, /className="ctl-flip ctl-flip--in"/);
  assert.match(awakeSrc, /className="ctl-flip-box"/);
  assert.match(awakeSrc, /className="ctl-flip ctl-flip--out"\s+aria-hidden="true"\s+hidden/);
  assert.match(awakeSrc, /className="ctl-flip ctl-flip--in"/);
  assert.match(stylesCss, /\.ctl--awake\[aria-pressed='true'\]/);
  assert.match(motionCss, /\.controls button:not\(:disabled\):not\(\.ctl--toggle\):not\(\.ctl--awake\):active/);
  assert.match(motionCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.ctl-flip/);
  assert.match(motionCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.ctl--toggle/);
  assert.match(motionCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.ctl--awake/);
});

test('EN/DE/FR, cups/g, and sun toggles share pointerdown squash, bouncy release, and label flip without delaying clicks', () => {
  assert.match(controlsSrc, /createTapHandlers/);
  assert.match(controlsSrc, /flipLabel\(/);
  assert.match(controlsSrc, /\{\.\.\.tapHandlers\}/);
  assert.match(awakeSrc, /createTapHandlers/);
  assert.match(awakeSrc, /flipLabel\(/);
  assert.match(awakeSrc, /preserveOutgoing:\s*true/);
  assert.match(awakeSrc, /\{\.\.\.tapHandlers\}/);
  assert.match(stylesCss, /\.ctl--awake\b[\s\S]*touch-action:\s*manipulation;/);
  assert.match(stylesCss, /\.ctl--toggle\b[\s\S]*touch-action:\s*manipulation;/);
});

test('language and unit toggles commit immediately without blocking ViewTransition or layout jumps', () => {
  assert.doesNotMatch(i18nSrc, /transition\(/);
  assert.doesNotMatch(unitsSrc, /transition\(/);
  assert.match(bookSrc, /\$\{wide\}-\$\{sp\.recipe\.slug\}-\$\{sp\.offset\}-\$\{side\}/);
  assert.match(bookSrc, /\[wide,\s*lang,\s*scales,\s*runPaginate,\s*s\]/);
  assert.match(bookSrc, /planCache:\s*new Map\(\)/);
  assert.match(bookSrc, /swapContent\(restFaces,\s*kind,\s*swapAnimRef\)/);
  assert.match(ingredientsSrc, /className="ing-how-sizer"\s+aria-hidden="true"/);
  assert.match(pagesSrc, /key=\{seg\.kind\}/);
  assert.match(paginateSrc, /function measureRecipe\(/);
  assert.match(stylesCss, /overflow-anchor:\s*none;/);
  assert.match(stylesCss, /\.ing-how-live,\s*\.ing-how-sizer\s*\{\s*grid-area:\s*1\s*\/\s*1;\s*\}/);
  assert.match(stylesCss, /\.unit-btn \.ctl-flip-box::after/);
  assert.match(stylesCss, /\.controls--wide \.ctl--contents::after/);
});
