import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controlsSrc = readFileSync(new URL('../src/Controls.jsx', import.meta.url), 'utf8');
const pagesSrc = readFileSync(new URL('../src/pages.jsx', import.meta.url), 'utf8');
const awakeSrc = readFileSync(new URL('../src/Awake.jsx', import.meta.url), 'utf8');
const stylesCss = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const motionCss = readFileSync(new URL('../src/motion.css', import.meta.url), 'utf8');

test('Controls uses compact single-button tap toggles for language and units instead of sliders', () => {
  assert.doesNotMatch(controlsSrc, /Segments|slidePill|seg-indicator|role="group"/);
  assert.match(controlsSrc, /function TapToggle/);
  assert.match(controlsSrc, /className="lang-btn"/);
  assert.match(controlsSrc, /className="unit-btn"/);
  assert.match(controlsSrc, /setLang\(lang === 'en' \? 'de' : 'en'\)/);
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
  assert.match(stylesCss, /\.ctl-flip-box\b/);
  assert.match(stylesCss, /\.ctl-flip--out\[hidden\]\s*\{\s*display:\s*none;\s*\}/);
  assert.match(controlsSrc, /className="ctl-flip-box"/);
  assert.match(controlsSrc, /className="ctl-flip ctl-flip--out"\s+aria-hidden="true"\s+hidden/);
  assert.match(controlsSrc, /className="ctl-flip ctl-flip--in"/);
  assert.match(stylesCss, /\.ctl--awake\[aria-pressed='true'\]/);
  assert.match(motionCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.ctl-flip/);
  assert.match(motionCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.ctl--toggle/);
  assert.match(motionCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.ctl--awake/);
});
