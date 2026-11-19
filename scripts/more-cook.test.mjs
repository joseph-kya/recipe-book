import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  MISE_KEY,
  clearPrepItems,
  clearStepLink,
  getActiveStep,
  getPrepItems,
  isMiseMode,
  matchRecipeSteps,
  reloadMise,
  resetAutoStepLink,
  resolveLinkedStep,
  setMiseMode,
  subscribeMise,
  subscribeStepLink,
  toggleMiseMode,
  togglePrepItem,
  toggleStepLink,
} from '../src/more-cook.js';
import { cookPrepCopyFor, cookPrepText } from '../src/more-cook-i18n.js';

const recipesDir = new URL('../content/recipes/', import.meta.url);
const recipes = readdirSync(recipesDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, recipesDir), 'utf8')));
const bySlug = Object.fromEntries(recipes.map((r) => [r.slug, r]));

function mockStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    dump: () => Object.fromEntries(map),
  };
}

test('matchRecipeSteps links exact ingredients across EN, DE, and FR without false sugar/cheese/egg leaks', () => {
  // Berry Quark Bake: sugar vs icing sugar must never cross-match; lemon zest & egg parts match cleanly.
  for (const lang of ['en', 'de', 'fr']) {
    const r = bySlug['berry-quark-bake'][lang];
    const m = matchRecipeSteps(r.groups, r.steps, lang);
    assert.deepEqual(m[0], ['0:0', '0:1'], `berry-quark-bake ${lang} step 1`);
    assert.deepEqual(m[1], ['0:2', '0:3', '0:4'], `berry-quark-bake ${lang} step 2`);
    assert.deepEqual(m[2], ['0:1', '0:2', '0:4', '0:5', '0:6', '0:7'], `berry-quark-bake ${lang} step 3`);
    assert.deepEqual(m[3], ['0:0'], `berry-quark-bake ${lang} step 4`);
    assert.deepEqual(m[4], [], `berry-quark-bake ${lang} step 5 (bake only)`);
    assert.deepEqual(m[5], ['0:8'], `berry-quark-bake ${lang} step 6 (icing sugar only)`);
  }

  // Protein Cloud Cheesecake: fromage blanc vs fromage frais, plain flour vs cornflour, icing sugar vs erythritol.
  for (const lang of ['en', 'de', 'fr']) {
    const r = bySlug['protein-cloud-cheesecake'][lang];
    const m = matchRecipeSteps(r.groups, r.steps, lang);
    assert.deepEqual(m[0], [], `protein-cloud-cheesecake ${lang} step 1`);
    assert.deepEqual(m[1], ['0:0', '0:1', '0:2', '0:3'], `protein-cloud-cheesecake ${lang} step 2`);
    assert.ok(m[2].includes('0:4') && m[2].includes('0:5') && m[2].includes('0:8') && m[2].includes('0:9'),
      `protein-cloud-cheesecake ${lang} step 3`);
    assert.deepEqual(m[3], ['0:1'], `protein-cloud-cheesecake ${lang} step 4 (whites only)`);
    assert.deepEqual(m[4], [], `protein-cloud-cheesecake ${lang} step 5 (bake only)`);
    assert.deepEqual(m[5], ['0:10'], `protein-cloud-cheesecake ${lang} step 6 (icing sugar only)`);
  }

  // Topfenschmarren: German loanword "Topfen" in EN, egg parts, fruit/compote.
  for (const lang of ['en', 'de', 'fr']) {
    const r = bySlug['topfenschmarren'][lang];
    const m = matchRecipeSteps(r.groups, r.steps, lang);
    assert.deepEqual(m[0], ['0:0', '0:1', '0:3'], `topfenschmarren ${lang} step 1`);
    assert.deepEqual(m[1], ['0:2', '0:4', '0:5', '0:6', '0:7'], `topfenschmarren ${lang} step 2`);
    assert.deepEqual(m[2], ['0:3'], `topfenschmarren ${lang} step 3`);
    assert.deepEqual(m[5], ['1:1'], `topfenschmarren ${lang} step 6`);
  }
});

test('matchRecipeSteps disambiguates duplicate ingredients across recipe groups in EN, DE, and FR', () => {
  // Cinnamon Rolls: dough (0:*), filling (1:*), icing (2:*) each get their own butter/sugar/flour/salt/water.
  for (const lang of ['en', 'de', 'fr']) {
    const r = bySlug['best-classic-cinnamon-rolls'][lang];
    const m = matchRecipeSteps(r.groups, r.steps, lang);
    assert.deepEqual(m[0], ['0:0', '0:1', '0:2', '0:3'], `cinnamon-rolls ${lang} step 1 (dough dry)`);
    assert.deepEqual(m[1], ['0:4', '0:5', '0:6', '0:7', '0:8'], `cinnamon-rolls ${lang} step 2 (dough wet)`);
    assert.deepEqual(m[4], ['1:0', '1:1', '1:2', '1:3', '1:4', '1:5'], `cinnamon-rolls ${lang} step 5 (filling)`);
    assert.deepEqual(m[8], ['2:0', '2:1', '2:2', '2:3'], `cinnamon-rolls ${lang} step 9 (icing)`);
  }

  // Lotus Cheesecake: base biscuits (0:0) vs décor biscuits (2:1), filling spread (1:1) vs topping spread (2:0).
  for (const lang of ['en', 'de', 'fr']) {
    const r = bySlug['lotus-cheesecake'][lang];
    const m = matchRecipeSteps(r.groups, r.steps, lang);
    assert.deepEqual(m[0], ['0:0', '0:1'], `lotus-cheesecake ${lang} step 1 (base)`);
    assert.deepEqual(m[1], [], `lotus-cheesecake ${lang} step 2`);
    assert.deepEqual(m[2], ['1:0', '1:1', '1:2'], `lotus-cheesecake ${lang} step 3 (filling)`);
    assert.deepEqual(m[3], ['2:0'], `lotus-cheesecake ${lang} step 4 (topping)`);
    assert.deepEqual(m[4], ['2:1'], `lotus-cheesecake ${lang} step 5 (décor)`);
  }

  // Fudge Brownies: German compound nouns (Zartbitterkuvertüre -> Kuvertüre, Backkakao -> Kakao, Weizenmehl -> Mehl/Mehlmischung).
  for (const lang of ['en', 'de', 'fr']) {
    const r = bySlug['fudge-brownies'][lang];
    const m = matchRecipeSteps(r.groups, r.steps, lang);
    assert.deepEqual(m[0], [], `fudge-brownies ${lang} step 1`);
    assert.deepEqual(m[1], ['0:0', '0:1', '0:2', '0:3', '0:4'], `fudge-brownies ${lang} step 2`);
    assert.ok(m[2].includes('0:5') && m[2].includes('0:6') && m[2].includes('0:7') && m[2].includes('0:8'),
      `fudge-brownies ${lang} step 3`);
    assert.deepEqual(m[3], [], `fudge-brownies ${lang} step 4`);
    assert.deepEqual(m[4], [], `fudge-brownies ${lang} step 5`);
  }
});

test('mise en place ticks persist independently, survive corrupt/blocked storage, and toggle mode cleanly', () => {
  const storage = mockStorage();
  reloadMise(storage);

  const events = [];
  const unsub = subscribeMise((slug) => events.push(slug));

  assert.equal(isMiseMode('fudge-brownies'), false);
  assert.equal(toggleMiseMode('fudge-brownies'), true);
  assert.equal(isMiseMode('fudge-brownies'), true);

  togglePrepItem('fudge-brownies', '0:0', storage);
  togglePrepItem('fudge-brownies', '0:3', storage);
  togglePrepItem('topfenschmarren', '0:1', storage);
  assert.deepEqual([...getPrepItems('fudge-brownies')], ['0:0', '0:3']);
  assert.deepEqual([...getPrepItems('topfenschmarren')], ['0:1']);

  // Corrupt entries are ignored on reload while valid entries survive.
  const saved = JSON.parse(storage.getItem(MISE_KEY));
  saved['fudge-brownies'].push('bad', 99);
  saved.invalid = 'nope';
  storage.setItem(MISE_KEY, JSON.stringify(saved));
  reloadMise(storage);
  assert.deepEqual([...getPrepItems('fudge-brownies')], ['0:0', '0:3']);
  assert.equal(getPrepItems('invalid').size, 0);

  // Toggling again unchecks; clearing only affects the target recipe.
  togglePrepItem('fudge-brownies', '0:0', storage);
  assert.deepEqual([...getPrepItems('fudge-brownies')], ['0:3']);
  clearPrepItems('fudge-brownies', storage);
  assert.equal(getPrepItems('fudge-brownies').size, 0);
  assert.deepEqual([...getPrepItems('topfenschmarren')], ['0:1']);

  // Blocked storage still works in memory.
  const blocked = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  reloadMise(blocked);
  togglePrepItem('fudge-brownies', '0:2', blocked);
  assert.equal(getPrepItems('fudge-brownies').has('0:2'), true);
  clearPrepItems('fudge-brownies', blocked);

  setMiseMode('fudge-brownies', false);
  assert.equal(isMiseMode('fudge-brownies'), false);
  assert.ok(events.length >= 5);
  unsub();
  reloadMise(null);
});

test('step link store supports manual tap toggle, explicit clear, and auto-follow on current step', () => {
  const matches = [[], ['0:0', '0:1'], ['0:2'], []];
  const events = [];
  const unsub = subscribeStepLink((slug) => events.push(slug));

  resetAutoStepLink('fudge-brownies');
  assert.equal(getActiveStep('fudge-brownies'), null);

  // Before cooking starts (currentStepIndex === -1), nothing is highlighted.
  assert.equal(resolveLinkedStep(getActiveStep('fudge-brownies'), -1, matches), null);

  // Once cooking starts (currentStepIndex === 1), auto-follows step 1.
  assert.equal(resolveLinkedStep(getActiveStep('fudge-brownies'), 1, matches), 1);

  // Tapping the currently auto-linked step explicitly dismisses it ('none').
  toggleStepLink('fudge-brownies', 1, 1);
  assert.equal(getActiveStep('fudge-brownies'), 'none');
  assert.equal(resolveLinkedStep(getActiveStep('fudge-brownies'), 1, matches), null);

  // Tapping step 2 links step 2; tapping step 2 again dismisses it.
  toggleStepLink('fudge-brownies', 2, null);
  assert.equal(getActiveStep('fudge-brownies'), 2);
  assert.equal(resolveLinkedStep(getActiveStep('fudge-brownies'), 1, matches), 2);
  toggleStepLink('fudge-brownies', 2, 2);
  assert.equal(getActiveStep('fudge-brownies'), 'none');

  // Marking a step done calls resetAutoStepLink -> returns to auto-follow.
  resetAutoStepLink('fudge-brownies');
  assert.equal(resolveLinkedStep(getActiveStep('fudge-brownies'), 2, matches), 2);

  // Step with zero matched ingredients resolves to null.
  assert.equal(resolveLinkedStep(3, 3, matches), null);
  clearStepLink('fudge-brownies');
  assert.equal(getActiveStep('fudge-brownies'), 'none');
  resetAutoStepLink('fudge-brownies');
  assert.ok(events.length >= 4);
  unsub();
});

test('cookPrepText covers EN, Austrian DE, and FR with complete keys and natural translations', () => {
  for (const lang of ['de', 'fr']) {
    for (const [key, value] of Object.entries(cookPrepText.en)) {
      assert.ok(Object.hasOwn(cookPrepText[lang], key), `missing ${lang} key: ${key}`);
      assert.equal(typeof cookPrepText[lang][key], typeof value, `${lang}.${key} type mismatch`);
      if (typeof value === 'string') {
        assert.ok(cookPrepText[lang][key].trim().length > 0, `${lang}.${key} empty`);
      }
    }
    assert.notEqual(cookPrepText.en.miseClear, cookPrepText[lang].miseClear);
    assert.notEqual(cookPrepText.en.miseReady, cookPrepText[lang].miseReady);
    assert.notEqual(cookPrepText.en.stepBadge(2), cookPrepText[lang].stepBadge(2));
    assert.notEqual(cookPrepText.en.stepIngredients(2), cookPrepText[lang].stepIngredients(2));
  }
  assert.equal(cookPrepText.de.miseLabel, 'Herrichten');
  assert.equal(cookPrepText.fr.miseLabel, 'Mise en place');
  assert.match(cookPrepText.de.miseProgress(2, 5), /2 von 5 Zutaten hergerichtet/);
  assert.match(cookPrepText.fr.miseProgress(2, 5), /2 ingr\u00e9dients sur 5 pr\u00e9par\u00e9s/);
  assert.equal(cookPrepCopyFor('unknown'), cookPrepText.en);
  assert.equal(cookPrepCopyFor('de'), cookPrepText.de);
  assert.equal(cookPrepCopyFor('fr'), cookPrepText.fr);
});

test('more-cook.css, Ingredients.jsx, and Method.jsx preserve flat-retro, 44px touch, print, and reduced-motion contracts', () => {
  const css = readFileSync(new URL('../src/more-cook.css', import.meta.url), 'utf8');
  const ingredientsSrc = readFileSync(new URL('../src/Ingredients.jsx', import.meta.url), 'utf8');
  const methodSrc = readFileSync(new URL('../src/Method.jsx', import.meta.url), 'utf8');

  assert.match(ingredientsSrc, /import '\.\/more-cook\.css';/);
  assert.match(ingredientsSrc, /className="mise-toggle"/);
  assert.match(ingredientsSrc, /ing--linked/);
  assert.match(ingredientsSrc, /ing--prepped/);

  assert.match(methodSrc, /import '\.\/more-cook\.css';/);
  assert.match(methodSrc, /className="step-link-btn"/);
  assert.match(methodSrc, /step--linked/);
  assert.match(methodSrc, /className="step-ings"/);

  // 44px mobile touch targets, reduced motion, print hiding, zero glows/shadows/gradients.
  assert.match(css, /\.mise-toggle\s*\{[\s\S]*min-height:\s*2\.75rem;/);
  assert.match(css, /\.mise-clear\s*\{[\s\S]*min-width:\s*2\.75rem;\s*min-height:\s*2\.75rem;/);
  assert.match(css, /\.menu-step-chip\s*\{[\s\S]*min-height:\s*2\.75rem;/);
  assert.match(css, /\.ticket \.step-link-btn\s*\{[\s\S]*min-width:\s*2\.75rem;\s*min-height:\s*2\.75rem;/);
  assert.match(css, /\.book--wide \.step-ings\s*\{\s*display:\s*none;\s*\}/);
  assert.match(css, /@media print/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /box-shadow:|drop-shadow|backdrop-filter|radial-gradient|linear-gradient/);
});
