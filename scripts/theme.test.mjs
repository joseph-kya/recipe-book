// Colourways: every text pairing passes WCAG AA, and the CSS carries the
// same values as src/theme.js. Run: node --test scripts/theme.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEMES, THEME_IDS, nextTheme } from '../src/theme.js';

const lum = (hex) => {
  const [r, g, b] = hex.replace('#', '').match(/../g).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, minimum, where]
const PAIRS = [
  ['primary', 'ground', 4.5, 'headings, eyebrows, links on the page'],
  ['primary', 'paper', 4.5, 'step titles on the method ticket'],
  ['ground', 'primary', 4.5, 'cover title, primary button text'],
  ['primaryInk', 'card', 4.5, 'amounts and group titles on the ingredient card'],
  ['primaryDeep', 'accent', 4.5, 'small primary text on the accent'],
  ['ink', 'ground', 4.5, 'body text'],
  ['ink', 'paper', 4.5, 'method text'],
  ['ink', 'card', 4.5, 'ingredient names'],
  ['ink', 'accent', 4.5, 'tip and step-dot text on the accent'],
  ['ink', 'accent2', 4.5, 'second tip card'],
  ['inkSoft', 'card', 4.5, 'notes and metric on the card'],
  ['inkSoft', 'ground', 4.5, 'small credits'],
  ['cue', 'paper', 4.5, 'handwritten cues'],
  ['ground', 'ink', 4.5, 'stat chips, pressed toggles and chips'],
  ['accent', 'ink', 4.5, 'stat values on the chips'],
  ['ground', 'table', 4.5, 'wide-screen controls on the table'],
  ['ink', 'ground', 3, 'focus outline on the page'],
  ['ground', 'primary', 3, 'focus outline on the cover'],
];

for (const id of THEME_IDS) {
  test(`${id}: every text pairing passes AA`, () => {
    const t = THEMES[id];
    const rows = PAIRS.map(([fg, bg, min, where]) => {
      const c = contrast(t[fg], t[bg]);
      assert.ok(c >= min, `${id} ${fg} ${t[fg]} on ${bg} ${t[bg]} = ${c.toFixed(2)} < ${min} (${where})`);
      return c;
    });
    console.log(`  ${id.padEnd(12)} primary ${t.primary}  lowest ${Math.min(...rows).toFixed(2)}:1`);
  });
}

test("index.html's pre-paint script knows every colourway's page colour", () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, new RegExp(`theme-color" content="${THEMES.cherry.ground}"`, 'i'));
  for (const id of THEME_IDS.filter((x) => x !== 'cherry')) {
    assert.match(html, new RegExp(`${id}: '${THEMES[id].ground}'`), `${id} ground in index.html`);
  }
});

test('the CSS carries the same values as src/theme.js', () => {
  const kebab = (k) => `--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
  const css = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8');
  for (const id of THEME_IDS) {
    const sel = id === 'cherry' ? ':root' : `html[data-theme='${id}']`;
    const start = css.indexOf(`${sel} {`);
    assert.ok(start >= 0, `no block for ${sel}`);
    const block = css.slice(start, css.indexOf('}', start));
    for (const [k, v] of Object.entries(THEMES[id])) {
      assert.match(block, new RegExp(`${kebab(k)}:\\s*${v};`, 'i'), `${id} ${kebab(k)} should be ${v}`);
    }
  }
});

test('nextTheme cycles through every colourway and wraps around', () => {
  assert.deepEqual(THEME_IDS, ['cherry', 'blueplate', 'soda', 'butterscotch']);
  assert.equal(nextTheme('cherry'), 'blueplate');
  assert.equal(nextTheme('blueplate'), 'soda');
  assert.equal(nextTheme('soda'), 'butterscotch');
  assert.equal(nextTheme('butterscotch'), 'cherry');
  assert.equal(nextTheme('unknown'), 'cherry');
});

test('cover uses the cupcake button instead of colour-dot swatches', () => {
  const pages = readFileSync(new URL('../src/pages.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(pages, /ThemePicker|theme-swatch|theme-picker/);
  assert.match(pages, /className="cover-cupcake-btn"/);
  assert.match(pages, /aria-label=\{themeCopy\.changeColor\}/);
});

test('cover cupcake bites are noticeably big, finish on the last bite, celebrate in Kalam, reply and respawn', () => {
  const ornaments = readFileSync(new URL('../src/ornaments.jsx', import.meta.url), 'utf8');
  const pages = readFileSync(new URL('../src/pages.jsx', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

  const bitesBlock = ornaments.match(/export const CUPCAKE_BITES = \[([\s\S]*?)\];/);
  assert.ok(bitesBlock, 'CUPCAKE_BITES exported');
  const radii = [...bitesBlock[1].matchAll(/r:\s*(\d+)/g)].map((m) => Number(m[1]));
  assert.equal(radii.length, 3);
  assert.ok(radii[0] >= 20 && radii[1] >= 20, `expected big held bites, got ${radii.slice(0, 2)}`);
  assert.ok(radii[2] >= 50, `expected final bite to finish the cupcake, got ${radii[2]}`);
  assert.match(ornaments, /mask=\{finished \? mask : undefined\}/);
  assert.match(ornaments, /export function CupcakeCrumbs/);

  assert.match(pages, /<CupcakeCrumbs \/>/);
  assert.match(pages, /className="cover-cupcake-gone"[\s\S]*themeCopy\.allGone/);
  assert.match(pages, /className="cover-cupcake-reply"[\s\S]*themeCopy\.muffinReply/);
  assert.match(pages, /setFresh\(true\)/);
  assert.match(pages, /setReplying\(true\)/);

  // Kalam font, flat retro look (no box-shadow/text-shadow/filter), transform/opacity only, reduced-motion safe.
  assert.match(styles, /\.cover-cupcake-gone\s*\{[\s\S]*font-family:\s*var\(--hand\);/);
  assert.match(styles, /\.cover-cupcake-reply\s*\{[\s\S]*font-family:\s*var\(--hand\);/);
  const keyframeNames = ['cupcake-chomp', 'cupcake-fresh', 'cupcake-crumb-pop', 'cupcake-gone-pop', 'cupcake-reply-pop'];
  for (const name of keyframeNames) {
    const m = styles.match(new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`));
    assert.ok(m, `missing @keyframes ${name}`);
    assert.doesNotMatch(m[1], /box-shadow|text-shadow|filter|glow/);
    for (const prop of [...m[1].matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1])) {
      assert.ok(prop === 'transform' || prop === 'opacity', `${name} uses non-composited property: ${prop}`);
    }
    assert.match(styles, new RegExp(`@media \\(prefers-reduced-motion: reduce\\)[\\s\\S]*${name === 'cupcake-chomp' ? 'cover-cupcake--bitten' : name === 'cupcake-fresh' ? 'cover-cupcake--fresh' : name === 'cupcake-crumb-pop' ? 'cover-crumb' : name === 'cupcake-gone-pop' ? 'cover-cupcake-gone' : 'cover-cupcake-reply'}[\\s\\S]*animation:\\s*none;`));
  }
});
