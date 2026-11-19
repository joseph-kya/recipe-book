// Favorite & baked-counter UI chrome (EN, Austrian DE, FR).
// Separate from src/i18n.js to stay modular alongside src/recipe-reading-i18n.js.

export const favText = {
  en: {
    favorite: (title) => `Save ${title} to favorites`,
    unfavorite: (title) => `Remove ${title} from favorites`,
    favorited: 'Saved to favorites',
    unfavorited: 'Removed from favorites',
    favoriteBadge: 'Favorite',
    bakedIdle: 'Baked it',
    bakedCount: (n) => `Baked ${n}\u00d7`,
    bakedLabel: (title, n) =>
      n === 0
        ? `Baked it \u2014 mark ${title} as baked`
        : `Baked ${n}\u00d7 \u2014 ${title}. Tap to add one, hold to undo`,
    bakedAnnounce: (n) =>
      n === 0 ? 'Baked count reset' : n === 1 ? 'Baked 1 time' : `Baked ${n} times`,
  },
  de: {
    favorite: (title) => `${title} zu Favoriten hinzuf\u00fcgen`,
    unfavorite: (title) => `${title} aus Favoriten entfernen`,
    favorited: 'Zu Favoriten hinzugef\u00fcgt',
    unfavorited: 'Aus Favoriten entfernt',
    favoriteBadge: 'Favorit',
    bakedIdle: 'Gebacken',
    bakedCount: (n) => `${n}\u00d7 gebacken`,
    bakedLabel: (title, n) =>
      n === 0
        ? `Gebacken \u2014 ${title} als gebacken markieren`
        : `${n}\u00d7 gebacken \u2014 ${title}. Tippen zum Hochz\u00e4hlen, gedr\u00fcckt halten zum Zur\u00fccknehmen`,
    bakedAnnounce: (n) => (n === 0 ? 'Backz\u00e4hler zur\u00fcckgesetzt' : `${n}-mal gebacken`),
  },
  fr: {
    favorite: (title) => `Ajouter ${title} aux favoris`,
    unfavorite: (title) => `Retirer ${title} des favoris`,
    favorited: 'Ajout\u00e9 aux favoris',
    unfavorited: 'Retir\u00e9 des favoris',
    favoriteBadge: 'Favori',
    bakedIdle: 'D\u00e9j\u00e0 fait',
    bakedCount: (n) => `Fait ${n}\u00d7`,
    bakedLabel: (title, n) =>
      n === 0
        ? `D\u00e9j\u00e0 fait \u2014 marquer ${title} comme d\u00e9j\u00e0 fait`
        : `Fait ${n}\u00d7 \u2014 ${title}. Appuyer pour ajouter une fois, maintenir pour annuler`,
    bakedAnnounce: (n) => (n === 0 ? 'Compteur remis \u00e0 z\u00e9ro' : `Fait ${n} fois`),
  },
};

export const favCopyFor = (lang) => favText[lang] || favText.en;
