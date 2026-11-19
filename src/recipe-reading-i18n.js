// Reading-experience UI chrome for Ingredients and Method (EN, DE, FR).
// Separate from src/i18n.js to stay modular alongside src/theme-i18n.js.

export const readingText = {
  en: {
    glanceLabel: 'At a glance',
    totalTime: 'Total',
    effort: 'Effort',
    difficulty: {
      easy: 'Easy',
      medium: 'Medium',
      involved: 'Involved',
    },
    difficultyOf: (level, label) => `${label}, level ${level} of 3`,
    ingredientsProgress: (got, total) => `${got} of ${total} ingredients ready`,
    currentStep: 'Next step',
  },
  de: {
    glanceLabel: 'Auf einen Blick',
    totalTime: 'Gesamt',
    effort: 'Aufwand',
    difficulty: {
      easy: 'Einfach',
      medium: 'Mittel',
      involved: 'Aufwendig',
    },
    difficultyOf: (level, label) => `${label}, Stufe ${level} von 3`,
    ingredientsProgress: (got, total) => `${got} von ${total} Zutaten bereit`,
    currentStep: 'Nächster Schritt',
  },
  fr: {
    glanceLabel: 'En un coup d’œil',
    totalTime: 'Total',
    effort: 'Niveau',
    difficulty: {
      easy: 'Facile',
      medium: 'Moyen',
      involved: 'Élaboré',
    },
    difficultyOf: (level, label) => `${label}, niveau ${level} sur 3`,
    ingredientsProgress: (got, total) => `${got} sur ${total} ingrédients prêts`,
    currentStep: 'Étape suivante',
  },
};

export const readingCopyFor = (lang) => readingText[lang] || readingText.en;
