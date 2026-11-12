import { useCallback, useState } from 'react';
import { transition } from './motion.js';

// Four diner colourways. Each is a full token set, not a hue swap; the CSS in
// src/theme.css mirrors these values (scripts/theme.test.mjs checks both that
// they match and that every text pairing passes WCAG AA).
//   primary      headings, links, the cover, primary buttons
//   primaryInk   primary text on the ingredient card
//   primaryDeep  primary text on the accent (small text on the sticker colour)
//   card         the ingredient card
//   accent       step dots, stat values, the first tip card
//   accent2      the second tip card
//   ink          body text, rules, hard shadows
//   inkSoft      notes and small credits
//   cue          handwritten cues
//   ground       the page
//   paper        the method ticket
//   table        the wide-screen table, and its checker tile
//   frosting     the cupcake's frosting
export const THEMES = {
  cherry: {
    primary: '#c8233a', primaryInk: '#a11b2e', primaryDeep: '#8e1626',
    card: '#a8dccb', accent: '#f2b134', accent2: '#f7c9cf',
    ink: '#3a2216', inkSoft: '#4a3022', cue: '#6b4a36',
    ground: '#fff4df', paper: '#fffaf1', table: '#3a2216', tableTile: '#43291c', frosting: '#7a4a35',
  },
  blueplate: {
    primary: '#1d5fa8', primaryInk: '#174a85', primaryDeep: '#123b6b',
    card: '#bfe3ef', accent: '#f2b134', accent2: '#f7c9cf',
    ink: '#1b2340', inkSoft: '#2c3657', cue: '#4a5578',
    ground: '#fbf4e4', paper: '#fffbf3', table: '#1b2340', tableTile: '#222c4f', frosting: '#7a4a35',
  },
  soda: {
    primary: '#1a7356', primaryInk: '#145a43', primaryDeep: '#0f4a37',
    card: '#f8e7b0', accent: '#f4c542', accent2: '#cdebdd',
    ink: '#1f2f27', inkSoft: '#2e4338', cue: '#4f5e52',
    ground: '#fdf5e6', paper: '#fffbf2', table: '#1f2f27', tableTile: '#263a30', frosting: '#f7c9cf',
  },
  butterscotch: {
    primary: '#b04a12', primaryInk: '#8c3a0e', primaryDeep: '#6e2c08',
    card: '#bfe0dc', accent: '#f4c95d', accent2: '#f6d1c1',
    ink: '#3a2216', inkSoft: '#4a3022', cue: '#6b4a36',
    ground: '#fff2e0', paper: '#fffaf2', table: '#1f3a3d', tableTile: '#24454a', frosting: '#7a4a35',
  },
};

export const THEME_IDS = Object.keys(THEMES);
export const DEFAULT_THEME = 'cherry';
const KEY = 'recipe-book:theme';

const current = () => {
  const t = typeof document !== 'undefined' && document.documentElement.dataset.theme;
  return THEME_IDS.includes(t) ? t : DEFAULT_THEME;
};

// Set the attribute the CSS reads and the browser bar colour. index.html does
// the same before first paint, so a saved colourway never flashes the default.
export function applyTheme(id) {
  const root = document.documentElement;
  if (id === DEFAULT_THEME) delete root.dataset.theme;
  else root.dataset.theme = id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[id].ground);
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
