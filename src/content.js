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

// Photos of the finished bake, from each recipe's source page (content/photos.json).
// Paths resolve against the site base, so they work under /recipe-book/ too.
import photoIndex from '../content/photos.json';
import nutritionIndex from '../content/nutrition.json';

function photoFor(slug) {
  const p = photoIndex[slug];
  if (!p?.photo) return null;
  const base = `${import.meta.env.BASE_URL}${p.photo}`;
  return { small: `${base}-400.webp`, large: `${base}-800.webp`, credit: p.credit };
}

function pdfFor(slug) {
  return pdfFiles[`/content/pdfs/${slug}.pdf`] ?? null;
}

export const recipes = Object.values(recipeFiles)
  .map((r) => ({
    ...r,
    // Short route from the optional "route" field, else the slug itself.
    route: r.route || r.slug,
    pdf: pdfFor(r.slug),
    photo: photoFor(r.slug),
    nutrition: nutritionIndex.recipes[r.slug] ?? null,
    photoCredit: photoFor(r.slug)?.credit ?? null,
    gramsPdf: pdfFor(`${r.slug}.grams`),
  }))
  .sort((a, b) => a.number - b.number)
  // The number shown is the position in the book (1, 2, 3…), so a recipe removed
  // at the source never leaves a gap. The JSON `number` only sets the order.
  .map((r, i) => ({ ...r, no: i + 1 }));

// Pure selectors are also exercised directly by the Node translation tests.
export { textFor, amountsCreditFor } from './recipe-i18n.js';
