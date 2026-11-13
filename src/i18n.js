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
    equipment: 'Equipment',
    tips: 'Tips',
    macros: 'Macros',
    macroProtein: 'Protein',
    macroCarbs: 'Carbs',
    macroFat: 'Fat',
    macroPerServing: 'per serving',
    macroBasis: { squares: 'per square', rolls: 'per roll', slices: 'per slice' },
    macroTotal: 'whole batch',
    macroNote: 'approx., USDA data',
    source: 'Recipe',
    conversions: 'Conversions',
    downloadPdf: 'Download PDF',
    cont: '(cont.)',
    pdfLabel: (title, grams = false) => `Download the printable sheet for ${title} (PDF, ${grams ? 'grams' : 'cups and spoons'})`,
    englishOnly: null,
    photoLabel: '',
    photoCredit: 'Photo',
    photoAlt: (title, site) => `${title}, photo from ${site}`,
    prev: 'Previous page',
    next: 'Next page',
    toContents: 'Contents',
    language: 'Language',
    languageEnglish: 'English',
    languageGerman: 'Deutsch',
    switchLang: 'EN — Language: English, switch to Deutsch',
    description: "Joseph's baking recipes in a book you flip through: cups and spoons first, grams beside, a printable sheet for every recipe.",
    shareDescription: "Joseph's baking recipes, cups and spoons first.",
    units: 'Units',
    unitCups: 'cups',
    unitMetric: 'g',
    unitCupsLong: 'cups and spoons first',
    unitMetricLong: 'metric first',
    switchToMetric: 'cups — Units: switch to grams (g)',
    switchToCups: 'g — Units: grams, switch to cups',
    scale: 'Portions',
    scaleNote: 'Pan size and bake time may change.',
    custom: 'custom',
    customAmount: 'Custom amount',
    less: 'Less',
    more: 'More',
    pageOf: (i, n) => `Page ${i} of ${n}`,
    cover: 'Cover',
    bookLabel: "Recipe book. Swipe or use the arrow keys to turn pages.",
    timerStart: (d) => `Start a ${d} timer`,
    timerPause: (left) => `${left} left. Pause timer`,
    timerResume: (left) => `Paused, ${left} left. Resume timer`,
    timerClear: 'Clear paused timer',
    timerDone: 'Time!',
    timerReset: 'Time is up. Clear timer',
    timer: 'Timer',
    timerLess: 'One minute less',
    timerMore: 'One minute more',
    keepAwake: 'Keep the screen on while baking',
    startCooking: 'Start cooking',
    cookMode: 'Cook mode',
    cookDialogLabel: (title) => `${title} — Cook mode`,
    cookStepOf: (i, n) => `Step ${i} of ${n}`,
    cookPrev: 'Previous',
    cookNext: 'Next',
    cookClose: 'Close cook mode',
    cookDoneTitle: 'Done — enjoy!',
    cookDoneBody: 'All steps completed.',
    cookBackToRecipe: 'Back to recipe',
    cookToggleDone: (i, done) => (done ? `Step ${i} done. Mark undone` : `Mark step ${i} done`),
  },
  de: {
    bookTitle: ['Josephs', 'Rezeptbuch'],
    bookTitleFlat: 'Josephs Rezeptbuch',
    open: 'Öffnen',
    contents: 'Inhalt',
    recipeNo: 'Nr.',
    ingredients: 'Zutaten',
    method: 'Zubereitung',
    equipment: 'Utensilien',
    tips: 'Tipps',
    macros: 'Nährwerte',
    macroProtein: 'Eiweiß',
    macroCarbs: 'Kohlen\u00ADhydrate',
    macroFat: 'Fett',
    macroPerServing: 'pro Portion',
    macroBasis: { squares: 'pro Stück', rolls: 'pro Schnecke', slices: 'pro Stück' },
    macroTotal: 'gesamt',
    macroNote: 'ca., USDA-Daten',
    source: 'Rezept',
    conversions: 'Umrechnung',
    downloadPdf: 'PDF herunterladen',
    cont: '(Forts.)',
    pdfLabel: (title, grams = false) => `Druckblatt für ${title} herunterladen (PDF, Englisch, ${grams ? 'Gramm' : 'Tassen und Löffel'})`,
    englishOnly: 'Bisher nur auf Englisch.',
    photoLabel: '',
    photoCredit: 'Foto',
    photoAlt: (title, site) => `${title}, Foto von ${site}`,
    prev: 'Vorherige Seite',
    next: 'Nächste Seite',
    toContents: 'Inhalt',
    language: 'Sprache',
    languageEnglish: 'Englisch',
    languageGerman: 'Deutsch',
    switchLang: 'DE — Sprache: Deutsch, zu Englisch wechseln',
    description: 'Josephs Backrezepte in einem Buch zum Durchblättern: Tassen und Löffel zuerst, Gramm daneben und zu jedem Rezept ein Blatt zum Ausdrucken.',
    shareDescription: 'Josephs Backrezepte, mit Tassen und Löffeln zuerst.',
    units: 'Einheiten',
    unitCups: 'Tassen',
    unitMetric: 'g',
    unitCupsLong: 'Tassen und Löffel zuerst',
    unitMetricLong: 'metrisch zuerst',
    switchToMetric: 'Tassen — Einheiten: zu Gramm (g) wechseln',
    switchToCups: 'g — Einheiten: Gramm, zu Tassen wechseln',
    scale: 'Portionen',
    scaleNote: 'Form und Backzeit können sich ändern.',
    custom: 'eigene',
    customAmount: 'Eigene Menge',
    less: 'Weniger',
    more: 'Mehr',
    pageOf: (i, n) => `Seite ${i} von ${n}`,
    cover: 'Titelseite',
    bookLabel: 'Rezeptbuch. Wischen oder Pfeiltasten zum Blättern.',
    timerStart: (d) => `Timer für ${d} starten`,
    timerPause: (left) => `Noch ${left}. Timer pausieren`,
    timerResume: (left) => `Pausiert, noch ${left}. Timer fortsetzen`,
    timerClear: 'Pausierten Timer löschen',
    timerDone: 'Fertig!',
    timerReset: 'Zeit ist um. Timer löschen',
    timer: 'Timer',
    timerLess: 'Eine Minute weniger',
    timerMore: 'Eine Minute mehr',
    keepAwake: 'Bildschirm beim Backen anlassen',
    startCooking: 'Jetzt kochen',
    cookMode: 'Kochmodus',
    cookDialogLabel: (title) => `${title} — Kochmodus`,
    cookStepOf: (i, n) => `Schritt ${i} von ${n}`,
    cookPrev: 'Zurück',
    cookNext: 'Weiter',
    cookClose: 'Kochmodus schließen',
    cookDoneTitle: 'Fertig — guten Appetit!',
    cookDoneBody: 'Alle Schritte erledigt.',
    cookBackToRecipe: 'Zurück zum Rezept',
    cookToggleDone: (i, done) => (done ? `Schritt ${i} erledigt. Zurücksetzen` : `Schritt ${i} als erledigt markieren`),
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

import { useRef } from 'react';

export function useLang() {
  const [lang, setLangState] = useState(initialLang);
  const requestedLang = useRef(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    const t = ui[lang];
    for (const [selector, content] of [
      ['meta[name="description"]', t.description],
      ['meta[property="og:title"]', t.bookTitleFlat],
      ['meta[property="og:description"]', t.shareDescription],
    ]) {
      document.querySelector(selector)?.setAttribute('content', content);
    }
  }, [lang]);

  const setLang = useCallback((next) => {
    if (next !== 'en' && next !== 'de') return;
    if (next === requestedLang.current) return;
    requestedLang.current = next;
    setLangState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: the choice lasts this visit */
    }
  }, []);

  return [lang, setLang];
}
