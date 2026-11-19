import { textFor } from './recipe-i18n.js';

export const contentsText = {
  en: {
    findPlaceholder: 'Find a recipe…',
    findLabel: 'Find a recipe by name, ingredient, or time',
    clearFind: 'Clear search',
    recipeCount: (n) => (n === 1 ? '1 recipe' : `${n} recipes`),
    matchCount: (n, total) => (n === 1 ? `1 of ${total} recipes` : `${n} of ${total} recipes`),
    empty: (q) => `No recipes match “${q}”.`,
    reset: 'Show all',
  },
  de: {
    findPlaceholder: 'Rezept suchen…',
    findLabel: 'Rezept nach Name, Zutat oder Zeit suchen',
    clearFind: 'Suche löschen',
    recipeCount: (n) => (n === 1 ? '1 Rezept' : `${n} Rezepte`),
    matchCount: (n, total) => (n === 1 ? `1 von ${total} Rezepten` : `${n} von ${total} Rezepten`),
    empty: (q) => `Keine Rezepte für „${q}“.`,
    reset: 'Alle zeigen',
  },
  fr: {
    findPlaceholder: 'Chercher une recette…',
    findLabel: 'Chercher une recette par nom, ingrédient ou temps',
    clearFind: 'Effacer la recherche',
    recipeCount: (n) => (n === 1 ? '1 recette' : `${n} recettes`),
    matchCount: (n, total) => (n === 1 ? `1 sur ${total} recettes` : `${n} sur ${total} recettes`),
    empty: (q) => `Aucune recette pour « ${q} ».`,
    reset: 'Tout afficher',
  },
};

export function normalizeQuery(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function filterRecipes(recipeList, lang, rawQuery) {
  const normalized = normalizeQuery(rawQuery);
  const tokens = normalized ? normalized.split(/\s+/) : [];

  const results = [];
  for (const recipe of recipeList) {
    const { text, lang: textLang } = textFor(recipe, lang);
    if (!tokens.length) {
      results.push({ recipe, text, textLang, matchCue: null });
      continue;
    }

    const titleNorm = normalizeQuery(`${recipe.no} ${text.title}`);
    const ingredients = (text.groups || []).flatMap((g) => (g.items || []).map((item) => item.name)).filter(Boolean);
    const stats = (text.stats || []).map((s) => `${s.value} ${s.label}`.trim()).filter(Boolean);
    const enTitle = recipe.en?.title || '';
    const haystack = normalizeQuery([recipe.no, text.title, enTitle, text.tagline || '', ...ingredients, ...stats].join(' '));

    if (!tokens.every((tok) => haystack.includes(tok))) continue;

    let matchCue = null;
    if (!tokens.every((tok) => titleNorm.includes(tok))) {
      const nonTitleTokens = tokens.filter((tok) => !titleNorm.includes(tok));
      const matchedIngredient =
        ingredients.find((name) => {
          const norm = normalizeQuery(name);
          return nonTitleTokens.every((tok) => norm.includes(tok));
        }) ||
        ingredients.find((name) => {
          const norm = normalizeQuery(name);
          return nonTitleTokens.some((tok) => norm.includes(tok));
        });

      if (matchedIngredient) {
        matchCue = matchedIngredient;
      } else {
        const matchedStat = stats.find((stat) => {
          const norm = normalizeQuery(stat);
          return nonTitleTokens.some((tok) => norm.includes(tok));
        });
        if (matchedStat) matchCue = matchedStat;
      }
    }

    results.push({ recipe, text, textLang, matchCue });
  }

  return results;
}
