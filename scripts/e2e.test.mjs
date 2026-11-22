import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: '1440x900', width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
];

let server;
let browser;
let baseURL;

before(async () => {
  server = await createServer({
    server: { host: '127.0.0.1', port: 0, strictPort: false },
    logLevel: 'silent',
  });
  await server.listen();
  const address = server.httpServer.address();
  baseURL = `http://127.0.0.1:${address.port}/`;
  browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
});

after(async () => {
  await browser?.close();
  await server?.close();
});

async function newViewportPage(vp, { lang = 'en', initScript } = {}) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
    deviceScaleFactor: vp.deviceScaleFactor,
    locale: lang === 'de' ? 'de-AT' : lang === 'fr' ? 'fr-FR' : 'en-US',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  await context.addInitScript((initialLang) => {
    if (!localStorage.getItem('recipe-book:lang')) {
      localStorage.setItem('recipe-book:lang', initialLang);
    }
  }, lang);
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().endsWith('/favicon.ico')) {
      errors.push(`HTTP ${res.status()} ${res.url()}`);
    }
  });
  return { context, page, errors };
}

async function waitForRest(page) {
  await page.waitForFunction(() => document.querySelectorAll('.face--rest').length > 0 && !document.querySelector('.face--front'));
}

async function waitForHash(page, expected) {
  await page.waitForFunction((target) => location.hash === target, expected);
  await waitForRest(page);
}

async function navigateToStep(page, stepIndex) {
  const selector = `.face--rest [data-step="${stepIndex}"]`;
  for (let i = 0; i < 6; i++) {
    if ((await page.locator(selector).count()) > 0) return page.locator(selector).first();
    const next = page.locator('.ctl--next');
    if (await next.isDisabled()) break;
    await next.click();
    await waitForRest(page);
  }
  throw new Error(`Could not find step ${stepIndex} on any spread`);
}

for (const vp of VIEWPORTS) {
  describe(`E2E user journeys @ ${vp.name}`, () => {
    test('open cover, rapid turns, and surprise me', async () => {
      const { context, page, errors } = await newViewportPage(vp);
      try {
        await page.goto(`${baseURL}#/`);
        await waitForRest(page);

        // Cover renders cleanly without horizontal overflow.
        const coverInfo = await page.evaluate(() => ({
          scrollW: document.documentElement.scrollWidth,
          innerW: window.innerWidth,
          title: document.title,
          openHref: document.querySelector('.face--rest .cover-open a.btn')?.getAttribute('href'),
        }));
        assert.equal(coverInfo.scrollW, coverInfo.innerW, 'cover should not overflow horizontally');
        assert.equal(coverInfo.title, "Joseph's Recipe Book");
        assert.equal(coverInfo.openHref, '#/contents');

        // Open cover -> Contents.
        await page.locator('.face--rest .cover-open a.btn').click();
        await waitForHash(page, '#/contents');
        assert.equal(await page.title(), "Contents · Joseph's Recipe Book");
        assert.equal(await page.locator('.face--rest .toc-link').count(), 6);

        // Return to Cover and verify rapid consecutive real Next/Prev clicks do not drop turns.
        await page.locator('.ctl--prev').click();
        await waitForHash(page, '#/');
        await page.evaluate(() => {
          const next = document.querySelector('.ctl--next');
          next.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
          next.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
        });
        await waitForHash(page, '#/r/fudge-brownies');

        await page.evaluate(() => {
          const prev = document.querySelector('.ctl--prev');
          prev.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
          prev.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
        });
        await waitForHash(page, '#/');

        // Surprise me: click, wait for landed pick, click pick to open immediately.
        await page.locator('.face--rest .cover-random-btn').click();
        const pick = page.locator('.face--rest .cover-random-pick');
        await pick.waitFor({ state: 'visible', timeout: 3000 });
        await pick.click();
        await page.waitForFunction(() => location.hash.startsWith('#/r/'));
        await waitForRest(page);
        const firstSlug = await page.evaluate(() => location.hash.replace(/^#\/r\//, ''));
        assert.ok(firstSlug.length > 0);
        assert.ok((await page.locator('.face--rest .recipe-title').textContent()).trim().length > 0);

        // Return to cover and let Surprise me auto-open a different recipe.
        await page.goto(`${baseURL}#/`);
        await waitForRest(page);
        await page.locator('.face--rest .cover-random-btn').click();
        await page.waitForFunction(() => location.hash.startsWith('#/r/'), null, { timeout: 4000 });
        await waitForRest(page);
        const secondSlug = await page.evaluate(() => location.hash.replace(/^#\/r\//, ''));
        assert.notEqual(secondSlug, firstSlug, 'Surprise me should not repeat the same recipe twice in a row');

        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });

    test('search contents, open recipe, and DE fresh English-title search', async () => {
      const { context, page, errors } = await newViewportPage(vp);
      try {
        await page.goto(`${baseURL}#/contents`);
        await waitForRest(page);

        const search = page.locator('.face--rest .toc-find-input');

        // Title search
        await search.fill('brownie');
        assert.equal(await page.locator('.face--rest .toc-link').count(), 1);
        assert.equal(await page.locator('.face--rest .toc-link').first().getAttribute('href'), '#/r/fudge-brownies');

        // Ingredient search shows match cue
        await search.fill('buttermilk');
        assert.equal(await page.locator('.face--rest .toc-link').count(), 1);
        assert.match(await page.locator('.face--rest .toc-match').first().textContent(), /buttermilk/i);

        // Empty state + Show all reset button
        await search.fill('zzzz-not-a-recipe');
        assert.equal(await page.locator('.face--rest .toc-link').count(), 0);
        await page.locator('.face--rest .toc-empty-btn').click();
        assert.equal(await search.inputValue(), '');
        assert.equal(await page.locator('.face--rest .toc-link').count(), 6);

        // Clear button works
        await search.fill('lotus');
        assert.equal(await page.locator('.face--rest .toc-link').count(), 1);
        await page.locator('.face--rest .toc-find-clear').click();
        assert.equal(await page.locator('.face--rest .toc-link').count(), 6);

        // Enter opens the top matching recipe
        await search.fill('cinnamon');
        await search.press('Enter');
        await waitForHash(page, '#/r/best-classic-cinnamon-rolls');
        assert.match(await page.locator('.face--rest .recipe-title').textContent(), /Cinnamon Rolls/i);

        // Multi-spread desktop navigation reaches the final step cleanly
        if (!vp.isMobile) {
          const finalStep = await navigateToStep(page, 8);
          assert.ok(await finalStep.isVisible());
        } else {
          const overflowX = await page.evaluate(() => {
            const scroller = document.querySelector('.face--rest .face-scroll');
            return scroller ? scroller.scrollWidth - scroller.clientWidth : 0;
          });
          assert.ok(overflowX <= 1, `unexpected mobile horizontal overflow: ${overflowX}px`);
        }

        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }

      // Fresh German load (without English chunk loaded) still matches English titles in search
      const de = await newViewportPage(vp, { lang: 'de' });
      try {
        await de.page.goto(`${baseURL}#/contents`);
        await waitForRest(de.page);
        const deSearch = de.page.locator('.face--rest .toc-find-input');
        await deSearch.fill('cinnamon');
        assert.equal(await de.page.locator('.face--rest .toc-link').count(), 1);
        assert.equal(
          await de.page.locator('.face--rest .toc-link').first().getAttribute('href'),
          '#/r/best-classic-cinnamon-rolls',
        );
        await deSearch.fill('cheesecake');
        assert.equal(await de.page.locator('.face--rest .toc-link').count(), 2);
        assert.deepEqual(de.errors, []);
      } finally {
        await de.context.close();
      }
    });

    test('switch EN/DE/FR, cups/grams, and portion scaling with persistence', async () => {
      const { context, page, errors } = await newViewportPage(vp);
      try {
        await page.goto(`${baseURL}#/r/fudge-brownies`);
        await waitForRest(page);

        // Switch EN -> DE -> FR -> EN inside the Settings sheet
        const settingsBtn = page.locator('.ctl--settings');
        assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
        await settingsBtn.click();
        const dialog = page.locator('[role="dialog"].settings-sheet');
        await dialog.waitFor({ state: 'visible' });

        await dialog.getByRole('radio', { name: 'Deutsch', exact: true }).click();
        await page.waitForFunction(() => document.documentElement.lang === 'de');
        assert.equal(await dialog.getByRole('radio', { name: 'Deutsch', exact: true }).getAttribute('aria-checked'), 'true');
        assert.match(await page.title(), /Josephs Rezeptbuch/);

        await dialog.getByRole('radio', { name: 'Français', exact: true }).click();
        await page.waitForFunction(() => document.documentElement.lang === 'fr');
        assert.equal(await dialog.getByRole('radio', { name: 'Français', exact: true }).getAttribute('aria-checked'), 'true');
        assert.match(await page.title(), /Les recettes de Joseph/);

        await dialog.getByRole('radio', { name: 'English', exact: true }).click();
        await page.waitForFunction(() => document.documentElement.lang === 'en');
        assert.equal(await dialog.getByRole('radio', { name: 'English', exact: true }).getAttribute('aria-checked'), 'true');
        assert.match(await page.title(), /Joseph's Recipe Book/);

        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        const focusReturned = await page.evaluate(() => document.activeElement?.classList.contains('ctl--settings') ?? false);
        assert.equal(focusReturned, true, 'closing Settings with Escape returns focus to .ctl--settings');

        // Cups <-> Grams toggle + reload persistence + PDF download switch
        const firstAmount = page.locator('.face--rest .ing-how-live .ing-amount').first();
        const cupsAmount = (await firstAmount.textContent()).trim();
        assert.match(cupsAmount, /cup/i);

        await page.locator('.unit-btn').click();
        await page.waitForFunction(() => document.querySelector('.unit-btn .ctl-flip--in')?.textContent?.trim() === 'g');
        const gramsAmount = (await firstAmount.textContent()).trim();
        assert.match(gramsAmount, /\bg\b/i);

        await page.reload();
        await waitForRest(page);
        assert.equal((await page.locator('.unit-btn .ctl-flip--in').textContent()).trim(), 'g');
        assert.equal((await firstAmount.textContent()).trim(), gramsAmount);

        // Switch back to cups for preset scale checks
        await page.locator('.unit-btn').click();
        await page.waitForFunction(() => document.querySelector('.unit-btn .ctl-flip--in')?.textContent?.trim() === 'cups');

        // Preset portion scale (2x -> 48 squares on Fudge Brownies)
        const chip48 = page.locator('.face--rest').getByRole('button', { name: '48', exact: true }).first();
        await chip48.click();
        await page.waitForFunction(() => [...document.querySelectorAll('.face--rest .scaler-chip')].some(el => el.textContent === '4848' && el.getAttribute('aria-pressed') === 'true'));
        assert.match(await page.locator('.face--rest .stats').textContent(), /48 squares/);
        assert.ok(await page.locator('.face--rest .scale-note').isVisible());

        // Custom portion scale + reload persistence
        await page.locator('.face--rest .scaler-chip--custom').click();
        const field = page.locator('.face--rest .scaler-field');
        await field.waitFor({ state: 'visible' });
        await field.fill('36');
        await field.press('Enter');
        await page.waitForFunction(() => document.querySelector('.face--rest .stats')?.textContent?.includes('36'));
        await page.reload();
        await waitForRest(page);
        assert.equal(await page.locator('.face--rest .scaler-field').inputValue(), '36');
        assert.match(await page.locator('.face--rest .stats').textContent(), /36 squares/);

        // Reset back to 1x (24 squares)
        const chip24 = page.locator('.face--rest').getByRole('button', { name: '24', exact: true }).first();
        await chip24.click();
        await page.waitForFunction(() => [...document.querySelectorAll('.face--rest .scaler-chip')].some(el => el.textContent === '2424' && el.getAttribute('aria-pressed') === 'true'));
        assert.equal(await page.locator('.face--rest .scale-note').count(), 0);

        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }

      // Fresh DE load on protein-cloud-cheesecake must show ~1 h 15 min (not double-counted ~2 h 10 min)
      const de = await newViewportPage(vp, { lang: 'de' });
      try {
        await de.page.goto(`${baseURL}#/r/protein-cloud-cheesecake`);
        await waitForRest(de.page);
        const totalTime = (await de.page.locator('.face--rest .recipe-glance-value').first().textContent()).trim();
        assert.equal(totalTime, '~1 h 15 min');
        assert.deepEqual(de.errors, []);
      } finally {
        await de.context.close();
      }
    });

    test('start, tick, pause, persist, and clear a step timer (including EN step 5 parity)', async () => {
      const { context, page, errors } = await newViewportPage(vp);
      try {
        await page.goto(`${baseURL}#/r/fudge-brownies`);
        await waitForRest(page);

        // Step 4 ("35 minutes") timer start / tick / pause / reload / clear
        const step4 = await navigateToStep(page, 3);
        const mainBtn = step4.locator('.step-timer-main');
        assert.match(await mainBtn.textContent(), /35 minutes/);

        // Step 5 ("2 more hours") also renders a 2-hour timer in English
        const step5 = await navigateToStep(page, 4);
        assert.match(await step5.locator('.step-timer-main').textContent(), /2 hours/);

        // Return to step 4 if desktop flipped spreads to find step 5
        await page.goto(`${baseURL}#/r/fudge-brownies`);
        await waitForRest(page);
        const step4Again = await navigateToStep(page, 3);
        const wrap = step4Again.locator('.step-timer');
        const main = step4Again.locator('.step-timer-main');

        // Adjust +1 min before starting
        await step4Again.locator('.step-timer-adj[aria-label="One minute more"]').click();
        assert.match(await main.textContent(), /36 min/);

        // Start timer and verify it counts down
        await main.click();
        assert.match(await wrap.getAttribute('class'), /step-timer--running/);
        await page.waitForTimeout(1200);
        const runningText = (await main.textContent()).trim();
        assert.match(runningText, /^35:5\d$/);

        // Pause timer and verify it stops ticking
        await main.click();
        assert.match(await wrap.getAttribute('class'), /step-timer--paused/);
        const pausedAt = (await main.textContent()).trim();
        await page.waitForTimeout(1100);
        assert.equal((await main.textContent()).trim(), pausedAt);

        // Reload preserves paused timer
        await page.reload();
        await waitForRest(page);
        const step4Reloaded = await navigateToStep(page, 3);
        assert.match(await step4Reloaded.locator('.step-timer').getAttribute('class'), /step-timer--paused/);
        assert.equal((await step4Reloaded.locator('.step-timer-main').textContent()).trim(), pausedAt);

        // Clear paused timer returns to idle
        await step4Reloaded.locator('.step-timer-adj[aria-label="Clear paused timer"]').click();
        assert.match(await step4Reloaded.locator('.step-timer').getAttribute('class'), /step-timer--idle/);

        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });

    test('favorite sorting/persistence and share link #/r/<slug> on refresh', async () => {
      const { context, page, errors } = await newViewportPage(vp, {
        initScript: () => {
          // Force deterministic clipboard fallback in headless Chrome instead of OS share sheet.
          Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
        },
      });
      try {
        // Direct navigation to canonical share link #/r/<slug> + reload
        await page.goto(`${baseURL}#/r/topfenschmarren`);
        await waitForRest(page);
        assert.equal(await page.evaluate(() => location.hash), '#/r/topfenschmarren');
        assert.match(await page.locator('.face--rest .recipe-title').textContent(), /Topfen-?schmarren/);
        assert.equal(await page.title(), "Topfenschmarren · Joseph's Recipe Book");

        // Share button copies canonical #/r/topfenschmarren link and shows confirmation
        const shareBtn = page.locator('.face--rest .share-btn');
        await shareBtn.click();
        await page.waitForFunction(() => document.querySelector('.face--rest .share-btn')?.classList.contains('is-done'));
        const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());
        assert.ok(copiedUrl.endsWith('#/r/topfenschmarren'), `expected canonical share URL, got ${copiedUrl}`);

        // Refresh on #/r/topfenschmarren keeps the recipe open
        await page.reload();
        await waitForRest(page);
        assert.equal(await page.evaluate(() => location.hash), '#/r/topfenschmarren');
        assert.match(await page.locator('.face--rest .recipe-title').textContent(), /Topfen-?schmarren/);

        // Favorite Topfenschmarren -> sorts first in Contents with heart marker -> persists across reload
        const favBtn = page.locator('.face--rest .hero-fav-btn');
        assert.equal(await favBtn.getAttribute('aria-pressed'), 'false');
        await favBtn.click();
        assert.equal(await favBtn.getAttribute('aria-pressed'), 'true');

        await page.locator('.ctl--contents').click();
        await waitForHash(page, '#/contents');
        const firstRow = page.locator('.face--rest .toc-link').first();
        assert.equal(await firstRow.getAttribute('href'), '#/r/topfenschmarren');
        assert.equal(await firstRow.locator('.toc-fav').count(), 1);

        await page.reload();
        await waitForRest(page);
        assert.equal(await page.locator('.face--rest .toc-link').first().getAttribute('href'), '#/r/topfenschmarren');
        assert.equal(await page.locator('.face--rest .toc-link').first().locator('.toc-fav').count(), 1);

        // Unfavorite restores default order
        await page.locator('.face--rest .toc-link').first().click();
        await waitForHash(page, '#/r/topfenschmarren');
        await page.locator('.face--rest .hero-fav-btn').click();
        assert.equal(await page.locator('.face--rest .hero-fav-btn').getAttribute('aria-pressed'), 'false');
        await page.locator('.ctl--contents').click();
        await waitForHash(page, '#/contents');
        assert.equal(await page.locator('.face--rest .toc-link').first().getAttribute('href'), '#/r/fudge-brownies');

        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });

    test('cover cupcake theme tap and 3-bite muffin celebration + respawn', async () => {
      const { context, page, errors } = await newViewportPage(vp);
      try {
        await page.goto(`${baseURL}#/`);
        await waitForRest(page);

        const cupcakeBtn = page.locator('.face--rest .cover-cupcake-btn');
        const cupcakeSvg = page.locator('.face--rest .cover-cupcake');

        // Quick tap cycles colourway without biting
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme || 'cherry'), 'cherry');
        await cupcakeBtn.click();
        await page.waitForFunction(() => document.documentElement.dataset.theme === 'blueplate');
        assert.doesNotMatch(await cupcakeSvg.getAttribute('class'), /cover-cupcake--bitten/);

        // Hold 3 times to eat the muffin without changing colourway
        // Let the colourway tap spring settle before holding a fixed pointer position.
        await page.waitForTimeout(750);
        const box = await cupcakeBtn.boundingBox();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;

        const holdBite = async () => {
          await page.mouse.move(cx, cy);
          await page.mouse.down();
          await page.waitForTimeout(520);
          await page.mouse.up();
          await page.waitForTimeout(80);
        };

        await holdBite();
        assert.match(await cupcakeSvg.getAttribute('class'), /cover-cupcake--bitten/);
        assert.equal(await page.locator('.face--rest .cover-cupcake mask').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'blueplate');

        await holdBite();
        assert.match(await cupcakeSvg.getAttribute('class'), /cover-cupcake--bitten/);
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'blueplate');

        // 3rd bite finishes the cupcake, celebrates, and increments persistent finish count
        await holdBite();
        assert.match(await cupcakeSvg.getAttribute('class'), /cover-cupcake--gone/);
        assert.ok(await page.locator('.face--rest .cover-cupcake-celebrate').isVisible());
        assert.ok((await page.locator('.face--rest .cover-cupcake-gone').textContent()).trim().length > 0);
        assert.equal(await page.evaluate(() => localStorage.getItem('recipe-book:muffin-finishes')), '1');

        // Respawns fresh with a reply
        await page.locator('.face--rest .cover-cupcake-reply').waitFor({ state: 'visible', timeout: 2500 });
        assert.match(await cupcakeSvg.getAttribute('class'), /cover-cupcake--fresh/);
        assert.ok((await page.locator('.face--rest .cover-cupcake-reply').textContent()).trim().length > 0);

        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });

    if (vp.isMobile) {
      test('open Settings from Contents on 390, change colourway and units', async () => {
        const { context, page, errors } = await newViewportPage(vp);
        try {
          await page.goto(`${baseURL}#/contents`);
          await waitForRest(page);

          const entryBtn = page.locator('.face--rest button.settings-entry, .face--rest .settings-entry button').first();
          await ((await entryBtn.count()) > 0 ? entryBtn : page.locator('.face--rest .settings-entry').first()).click();
          const dialog = page.locator('[role="dialog"].settings-sheet');
          await dialog.waitFor({ state: 'visible' });

          assert.equal(await page.evaluate(() => document.documentElement.dataset.theme || 'cherry'), 'cherry');
          await dialog.getByRole('radio', { name: 'Blue plate', exact: true }).click();
          await page.waitForFunction(() => document.documentElement.dataset.theme === 'blueplate');

          await dialog.getByRole('radio', { name: 'Grams', exact: true }).click();
          await page.waitForFunction(() => document.querySelector('.unit-btn .ctl-flip--in')?.textContent?.trim() === 'g');
          assert.equal((await page.locator('.unit-btn .ctl-flip--in').textContent()).trim(), 'g');

          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden' });
          assert.deepEqual(errors, []);
        } finally {
          await context.close();
        }
      });

      test('Settings agrees with the cupcake and the bar, and clears the device in two taps', async () => {
        const { context, page, errors } = await newViewportPage(vp);
        try {
          await page.goto(baseURL);
          await waitForRest(page);

          // The cover cupcake cycles the colourway; Settings shows the same one.
          await page.locator('.face--rest .cover-cupcake-btn').click();
          await page.waitForFunction(() => document.documentElement.dataset.theme === 'blueplate');
          await page.locator('.ctl--settings').click();
          const dialog = page.locator('[role="dialog"].settings-sheet');
          await dialog.waitFor({ state: 'visible' });
          assert.equal(await dialog.getByRole('radio', { name: 'Blue plate', exact: true }).getAttribute('aria-checked'), 'true');

          // The keep-awake switch and the bar's sun are one setting.
          const awake = dialog.getByRole('switch');
          if (await awake.count()) {
            await awake.click();
            assert.equal(await awake.getAttribute('aria-checked'), 'true');
            assert.equal(await page.locator('.ctl--awake').getAttribute('aria-pressed'), 'true');
          }

          // First tap only arms; the second clears and reloads to defaults.
          await dialog.getByRole('button', { name: 'Clear this device', exact: true }).click();
          assert.ok(await page.evaluate(() => localStorage.getItem('recipe-book:theme') === 'blueplate'));
          await Promise.all([
            page.waitForEvent('load'),
            dialog.getByRole('button', { name: 'Clear everything', exact: true }).click(),
          ]);
          await waitForRest(page);
          assert.equal(await page.evaluate(() => document.documentElement.dataset.theme || 'cherry'), 'cherry');
          assert.equal(await page.evaluate(() => localStorage.getItem('recipe-book:theme')), null);
          assert.deepEqual(errors, []);
        } finally {
          await context.close();
        }
      });
    }
  });
}
