import { useCallback, useState } from 'react';
import { transition } from './motion.js';

// Six colourways: four diner palettes plus two restrained monochrome themes
// (paper and ink). Each is a full token set, not a hue swap; the CSS in
// src/theme.css mirrors these values (scripts/theme.test.mjs checks both that
// they match and that every text pairing passes WCAG AA).
//   primary          headings, links, primary buttons
//   primaryInk       primary text on the ingredient card
//   primaryDeep      primary text on the accent (small text on the sticker colour)
//   card             the ingredient card
//   accent           step dots, stat values, the first tip card
//   accent2          the second tip card
//   ink              body text, rules
//   inkSoft          notes and small credits
//   cue              handwritten cues
//   ground           the page
//   paper            the method ticket
//   table            the wide-screen table, and its checker tile
//   frosting         the cupcake's frosting
//   shadow           hard shadows, spine/page shade, narrow edge backdrop
//   highlight        page-turn sheen
//   cover            the cover background (and its ink, checkers, title shadow, open button)
//   tableInk         wide-screen controls on the table (and active Contents pill ink)
//   cupcakeCherry    the cupcake's cherry and service bell knob
//   cupcakeCream     the cupcake's cream collar and service bell dome
export const THEMES = {
  cherry: {
    primary: '#c8233a', primaryInk: '#a11b2e', primaryDeep: '#8e1626',
    card: '#a8dccb', accent: '#f2b134', accent2: '#f7c9cf',
    ink: '#3a2216', inkSoft: '#4a3022', cue: '#6b4a36',
    ground: '#fff4df', paper: '#fffaf1', table: '#3a2216', tableTile: '#43291c', frosting: '#7a4a35',
    shadow: '#3a2216', highlight: '#fff4df',
    cover: '#c8233a', coverInk: '#fff4df', coverChecker: '#3a2216', coverCheckerAlt: '#fff4df',
    coverTitleShadow: '#3a2216', coverBtn: '#fff4df', coverBtnInk: '#3a2216',
    tableInk: '#fff4df', tableActiveInk: '#3a2216',
    cupcakeCherry: '#c8233a', cupcakeCream: '#fff4df',
  },
  blueplate: {
    primary: '#1d5fa8', primaryInk: '#174a85', primaryDeep: '#123b6b',
    card: '#bfe3ef', accent: '#f2b134', accent2: '#f7c9cf',
    ink: '#1b2340', inkSoft: '#2c3657', cue: '#4a5578',
    ground: '#fbf4e4', paper: '#fffbf3', table: '#1b2340', tableTile: '#222c4f', frosting: '#7a4a35',
    shadow: '#1b2340', highlight: '#fbf4e4',
    cover: '#1d5fa8', coverInk: '#fbf4e4', coverChecker: '#1b2340', coverCheckerAlt: '#fbf4e4',
    coverTitleShadow: '#1b2340', coverBtn: '#fbf4e4', coverBtnInk: '#1b2340',
    tableInk: '#fbf4e4', tableActiveInk: '#1b2340',
    cupcakeCherry: '#c8233a', cupcakeCream: '#fbf4e4',
  },
  soda: {
    primary: '#1a7356', primaryInk: '#145a43', primaryDeep: '#0f4a37',
    card: '#f8e7b0', accent: '#f4c542', accent2: '#cdebdd',
    ink: '#1f2f27', inkSoft: '#2e4338', cue: '#4f5e52',
    ground: '#fdf5e6', paper: '#fffbf2', table: '#1f2f27', tableTile: '#263a30', frosting: '#f7c9cf',
    shadow: '#1f2f27', highlight: '#fdf5e6',
    cover: '#1a7356', coverInk: '#fdf5e6', coverChecker: '#1f2f27', coverCheckerAlt: '#fdf5e6',
    coverTitleShadow: '#1f2f27', coverBtn: '#fdf5e6', coverBtnInk: '#1f2f27',
    tableInk: '#fdf5e6', tableActiveInk: '#1f2f27',
    cupcakeCherry: '#c8233a', cupcakeCream: '#fdf5e6',
  },
  butterscotch: {
    primary: '#b04a12', primaryInk: '#8c3a0e', primaryDeep: '#6e2c08',
    card: '#bfe0dc', accent: '#f4c95d', accent2: '#f6d1c1',
    ink: '#3a2216', inkSoft: '#4a3022', cue: '#6b4a36',
    ground: '#fff2e0', paper: '#fffaf2', table: '#1f3a3d', tableTile: '#24454a', frosting: '#7a4a35',
    shadow: '#3a2216', highlight: '#fff2e0',
    cover: '#b04a12', coverInk: '#fff2e0', coverChecker: '#3a2216', coverCheckerAlt: '#fff2e0',
    coverTitleShadow: '#3a2216', coverBtn: '#fff2e0', coverBtnInk: '#3a2216',
    tableInk: '#fff2e0', tableActiveInk: '#3a2216',
    cupcakeCherry: '#c8233a', cupcakeCream: '#fff2e0',
  },
  paper: {
    primary: '#222222', primaryInk: '#1f1f1f', primaryDeep: '#171717',
    card: '#ebebeb', accent: '#d4d4d4', accent2: '#e4e4e4',
    ink: '#171717', inkSoft: '#525252', cue: '#404040',
    ground: '#ffffff', paper: '#f5f5f5', table: '#262626', tableTile: '#2f2f2f', frosting: '#737373',
    shadow: '#171717', highlight: '#ffffff',
    cover: '#f4f4f4', coverInk: '#171717', coverChecker: '#222222', coverCheckerAlt: '#ffffff',
    coverTitleShadow: '#cfcfcf', coverBtn: '#171717', coverBtnInk: '#ffffff',
    tableInk: '#f4f4f4', tableActiveInk: '#171717',
    cupcakeCherry: '#333333', cupcakeCream: '#ffffff',
  },
  ink: {
    primary: '#e6e4de', primaryInk: '#e6e4de', primaryDeep: '#f2f0ea',
    card: '#2b2b2b', accent: '#8f6218', accent2: '#262626',
    ink: '#f2f0ea', inkSoft: '#b8b6af', cue: '#ccc9c1',
    ground: '#181818', paper: '#222222', table: '#0d0d0d', tableTile: '#121212', frosting: '#666666',
    shadow: '#080808', highlight: '#f2f0ea',
    cover: '#181818', coverInk: '#f2f0ea', coverChecker: '#2e2e2e', coverCheckerAlt: '#181818',
    coverTitleShadow: '#080808', coverBtn: '#8f6218', coverBtnInk: '#f2f0ea',
    tableInk: '#e6e4de', tableActiveInk: '#181818',
    cupcakeCherry: '#c49134', cupcakeCream: '#d6d4ce',
  },
};

export const THEME_IDS = Object.keys(THEMES);
export const DEFAULT_THEME = 'cherry';
const KEY = 'recipe-book:theme';

export const nextTheme = (id) => THEME_IDS[(THEME_IDS.indexOf(id) + 1) % THEME_IDS.length];

const current = () => {
  const t = typeof document !== 'undefined' && document.documentElement.dataset.theme;
  return THEME_IDS.includes(t) ? t : DEFAULT_THEME;
};

// Set the attribute the CSS reads and the browser bar colour. index.html does
// the same before first paint, so a saved colourway never flashes the default.
export function applyTheme(id) {
  const safe = THEME_IDS.includes(id) ? id : DEFAULT_THEME;
  const root = document.documentElement;
  if (safe === DEFAULT_THEME) delete root.dataset.theme;
  else root.dataset.theme = safe;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[safe].ground);
}

export function useTheme() {
  const [theme, setThemeState] = useState(current);
  const setTheme = useCallback((id) => {
    if (!THEME_IDS.includes(id) || id === current()) return;
    // The shared crossfade: the whole book changes colour in one fade,
    // interruptible, instant under reduced motion.
    transition(() => {
      applyTheme(id);
      setThemeState(id);
    });
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* storage blocked: the choice lasts this visit */
    }
  }, []);
  return [theme, setTheme];
}
