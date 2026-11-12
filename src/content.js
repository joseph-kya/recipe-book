// Every recipe comes from content/recipes/*.json and its sheet from
// content/pdfs/<slug>.pdf. Drop both in and rebuild: nothing here changes.

const recipeFiles = import.meta.glob('/content/recipes/*.json', {
  eager: true,
  import: 'default',
});

const pdfFiles = import.meta.glob('/content/pdfs/*.pdf', {
  eager: true,
  query: '?url',
  import: 'default',
});

function pdfFor(slug) {
  return pdfFiles[`/content/pdfs/${slug}.pdf`] ?? null;
}

export const recipes = Object.values(recipeFiles)
  .map((r) => ({
    ...r,
    // Short route from the optional "route" field, else the slug itself.
    route: r.route || r.slug,
    pdf: pdfFor(r.slug),
  }))
  .sort((a, b) => a.number - b.number);

export const pad = (n) => String(n).padStart(2, '0');

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
