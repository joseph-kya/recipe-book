// Recipe text in the asked language, only when the JSON really has it.
export function textFor(recipe, lang) {
  if (lang !== 'en' && recipe[lang]) return { text: recipe[lang], lang, fallback: false };
  return { text: recipe.en, lang: 'en', fallback: lang !== 'en' };
}

export function amountsCreditFor(recipe, lang) {
  const c = recipe.amounts_credit;
  if (!c) return null;
  if (c[lang]) return { ...c[lang], lang };
  return c.en ? { ...c.en, lang: 'en' } : null;
}
