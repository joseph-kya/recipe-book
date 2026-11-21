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
    resetLabel: (title) => `Reset baked count for ${title}`,
    resetDone: (n) => `Baked count reset from ${n}\u00d7`,
    undo: 'Undo',
    undoLabel: (n) => `Undo, back to ${n}\u00d7`,
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
    resetLabel: (title) => `Backz\u00e4hler f\u00fcr ${title} zur\u00fccksetzen`,
    resetDone: (n) => `Backz\u00e4hler von ${n}\u00d7 zur\u00fcckgesetzt`,
    undo: 'R\u00fcckg\u00e4ngig',
    undoLabel: (n) => `R\u00fcckg\u00e4ngig, wieder ${n}\u00d7`,
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
    resetLabel: (title) => `Remettre \u00e0 z\u00e9ro le compteur de ${title}`,
    resetDone: (n) => `Compteur remis \u00e0 z\u00e9ro (\u00e9tait ${n}\u00d7)`,
    undo: 'Annuler',
    undoLabel: (n) => `Annuler, revenir \u00e0 ${n}\u00d7`,
  },
};

// Quiet "sign in to sync" entry on the Contents page (src/auth/SyncEntry.jsx).
export const syncText = {
  en: {
    signIn: 'Sign in to sync',
    signInHint: 'With Google: the same favorites and baked counts on every device',
    signingIn: 'Signing in\u2026',
    signOut: 'Sign out',
    signedInAs: (name) => `Signed in as ${name}`,
    synced: 'Synced',
    syncing: 'Syncing\u2026',
    offline: 'Offline',
    syncError: 'Not synced',
    signInError: 'Sign-in failed',
    signedOut: 'Signed out',
  },
  de: {
    signIn: 'Anmelden & abgleichen',
    signInHint: 'Mit Google: deine Favoriten und Backz\u00e4hler auf jedem Ger\u00e4t gleich',
    signingIn: 'Anmelden \u2026',
    signOut: 'Abmelden',
    signedInAs: (name) => `Angemeldet als ${name}`,
    synced: 'Abgeglichen',
    syncing: 'Abgleichen \u2026',
    offline: 'Offline',
    syncError: 'Nicht abgeglichen',
    signInError: 'Anmelden hat nicht geklappt',
    signedOut: 'Abgemeldet',
  },
  fr: {
    signIn: 'Se connecter pour synchroniser',
    signInHint: 'Avec Google\u00a0: les m\u00eames favoris et compteurs sur tous vos appareils',
    signingIn: 'Connexion\u2026',
    signOut: 'Se d\u00e9connecter',
    signedInAs: (name) => `Connect\u00e9 en tant que ${name}`,
    synced: 'Synchronis\u00e9',
    syncing: 'Synchronisation\u2026',
    offline: 'Hors ligne',
    syncError: 'Non synchronis\u00e9',
    signInError: '\u00c9chec de la connexion',
    signedOut: 'D\u00e9connect\u00e9',
  },
};

export const syncCopyFor = (lang) => syncText[lang] || syncText.en;

export const favCopyFor = (lang) => favText[lang] || favText.en;

// Collapsed "who's baking?" switcher line (src/ProfileSwitch.jsx). The rest of
// its copy only loads with the panel (src/profile-i18n.js).
export const whoText = {
  en: { ask: 'Who\u2019s baking?', me: 'Me' },
  de: { ask: 'Wer backt?', me: 'Ich' },
  fr: { ask: 'Qui cuisine\u00a0?', me: 'Moi' },
};

// Quiet "send feedback" / "suggest a recipe" entries under the sync entry
// (src/auth/FeedbackEntry.jsx). The sheet's copy loads with the sheet
// (src/auth/feedback-i18n.js).
export const noteText = {
  en: { feedback: 'Send feedback', suggest: 'Suggest a recipe' },
  de: { feedback: 'Feedback geben', suggest: 'Rezept vorschlagen' },
  fr: { feedback: 'Donner mon avis', suggest: 'Proposer une recette' },
};
