// Random recipe picker and EN/DE/FR copy for the cover's "Surprise me" control.
// Kept pure and self-contained so it can be unit-tested directly under Node.

export const LAST_RANDOM_KEY = 'recipe-book:last-random';

export const randomText = {
  en: {
    label: 'Surprise me',
    ariaLabel: 'Surprise me — open a random recipe',
    opening: (title) => `Opening ${title}`,
  },
  de: {
    label: 'Überrasch mich',
    ariaLabel: 'Überrasch mich — zufälliges Rezept öffnen',
    opening: (title) => `Öffne ${title}`,
  },
  fr: {
    label: 'Surprenez-moi',
    ariaLabel: 'Surprenez-moi — ouvrir une recette au hasard',
    opening: (title) => `Ouverture : ${title}`,
  },
};

export const randomCopyFor = (lang) => randomText[lang] || randomText.en;

let memoryLastSlug = null;

function defaultStorage() {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
}

export function getLastRandomSlug(storage = defaultStorage()) {
  try {
    const saved = storage?.getItem?.(LAST_RANDOM_KEY);
    if (typeof saved === 'string' && saved.trim()) {
      memoryLastSlug = saved;
      return saved;
    }
  } catch {
    /* storage blocked: fall back to in-memory slug */
  }
  return memoryLastSlug;
}

export function setLastRandomSlug(slug, storage = defaultStorage()) {
  memoryLastSlug = typeof slug === 'string' && slug.trim() ? slug : null;
  try {
    if (memoryLastSlug) storage?.setItem?.(LAST_RANDOM_KEY, memoryLastSlug);
    else storage?.removeItem?.(LAST_RANDOM_KEY);
  } catch {
    /* storage blocked: memory holds the last pick for this visit */
  }
  return memoryLastSlug;
}

export function resetLastRandomSlug(storage = defaultStorage()) {
  return setLastRandomSlug(null, storage);
}

// Map a recipe's printed book number (1..6+) onto a standard 6-sided die face.
export function dieFaceForRecipe(recipe, fallback = 5) {
  const n = Number(recipe?.no);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return ((n - 1) % 6) + 1;
}

// Pick a random recipe from `list`, never repeating `lastSlug` when at least
// two distinct recipes exist.
export function pickRandomRecipe(list, lastSlug = null, rng = Math.random) {
  if (!Array.isArray(list) || list.length === 0) return null;
  if (list.length === 1) return list[0];
  const pool = list.filter((recipe) => recipe && recipe.slug !== lastSlug);
  const candidates = pool.length > 0 ? pool : list;
  const raw = Number(rng());
  const clamped = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 0.999999999999) : 0;
  return candidates[Math.floor(clamped * candidates.length)];
}

// Build short dice/shuffle preview steps that vary both face and recipe title
// before landing cleanly on `winner` and its die face.
export function buildShuffleFrames(list, winner, count = 3, rng = Math.random) {
  if (!Array.isArray(list) || list.length === 0 || !winner || count <= 0) return [];
  const winnerFace = dieFaceForRecipe(winner);
  const others = list.filter((recipe) => recipe && recipe.slug !== winner.slug);
  const recipePool = others.length > 0 ? others : list;
  const frames = [];
  let prevFace = 5;
  let prevSlug = null;

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const faceOptions = [1, 2, 3, 4, 5, 6].filter(
      (face) => face !== prevFace && (!isLast || face !== winnerFace),
    );
    const faceIdx = Math.floor(Math.min(Math.max(Number(rng()) || 0, 0), 0.999999999999) * faceOptions.length);
    const face = faceOptions[faceIdx];

    const nonRepeatRecipes = recipePool.filter((recipe) => recipe.slug !== prevSlug);
    const candidates = nonRepeatRecipes.length > 0 ? nonRepeatRecipes : recipePool;
    const recipeIdx = Math.floor(Math.min(Math.max(Number(rng()) || 0, 0), 0.999999999999) * candidates.length);
    const recipe = candidates[recipeIdx];

    frames.push({ recipe, face });
    prevFace = face;
    prevSlug = recipe.slug;
  }

  return frames;
}
