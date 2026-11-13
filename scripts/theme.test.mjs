// Colourways: every text pairing passes WCAG AA, and the CSS carries the
// same values as src/theme.js. Run: node --test scripts/theme.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEMES, THEME_IDS, nextTheme } from '../src/theme.js';
import { themeText } from '../src/theme-i18n.js';

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
  ['ground', 'primary', 4.5, 'primary button text'],
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
  ['tableInk', 'table', 4.5, 'wide-screen controls on the table'],
  ['coverInk', 'cover', 4.5, 'cover title'],
  ['coverBtnInk', 'coverBtn', 4.5, 'cover open button'],
  ['ink', 'ground', 3, 'focus outline on the page'],
  ['coverInk', 'cover', 3, 'focus outline on the cover'],
  ['tableInk', 'table', 3, 'focus outline on the wide-screen table'],
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

test('the CSS carries the same values as src/theme.js and sets color-scheme explicitly', () => {
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
    if (id === 'cherry') assert.match(block, /color-scheme:\s*light;/);
    if (id === 'afterhours') assert.match(block, /color-scheme:\s*dark;/);
  }
  assert.doesNotMatch(css, /prefers-color-scheme/);
});

test('nextTheme cycles through every colourway and wraps around', () => {
  assert.deepEqual(THEME_IDS, ['cherry', 'blueplate', 'soda', 'butterscotch', 'afterhours']);
  assert.equal(nextTheme('cherry'), 'blueplate');
  assert.equal(nextTheme('blueplate'), 'soda');
  assert.equal(nextTheme('soda'), 'butterscotch');
  assert.equal(nextTheme('butterscotch'), 'afterhours');
  assert.equal(nextTheme('afterhours'), 'cherry');
  assert.equal(nextTheme('unknown'), 'cherry');
});

test('theme-i18n names every colourway in English, German, and French', () => {
  for (const id of THEME_IDS) {
    assert.ok(themeText.en.names[id]?.trim(), `missing EN name for ${id}`);
    assert.ok(themeText.de.names[id]?.trim(), `missing DE name for ${id}`);
    assert.ok(themeText.fr.names[id]?.trim(), `missing FR name for ${id}`);
  }
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

  const helperMatch = ornaments.match(/function scallopedBite[\s\S]*?\n\}/);
  const bitesMatch = ornaments.match(/export const CUPCAKE_BITES = \[[\s\S]*?\];/);
  assert.ok(helperMatch && bitesMatch, 'scallopedBite and CUPCAKE_BITES defined');
  const bites = new Function(`${helperMatch[0]}\n${bitesMatch[0].replace('export const ', 'const ')}\nreturn CUPCAKE_BITES;`)();
  assert.equal(bites.length, 3);
  assert.ok(bites[0].r >= 20 && bites[1].r >= 20, `expected big held bites, got ${bites.slice(0, 2).map((b) => b.r)}`);
  assert.ok(bites[2].r >= 50, `expected final bite to finish the cupcake, got ${bites[2].r}`);
  for (const [idx, bite] of bites.slice(0, 2).entries()) {
    const arcs = [...bite.edge.matchAll(/A([\d.]+) ([\d.]+) 0 0 0/g)];
    assert.ok(arcs.length >= 4, `bite ${idx + 1} should have several rounded tooth marks, got ${arcs.length}`);
    assert.ok(new Set(arcs.map((m) => m[1])).size >= 3, `bite ${idx + 1} tooth marks should be slightly varied`);
    assert.ok(bite.mask.startsWith(bite.edge) && bite.mask.endsWith('Z'), `bite ${idx + 1} mask closes its scalloped edge`);
  }
  assert.notEqual(bites[0].edge, bites[1].edge, 'successive bites should vary');
  assert.doesNotMatch(ornaments, /<mask[\s\S]*?<circle[\s\S]*?<\/mask>/, 'bites should not be plain circle cut-outs');
  assert.match(ornaments, /clipPath=\{`url\(#\$\{clipId\}\)`\}/);
  assert.doesNotMatch(ornaments, /filter=|drop-shadow|linearGradient|radialGradient/);
  assert.match(ornaments, /mask=\{finished \? mask : undefined\}/);
  assert.match(ornaments, /export function CupcakeCrumbs/);

  assert.match(pages, /bite as biteSound/);
  assert.match(pages, /const holdStart[\s\S]*primeAudio\(\)/);
  assert.match(pages, /const takeBite[\s\S]*biteSound\(n - 1\)[\s\S]*if \(n >= CUPCAKE_BITES\.length\)/);
  assert.match(pages, /<CupcakeCrumbs \/>/);
  assert.match(pages, /recordMuffinFinish\(\)/);
  assert.match(pages, /tierForFinishes\(totalFinishes\)/);
  assert.match(pages, /pickNextIndex\(tierPool\.allGone\.length,\s*lastGoneByTier\[tier\]\)/);
  assert.match(pages, /pickNextIndex\(replyPool\.length,\s*lastReplyByTier\[tier\]\)/);
  assert.match(pages, /className="cover-cupcake-gone"[\s\S]*themeCopy\.tiers\[finishTier\]\.allGone\[goneIndex\]/);
  assert.match(pages, /className="cover-cupcake-reply"[\s\S]*themeCopy\.tiers\[finishTier\]\.muffinReply\[replyIndex\]/);
  assert.match(pages, /setFresh\(true\)/);
  assert.match(pages, /setReplying\(true\)/);

  // Kalam font, flat retro look (no box-shadow/text-shadow/filter), transform/opacity only, reduced-motion safe.
  const goneRule = styles.match(/\.cover-cupcake-gone\s*\{([\s\S]*?)\n\}/);
  const replyRule = styles.match(/\.cover-cupcake-reply\s*\{([\s\S]*?)\n\}/);
  assert.ok(goneRule && /font-family:\s*var\(--hand\);/.test(goneRule[1]));
  assert.ok(replyRule && /font-family:\s*var\(--hand\);/.test(replyRule[1]));
  assert.doesNotMatch(goneRule[1], /box-shadow|text-shadow|filter|glow/);
  assert.doesNotMatch(replyRule[1], /box-shadow|text-shadow|filter|glow/);
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
