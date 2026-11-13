import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { LANGS, nextLang, ui } from '../src/i18n.js';

const baseURL = process.env.A11Y_URL || 'http://localhost:4173/';
const recipeDirectory = new URL('../content/recipes/', import.meta.url);
const recipes = await Promise.all((await readdir(recipeDirectory))
  .filter((name) => name.endsWith('.json'))
  .map(async (name) => JSON.parse(await readFile(new URL(name, recipeDirectory), 'utf8'))));
const expectedTitle = (route, lang) => {
  const recipe = recipes.find((item) => (item.route || item.slug) === route);
  const page = recipe ? (recipe[lang] || recipe.en).title : route === 'contents' ? ui[lang].contents : '';
  return page ? `${page} · ${ui[lang].bookTitleFlat}` : ui[lang].bookTitleFlat;
};

async function checkDocument(page, route, lang) {
  await page.waitForFunction(({ title, lang }) =>
    document.title === title && document.documentElement.lang === lang,
  { title: expectedTitle(route, lang), lang });
  assert.equal(await page.title(), expectedTitle(route, lang));
}

const browser = await chromium.launch({ channel: 'chrome' });
let failures = 0;
let violations = 0;

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const mobile = viewport.width === 390;
    for (const lang of LANGS) {
      const context = await browser.newContext({
        viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
        locale: lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : 'en-US', reducedMotion: 'reduce',
      });
      await context.addInitScript((value) => localStorage.setItem('recipe-book:lang', value), lang);
      const page = await context.newPage();
      for (const route of ['', 'contents', 'brownies', 'cinnamon-rolls']) {
        await page.goto(new URL(`#/${route}`, baseURL).href);
        await checkDocument(page, route, lang);
        await page.evaluate(() => document.fonts.ready);
        // Let font measurement, pagination and the reduced-motion crossfade settle.
        await page.waitForTimeout(500);
        const result = await new AxeBuilder({ page }).analyze();
        console.log(`${viewport.width}x${viewport.height} ${lang} #/${route}: ${result.violations.length} violations`);
        for (const violation of result.violations) {
          violations++;
          console.log(`  ${violation.id} [${violation.impact}]: ${violation.nodes.length} nodes`);
          for (const node of violation.nodes) console.log(`    ${node.target.join(' > ')}`);
          if (['serious', 'critical'].includes(violation.impact)) failures++;
        }
      }
      // Verify live language, units and wake-lock controls, plus pushState navigation.
      const otherLang = nextLang(lang);
      await page.locator('.lang-btn').click();
      await checkDocument(page, 'cinnamon-rolls', otherLang);
      await page.locator('.unit-btn').click();
      assert.equal(await page.locator('.unit-btn').innerText(), 'g');
      await page.locator('.ctl--awake').click();
      assert.equal(await page.locator('.ctl--awake').getAttribute('aria-pressed'), 'true');
      await page.locator('.ctl--awake').click();
      assert.equal(await page.locator('.ctl--awake').getAttribute('aria-pressed'), 'false');
      await page.goto(new URL('#/', baseURL).href);
      await checkDocument(page, '', otherLang);
      await page.waitForTimeout(500);
      await page.keyboard.press('ArrowRight');
      await page.waitForURL('**/#/contents');
      await checkDocument(page, 'contents', otherLang);
      await page.goBack();
      await checkDocument(page, '', otherLang);
      await page.goForward();
      await checkDocument(page, 'contents', otherLang);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`Total: ${violations} rule occurrences; ${failures} serious/critical.`);
if (failures) process.exitCode = 1;
