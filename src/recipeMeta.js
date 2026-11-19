// Pure, deterministic recipe reading metadata derived strictly from each
// recipe's existing JSON fields (stats, groups, steps). Never invents content.

const TIME_UNIT = /\b(?:hrs?|hours?|h|mins?|minutes?)\b/i;
const HOUR_UNIT = /^(?:hrs?|hours?|h)$/i;
const TOTAL_LABEL = /\btotal\b/i;

function parseNumber(raw) {
  return Number(String(raw).replace(',', '.'));
}

// Parses a single stat value like "30–40 min", "~20 min", "1–2 h + 30–60 min",
// "5 + 5 + 5 min", "2 hrs", or "~1 h 15 min" into { min, max, approx } in minutes.
// Returns null for non-time stats (yields, kcal, etc.).
export function parseStatTime(value) {
  if (typeof value !== 'string' || !TIME_UNIT.test(value)) return null;

  const approx = /~|≈|about|ca\.|env\./i.test(value);
  const terms = value.split('+').map((t) => t.trim()).filter(Boolean);
  if (!terms.length) return null;

  // Propagate a trailing unit backward so "5 + 5 + 5 min" or "10 + 45 min"
  // applies "min" to the bare leading numbers.
  let inheritedMult = null;
  let totalMin = 0;
  let totalMax = 0;
  let matchedAny = false;

  for (let i = terms.length - 1; i >= 0; i--) {
    const term = terms[i];
    const parts = [
      ...term.matchAll(
        /(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?\s*(hrs?|hours?|h|mins?|minutes?)\b/gi,
      ),
    ];

    if (parts.length > 0) {
      let termMin = 0;
      let termMax = 0;
      for (const match of parts) {
        const lo = parseNumber(match[1]);
        const hi = match[2] != null ? parseNumber(match[2]) : lo;
        const mult = HOUR_UNIT.test(match[3]) ? 60 : 1;
        termMin += lo * mult;
        termMax += hi * mult;
        inheritedMult = mult;
      }
      totalMin += termMin;
      totalMax += termMax;
      matchedAny = true;
      continue;
    }

    if (inheritedMult != null) {
      const bare = term.match(/(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?/);
      if (bare) {
        const lo = parseNumber(bare[1]);
        const hi = bare[2] != null ? parseNumber(bare[2]) : lo;
        totalMin += lo * inheritedMult;
        totalMax += hi * inheritedMult;
        matchedAny = true;
      }
    }
  }

  if (!matchedAny || totalMin <= 0) return null;
  return {
    min: Math.round(totalMin),
    max: Math.round(totalMax),
    approx,
  };
}

// Computes the total time in minutes from a recipe's canonical English stats.
// If a stat already declares the total time, uses it directly without double-counting.
export function computeTotalTime(recipe) {
  const source = recipe?.en || recipe?.de || recipe?.fr;
  const stats = source?.stats;
  if (!Array.isArray(stats) || !stats.length) return null;

  for (const stat of stats) {
    if (TOTAL_LABEL.test(stat?.label || '')) {
      const parsed = parseStatTime(stat.value);
      if (parsed) return parsed;
    }
  }

  let min = 0;
  let max = 0;
  let approx = false;
  let found = false;

  for (const stat of stats) {
    const parsed = parseStatTime(stat?.value);
    if (!parsed) continue;
    min += parsed.min;
    max += parsed.max;
    approx = approx || parsed.approx;
    found = true;
  }

  return found ? { min, max, approx } : null;
}

function formatSingleDuration(minutes, compact = false) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours} h`;
  if (compact) return `${hours} h ${String(rem).padStart(2, '0')}`;
  return `${hours} h ${rem} min`;
}

// Formats a { min, max, approx } minute range into a concise, locale-clean string
// using universal "h" and "min" units that match the recipe book's EN/DE/FR style.
export function formatTotalTime(range) {
  if (!range || !Number.isFinite(range.min) || range.min <= 0) return null;
  const prefix = range.approx ? '~' : '';
  const { min, max } = range;

  if (min === max) {
    return `${prefix}${formatSingleDuration(min, false)}`;
  }
  if (min < 60 && max <= 60) {
    return `${prefix}${min}–${max} min`;
  }
  if (min % 60 === 0 && max % 60 === 0) {
    return `${prefix}${min / 60}–${max / 60} h`;
  }
  return `${prefix}${formatSingleDuration(min, true)}–${formatSingleDuration(max, true)}`;
}

// Transparent, structural effort rating derived solely from the recipe's own
// ingredient count, step count, component groups, and total time.
// Returns { key: 'easy' | 'medium' | 'involved', level: 1 | 2 | 3 }.
export function computeDifficulty(recipe, totalTime = computeTotalTime(recipe)) {
  const source = recipe?.en || recipe?.de || recipe?.fr;
  const groups = source?.groups || [];
  const steps = source?.steps || [];
  const ingredientCount = groups.reduce((sum, g) => sum + (g.items?.length || 0), 0);

  let points = 0;
  if (ingredientCount >= 15) points += 2;
  else if (ingredientCount >= 11) points += 1;

  if (steps.length >= 8) points += 2;
  else if (steps.length >= 6) points += 1;

  if (groups.length >= 3) points += 1;
  if (totalTime && totalTime.min >= 90) points += 1;

  if (points >= 4) return { key: 'involved', level: 3 };
  if (points >= 2) return { key: 'medium', level: 2 };
  return { key: 'easy', level: 1 };
}

export function recipeSummary(recipe) {
  const totalTime = computeTotalTime(recipe);
  const difficulty = computeDifficulty(recipe, totalTime);
  return {
    totalTime,
    totalTimeLabel: formatTotalTime(totalTime),
    difficulty,
  };
}
