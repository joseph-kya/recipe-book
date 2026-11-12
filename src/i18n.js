import { useCallback, useEffect, useState } from 'react';

// UI chrome only. Recipe text never lives here.
export const ui = {
  en: {
    bookTitle: ["Bread Pitt's", 'Recipe Book'],
    bookTitleFlat: "Bread Pitt's Recipe Book",
    coverEyebrow: (n) => `${n} recipes from Joseph's oven`,
    coverSticker: ['Cups', 'first!'],
    coverNote: 'Cups and spoons first. The kitchen scale is broken.',
    open: 'Open the book',
    contents: 'Contents',
    recipeNo: 'Recipe No.',
    howTitle: 'How this book works',
    howCups: 'Cups and spoons come first, in big type. Grams sit beside them, smaller, for when the scale is fixed.',
    demoCup: '1 cup',
    howTurn: 'Swipe a page, use the arrow keys, or tap the arrows to turn.',
    howPdf: 'Every recipe has a printable sheet for the fridge door.',
    ingredients: 'Ingredients',
    cupsMetric: 'Cups & spoons · metric beside',
    method: 'Method',
    equipment: "You'll need",
    tips: 'Tips',
    source: 'Recipe',
    conversions: 'Conversions',
    viewSource: 'Original recipe',
    downloadPdf: 'Download PDF',
    cont: '(cont.)',
    pdfLabel: (title) => `Download the printable sheet for ${title} (PDF)`,
    englishOnly: null,
    prev: 'Previous page',
    next: 'Next page',
    toContents: 'Contents',
    language: 'Language',
    pageOf: (i, n) => `Page ${i} of ${n}`,
    cover: 'Cover',
    bookLabel: "Recipe book. Swipe or use the arrow keys to turn pages.",
  },
  de: {
    bookTitle: ['Bread Pitts', 'Rezeptbuch'],
    bookTitleFlat: 'Bread Pitts Rezeptbuch',
    coverEyebrow: (n) => `${n} Rezepte aus Josephs Ofen`,
    coverSticker: ['Tassen', 'zuerst!'],
    coverNote: 'Erst Tassen und Löffel. Die Küchenwaage ist kaputt.',
    open: 'Buch öffnen',
    contents: 'Inhalt',
    recipeNo: 'Rezept Nr.',
    howTitle: 'So funktioniert das Buch',
    howCups: 'Tassen und Löffel stehen vorn, groß. Gramm stehen klein daneben, für wenn die Waage wieder geht.',
    demoCup: '1 Tasse',
    howTurn: 'Seite wischen, Pfeiltasten nutzen oder auf die Pfeile tippen.',
    howPdf: 'Zu jedem Rezept gibt es ein Blatt zum Ausdrucken für die Kühlschranktür.',
    ingredients: 'Zutaten',
    cupsMetric: 'Tassen & Löffel · metrisch daneben',
    method: 'Zubereitung',
    equipment: 'Das brauchst du',
    tips: 'Tipps',
    source: 'Rezept',
    conversions: 'Umrechnung',
    viewSource: 'Originalrezept',
    downloadPdf: 'PDF herunterladen',
    cont: '(Forts.)',
    pdfLabel: (title) => `Druckblatt für ${title} herunterladen (PDF, Englisch)`,
    englishOnly: 'Dieses Rezept gibt es bisher nur auf Englisch.',
    prev: 'Vorherige Seite',
    next: 'Nächste Seite',
    toContents: 'Inhalt',
    language: 'Sprache',
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

export function useLang() {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: the choice lasts this visit */
    }
  }, []);

  return [lang, setLang];
}
