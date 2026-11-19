// Every recipe comes from content/recipes/*.json and its sheet from
// content/pdfs/<slug>.pdf. Drop both in and rebuild: nothing here changes.
// vite.config.js validates, slims, numbers, and splits translations by language
// so initial load only downloads the active language.

import baseRecipes from 'virtual:recipes-base';

const LANG_LOADERS = {
  en: () => import('virtual:recipes-lang/en'),
  de: () => import('virtual:recipes-lang/de'),
  fr: () => import('virtual:recipes-lang/fr'),
};

function resolvePhoto(photo) {
  if (!photo?.path) return null;
  const base = `${import.meta.env.BASE_URL}${photo.path}`;
  return { small: `${base}-400.webp`, large: `${base}-800.webp`, credit: photo.credit };
}

export const recipes = baseRecipes.map((r) => ({
  ...r,
  photo: resolvePhoto(r.photo),
}));

const loadedLangs = new Set();
const pendingLangs = new Map();

export const hasRecipeLang = (lang) => loadedLangs.has(lang);

export function ensureRecipeLang(lang) {
  const target = LANG_LOADERS[lang] ? lang : 'en';
  if (loadedLangs.has(target)) return Promise.resolve();
  if (!pendingLangs.has(target)) {
    const p = LANG_LOADERS[target]()
      .then(({ default: blocks }) => {
        for (const r of recipes) {
          if (blocks[r.slug]) r[target] = blocks[r.slug];
        }
        loadedLangs.add(target);
      })
      .finally(() => pendingLangs.delete(target));
    pendingLangs.set(target, p);
  }
  return pendingLangs.get(target);
}

function detectInitialLang() {
  try {
    const saved = localStorage.getItem('recipe-book:lang');
    if (saved && LANG_LOADERS[saved]) return saved;
  } catch {
    /* storage blocked: fall through */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language || '' : '').toLowerCase();
  if (nav.startsWith('de')) return 'de';
  if (nav.startsWith('fr')) return 'fr';
  return 'en';
}

await ensureRecipeLang(detectInitialLang());

// Pure selectors are also exercised directly by the Node translation tests.
export { textFor, amountsCreditFor } from './recipe-i18n.js';
