// Cookbook ribbon bookmark & page-chrome UI chrome (EN, Austrian DE, FR).
// Kept modular alongside src/fav-i18n.js and src/share-i18n.js.

export const moreBookText = {
  en: {
    continueLabel: 'Continue',
    leftOff: 'where you left off',
    continueAria: (title) => `Continue ${title} (where you left off)`,
    bookmarkTitle: (title) => `Bookmark: ${title}`,
    pageLabel: (folio) => `Page ${folio}`,
  },
  de: {
    continueLabel: 'Weiterlesen',
    leftOff: 'wo du aufgeh\u00f6rt hast',
    continueAria: (title) => `Weiterlesen ${title} (wo du aufgeh\u00f6rt hast)`,
    bookmarkTitle: (title) => `Lesezeichen: ${title}`,
    pageLabel: (folio) => `Seite ${folio}`,
  },
  fr: {
    continueLabel: 'Reprendre',
    leftOff: 'l\u00e0 o\u00f9 vous en \u00e9tiez',
    continueAria: (title) => `Reprendre ${title} (l\u00e0 o\u00f9 vous en \u00e9tiez)`,
    bookmarkTitle: (title) => `Marque-page : ${title}`,
    pageLabel: (folio) => `Page ${folio}`,
  },
};

export const moreBookCopyFor = (lang) => moreBookText[lang] || moreBookText.en;
