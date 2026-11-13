import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ui } from '../src/i18n.js';

const cookSrc = readFileSync(new URL('../src/CookMode.jsx', import.meta.url), 'utf8');
const awakeSrc = readFileSync(new URL('../src/Awake.jsx', import.meta.url), 'utf8');
const methodSrc = readFileSync(new URL('../src/Method.jsx', import.meta.url), 'utf8');
const bookSrc = readFileSync(new URL('../src/Book.jsx', import.meta.url), 'utf8');
const stylesCss = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('Cook mode UI strings exist in both English and German', () => {
  const keys = [
    'startCooking',
    'cookMode',
    'cookDialogLabel',
    'cookStepOf',
    'cookPrev',
    'cookNext',
    'cookClose',
    'cookDoneTitle',
    'cookDoneBody',
    'cookBackToRecipe',
    'cookToggleDone',
  ];
  for (const key of keys) {
    assert.ok(Object.hasOwn(ui.en, key), `missing EN key ${key}`);
    assert.ok(Object.hasOwn(ui.de, key), `missing DE key ${key}`);
    if (typeof ui.en[key] === 'string') {
      assert.ok(ui.en[key].trim().length > 0);
      assert.ok(ui.de[key].trim().length > 0);
      assert.notEqual(ui.en[key], ui.de[key]);
    }
  }
  assert.equal(ui.en.cookStepOf(3, 8), 'Step 3 of 8');
  assert.equal(ui.de.cookStepOf(3, 8), 'Schritt 3 von 8');
  assert.equal(ui.en.cookDoneTitle, 'Done \u2014 enjoy!');
  assert.equal(ui.de.cookDoneTitle, 'Fertig \u2014 guten Appetit!');
  assert.match(ui.en.cookDialogLabel('Brownies'), /Brownies/);
  assert.match(ui.de.cookDialogLabel('Brownies'), /Brownies/);
  assert.match(ui.en.cookToggleDone(2, false), /2/);
  assert.match(ui.de.cookToggleDone(2, true), /2/);
});

test('CookMode reuses WakeLock, StepBody/StepTimer, step tick-off state, and motion helpers', () => {
  assert.match(awakeSrc, /export function useHoldWakeLock\(/);
  assert.match(cookSrc, /useHoldWakeLock\(true\)/);
  assert.match(cookSrc, /import \{ StepBody, StepDot, setStepDone, toggleStepDone, useDoneSteps, useRecipeText \} from '\.\/pages\.jsx';/);
  assert.match(cookSrc, /<StepBody recipe=\{recipe\} step=\{currentStep\} stepIndex=\{stepIndex\} t=\{t\} headingLevel=\{2\} \/>/);
  assert.match(cookSrc, /setStepDone\(recipe\.slug, cur, true\)/);
  assert.match(cookSrc, /toggleStepDone\(recipe\.slug, stepIndex\)/);
  assert.match(cookSrc, /reducedMotion\(\)/);
  assert.match(cookSrc, /animateSpring\(/);
  assert.match(cookSrc, /rubberband\(/);
});

test('CookMode implements accessible modal dialog, keyboard, and swipe navigation', () => {
  assert.match(cookSrc, /role="dialog"/);
  assert.match(cookSrc, /aria-modal="true"/);
  assert.match(cookSrc, /aria-label=\{t\.cookDialogLabel\(r\.title\)\}/);
  assert.match(cookSrc, /e\.key === 'Escape'/);
  assert.match(cookSrc, /e\.key === 'Tab'/);
  assert.match(cookSrc, /e\.key === 'ArrowRight'/);
  assert.match(cookSrc, /e\.key === 'ArrowLeft'/);
  assert.match(cookSrc, /stage\.addEventListener\('touchmove', onTouchMove, \{ passive: false \}\)/);
  assert.match(cookSrc, /t\.cookDoneTitle/);
  assert.match(cookSrc, /t\.cookBackToRecipe/);
});

test('Method button fits pagination measurement and Book isolates background while Cook mode is open', () => {
  assert.match(methodSrc, /<div className="ticket-cook" data-head="normal">[\s\S]*className="btn btn--cherry cook-start-btn"/);
  assert.match(methodSrc, /onClick=\{measure \? undefined : \(e\) => onStartCooking\?\.\(recipe, e\.currentTarget\)\}/);
  assert.match(bookSrc, /inert=\{cookOpen\}/);
  assert.match(bookSrc, /aria-hidden=\{cookOpen \|\| undefined\}/);
  assert.match(bookSrc, /if \(s\.cookOpen\) return;/);
  assert.match(bookSrc, /const onPointerDown = \(e\) => \{\s*if \(s\.cookOpen\) return;/);
  assert.match(bookSrc, /cookTriggerRef\.current\?\.isConnected/);
});

test('Cook mode styles use theme tokens, contrast-safe Done title, reduced-motion, and running-head cascade protection', () => {
  assert.match(stylesCss, /\.cook-modal\s*\{[\s\S]*background:\s*var\(--cream\);/);
  assert.match(stylesCss, /\.cook-done-title\s*\{[\s\S]*color:\s*var\(--cherry-ink\);/);
  assert.match(stylesCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.cook-close[\s\S]*\.cook-bar-fill/);
  assert.match(stylesCss, /@media \(max-height: 820px\)[\s\S]*\.book--wide \.page-pad > \.running-head \+ \*\s*\{\s*margin-top:\s*0;\s*\}/);
});
