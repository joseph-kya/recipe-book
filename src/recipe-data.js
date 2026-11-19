// Pure recipe loading, validation, slimming, and language splitting.
// Shared by vite.config.js (build/dev) and scripts/content.test.mjs (Node tests).

export const RECIPE_LANGS = ['en', 'de', 'fr'];

const DEFAULT_HEADLINES = {
  en: { ingredients: 'Ingredients', method: 'Method' },
  de: { ingredients: 'Zutaten', method: 'Zubereitung' },
  fr: { ingredients: 'Ingrédients', method: 'Préparation' },
};

// Keep only the nutrition fields rendered by Macros.jsx (drops USDA ingredient breakdown).
export function slimNutrition(entry) {
  if (!entry?.per_serving) return null;
  const p = entry.per_serving;
  const out = {
    servings: entry.servings,
    serving_basis: entry.serving_basis || '',
    per_serving: {
      kcal: p.kcal,
      protein: p.protein,
      carbs: p.carbs,
      fat: p.fat,
    },
  };
  if (entry.total?.kcal != null) out.total = { kcal: entry.total.kcal };
  return out;
}

// Keep all recipe content intact while dropping PDF-only fields and empty nulls,
// and filling safe defaults so a minimal recipe JSON renders without crashing.
export function slimLangBlock(block, lang = 'en') {
  if (!block || typeof block !== 'object') return undefined;
  const defaults = DEFAULT_HEADLINES[lang] || DEFAULT_HEADLINES.en;
  const out = {
    title: block.title,
    title_lines: Array.isArray(block.title_lines) && block.title_lines.length ? block.title_lines : [block.title],
    stats: Array.isArray(block.stats) ? block.stats : [],
    ingredients_headline: block.ingredients_headline || defaults.ingredients,
    groups: block.groups.map((g) => ({
      ...(g.title ? { title: g.title } : {}),
      items: g.items.map((it) => {
        const item = { amount: it.amount ?? '', name: it.name };
        if (it.metric) item.metric = it.metric;
        if (it.note) item.note = it.note;
        return item;
      }),
    })),
    method_headline: block.method_headline || defaults.method,
    steps: block.steps.map((s) => {
      const step = { title: s.title, text: s.text };
      if (s.cue) step.cue = s.cue;
      return step;
    }),
  };
  if (block.tagline) out.tagline = block.tagline;
  if (block.intro) out.intro = block.intro;
  if (block.equipment) out.equipment = block.equipment;
  if (Array.isArray(block.tips) && block.tips.length) out.tips = block.tips;
  if (block.conversions) out.conversions = block.conversions;
  return out;
}

export function slugFromFile(fileName) {
  return String(fileName).replace(/^.*[/\\]/, '').replace(/\.json$/i, '');
}

export function validateRecipe(raw, fileName = '<recipe>') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${fileName}: recipe JSON must be an object`);
  }
  const slug = raw.slug || slugFromFile(fileName);
  if (!slug) throw new Error(`${fileName}: missing recipe slug`);
  const en = raw.en;
  if (!en || typeof en !== 'object') {
    throw new Error(`${fileName}: missing required "en" recipe block`);
  }
  if (typeof en.title !== 'string' || !en.title.trim()) {
    throw new Error(`${fileName}: missing required "en.title"`);
  }
  if (!Array.isArray(en.groups) || en.groups.length === 0) {
    throw new Error(`${fileName}: "en.groups" must be a non-empty array`);
  }
  if (!Array.isArray(en.steps) || en.steps.length === 0) {
    throw new Error(`${fileName}: "en.steps" must be a non-empty array`);
  }
  return slug;
}

export function normalizePhoto(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return { path: entry, credit: null };
  const path = entry.photo || entry.path;
  if (!path) return null;
  return { path, credit: entry.credit ?? null };
}

export function normalizeRecipe(raw, { fileName = '', pdf = null, gramsPdf = null, photo = null, nutrition = null, offered = [1] } = {}) {
  const slug = validateRecipe(raw, fileName || raw?.slug || '<recipe>');
  const recipe = {
    slug,
    route: raw.route || slug,
    number: Number.isFinite(raw.number) ? raw.number : Infinity,
    source: raw.source
      ? { author: '', site: '', url: '', ...raw.source }
      : { author: '', site: '', url: '' },
    pdf,
    gramsPdf,
    photo: normalizePhoto(raw.photo ?? photo),
    nutrition: slimNutrition(raw.nutrition ?? nutrition),
    offered,
  };
  if (raw.amounts_credit) recipe.amounts_credit = raw.amounts_credit;
  else if (raw.conversions) recipe.conversions = raw.conversions;

  for (const lang of RECIPE_LANGS) {
    if (raw[lang]) recipe[lang] = slimLangBlock(raw[lang], lang);
  }
  return recipe;
}

export function sortAndNumberRecipes(list) {
  const slugs = new Set();
  const routes = new Set();
  for (const r of list) {
    if (slugs.has(r.slug)) throw new Error(`Duplicate recipe slug: "${r.slug}"`);
    if (routes.has(r.route)) throw new Error(`Duplicate recipe route: "${r.route}"`);
    slugs.add(r.slug);
    routes.add(r.route);
  }
  return [...list]
    .sort((a, b) => a.number - b.number || a.slug.localeCompare(b.slug))
    .map(({ number: _ignored, ...rest }, i) => ({ ...rest, no: i + 1 }));
}

// Separate per-language text blocks so the initial bundle only loads the active
// language. If a recipe is missing any translation, keep its `en` block on base
// so textFor(recipe, lang) falls back synchronously without an extra chunk fetch.
export function splitRecipesByLang(recipes) {
  const byLang = Object.fromEntries(RECIPE_LANGS.map((l) => [l, {}]));
  const base = recipes.map((recipe) => {
    const rest = { ...recipe };
    const missingAny = RECIPE_LANGS.some((l) => l !== 'en' && !recipe[l]);
    for (const lang of RECIPE_LANGS) {
      if (!recipe[lang]) continue;
      if (lang === 'en' && missingAny) continue; // keep en on base for sync fallback
      byLang[lang][recipe.slug] = recipe[lang];
      delete rest[lang];
    }
    return rest;
  });
  return { base, byLang };
}
