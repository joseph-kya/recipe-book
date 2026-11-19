// Share button and print-sheet UI chrome (EN, Austrian DE, FR).
// Kept modular alongside src/recipe-reading-i18n.js and src/theme-i18n.js.

export const shareText = {
  en: {
    share: 'Share recipe',
    shareTitle: (title) => `Share ${title}`,
    shared: 'Recipe shared',
    copied: 'Link copied',
    copyFailed: 'Could not copy link',
    printScale: (label) => `${label} batch`,
    printUnitsCups: 'Cups & spoons first',
    printUnitsMetric: 'Grams first',
  },
  de: {
    share: 'Rezept teilen',
    shareTitle: (title) => `${title} teilen`,
    shared: 'Rezept geteilt',
    copied: 'Link kopiert',
    copyFailed: 'Link konnte nicht kopiert werden',
    printScale: (label) => `${label} Menge`,
    printUnitsCups: 'Tassen & Löffel zuerst',
    printUnitsMetric: 'Gramm zuerst',
  },
  fr: {
    share: 'Partager la recette',
    shareTitle: (title) => `Partager ${title}`,
    shared: 'Recette partagée',
    copied: 'Lien copié',
    copyFailed: 'Impossible de copier le lien',
    printScale: (label) => `Portions ${label}`,
    printUnitsCups: 'Tasses et cuillères d’abord',
    printUnitsMetric: 'Grammes d’abord',
  },
};

export const shareCopyFor = (lang) => shareText[lang] || shareText.en;
