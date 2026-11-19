// UI chrome for step-to-ingredient linking and mise en place mode (EN, Austrian DE, FR).
// Modular alongside src/recipe-reading-i18n.js and src/share-i18n.js.

export const cookPrepText = {
  en: {
    miseLabel: 'Mise en place',
    miseToggle: (on) =>
      on
        ? 'Exit mise en place mode'
        : 'Mise en place — check off ingredients as you set them out',
    miseClear: 'Clear mise en place ticks',
    miseReady: 'All set!',
    miseProgress: (done, total) =>
      done === total && total > 0
        ? 'All ingredients set out.'
        : `${done} of ${total} ingredients set out`,
    stepLinkLabel: (stepNum, count, active) =>
      active
        ? `Step ${stepNum}: hide ${count} highlighted ingredient${count === 1 ? '' : 's'}`
        : `Step ${stepNum}: highlight ${count} ingredient${count === 1 ? '' : 's'}`,
    stepBadge: (stepNum) => `Step ${stepNum}`,
    stepClear: (stepNum) => `Clear step ${stepNum} highlight`,
    stepIngredients: (stepNum) => `Ingredients for step ${stepNum}`,
  },
  de: {
    miseLabel: 'Herrichten',
    miseToggle: (on) =>
      on
        ? 'Herrichten-Modus beenden'
        : 'Zutaten herrichten — beim Bereitstellen abhaken',
    miseClear: 'Vorbereitungs-Häkchen zurücksetzen',
    miseReady: 'Alles bereit!',
    miseProgress: (done, total) =>
      done === total && total > 0
        ? 'Alle Zutaten stehen bereit.'
        : `${done} von ${total} Zutaten hergerichtet`,
    stepLinkLabel: (stepNum, count, active) =>
      active
        ? `Schritt ${stepNum}: Hervorhebung für ${count} ${count === 1 ? 'Zutat' : 'Zutaten'} aufheben`
        : `Schritt ${stepNum}: ${count} ${count === 1 ? 'Zutat' : 'Zutaten'} hervorheben`,
    stepBadge: (stepNum) => `Schritt ${stepNum}`,
    stepClear: (stepNum) => `Hervorhebung für Schritt ${stepNum} aufheben`,
    stepIngredients: (stepNum) => `Zutaten für Schritt ${stepNum}`,
  },
  fr: {
    miseLabel: 'Mise en place',
    miseToggle: (on) =>
      on
        ? 'Quitter le mode mise en place'
        : 'Mise en place — cochez les ingrédients au fur et à mesure',
    miseClear: 'Décocher les ingrédients préparés',
    miseReady: 'Tout est prêt !',
    miseProgress: (done, total) =>
      done === total && total > 0
        ? 'Tous les ingrédients sont prêts.'
        : `${done} ingrédient${done > 1 ? 's' : ''} sur ${total} préparé${done > 1 ? 's' : ''}`,
    stepLinkLabel: (stepNum, count, active) =>
      active
        ? count === 1
          ? `Étape ${stepNum} : masquer l’ingrédient mis en évidence`
          : `Étape ${stepNum} : masquer les ${count} ingrédients mis en évidence`
        : `Étape ${stepNum} : mettre en évidence ${count} ingrédient${count > 1 ? 's' : ''}`,
    stepBadge: (stepNum) => `Étape ${stepNum}`,
    stepClear: (stepNum) => `Effacer la mise en évidence de l’étape ${stepNum}`,
    stepIngredients: (stepNum) => `Ingrédients pour l’étape ${stepNum}`,
  },
};

export const cookPrepCopyFor = (lang) => cookPrepText[lang] || cookPrepText.en;
