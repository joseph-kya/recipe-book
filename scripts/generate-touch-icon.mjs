import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  const svg = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');
  await page.setContent(`<style>html,body{margin:0;width:180px;height:180px}svg{display:block;width:180px;height:180px}</style>${svg}`);
  await page.screenshot({ path: new URL('../public/apple-touch-icon.png', import.meta.url).pathname });
} finally {
  await browser.close();
}
