import { useCallback, useEffect, useState } from 'react';

// UI chrome only. Recipe text never lives here.
export const ui = {
  en: {
    bookTitle: ["Joseph's", 'Recipe Book'],
    bookTitleFlat: "Joseph's Recipe Book",
    open: 'Open',
    contents: 'Contents',
    recipeNo: 'No.',
    ingredients: 'Ingredients',
    method: 'Method',
    equipment: "You'll need",
    tips: 'Tips',
    source: 'Recipe',
    conversions: 'Conversions',
    downloadPdf: 'Download PDF',
    cont: '(cont.)',
    pdfLabel: (title) => `Download the printable sheet for ${title} (PDF)`,
    englishOnly: null,
    prev: 'Previous page',
    next: 'Next page',
    toContents: 'Contents',
    language: 'Language',
    units: 'Units',
    unitCups: 'cups',
    unitMetric: 'g',
    unitCupsLong: 'cups and spoons first',
    unitMetricLong: 'metric first',
    pageOf: (i, n) => `Page ${i} of ${n}`,
    cover: 'Cover',
    bookLabel: "Recipe book. Swipe or use the arrow keys to turn pages.",
  },
  de: {
    bookTitle: ['Josephs', 'Rezeptbuch'],
    bookTitleFlat: 'Josephs Rezeptbuch',
    open: 'Öffnen',
    contents: 'Inhalt',
    recipeNo: 'Nr.',
    ingredients: 'Zutaten',
    method: 'Zubereitung',
    equipment: 'Das brauchst du',
    tips: 'Tipps',
    source: 'Rezept',
    conversions: 'Umrechnung',
    downloadPdf: 'PDF herunterladen',
    cont: '(Forts.)',
    pdfLabel: (title) => `Druckblatt für ${title} herunterladen (PDF, Englisch)`,
    englishOnly: 'Dieses Rezept gibt es bisher nur auf Englisch.',
    prev: 'Vorherige Seite',
    next: 'Nächste Seite',
    toContents: 'Inhalt',
    language: 'Sprache',
    units: 'Einheiten',
    unitCups: 'Tassen',
    unitMetric: 'g',
    unitCupsLong: 'Tassen und Löffel zuerst',
    unitMetricLong: 'metrisch zuerst',
    pageOf: (i, n) => `Seite ${i} von ${n}`,
    cover: 'Titelseite',
    bookLabel: 'Rezeptbuch. Wischen oder Pfeiltasten zum Blättern.',
  },
};

const KEY = 'recipe-book:lang';

function initialLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'de') return saved;
  } catch {
    /* storage blocked: fall through */
  }
  return (navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en';
}

import { transition } from './motion.js';
import { useRef } from 'react';

export function useLang() {
  const [lang, setLangState] = useState(initialLang);
  const requestedLang = useRef(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    if (next !== 'en' && next !== 'de') return;
    if (next === requestedLang.current) return;
    requestedLang.current = next;
    transition(() => setLangState(next));
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: the choice lasts this visit */
    }
  }, []);

  return [lang, setLang];
}
