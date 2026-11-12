// Portion scaling: display-only maths on the amounts already in the JSON.
// Pure functions, no DOM: scripts/scale.test.mjs runs them in node.
//
// Rules (factor 1 always returns the original text untouched):
// - Cups and spoons ("1 cup + 1½ tsp", "¼ Tasse + 1 EL + 2 TL") are summed in
//   teaspoons (1 tbsp = 3 tsp, 1 cup = 16 tbsp = 48 tsp), scaled, then written
//   back as the largest friendly cup (¼ ⅓ ½ ⅔ ¾ and wholes), whole tablespoons
//   and teaspoons to the nearest ¼. Under ¼ cup it is spoons only; ⅛ tsp and
//   less is "1 pinch". The unit words follow the source text (cup/tbsp/tsp or
//   Tasse/EL/TL), not the page language.
// - A qualifier stays with its scaled number and is not normalised:
//   "1 heaped cup", "scant ½ cup", "~1½ cups" (nearest ¼).
// - A parenthetical is scaled too, in its own unit: "½ cup (8 tbsp)" → "1 cup (16 tbsp)".
// - Grams and ml: whole units under 100 (never below 1), else nearest 5.
//   Ranges scale both ends ("10–20 ml" → "20–40 ml").
// - Ounces to the nearest ½.
// - Countables ("4", "1 large", "½", "4 (size M)", stat values like "24")
//   scale to wholes or halves, never below ½.
// - Pinches count: "1 pinch" → "2 pinches" (at least 1); "pinch + ¼ tsp" keeps
//   its pinch and scales the spoon part.
// - Anything else ("to taste", "as needed", "a splash", "to dust", "optional",
//   time and kcal stats) stays as written.
// Which factors a recipe offers at all is decided further down (feasible,
// offeredFactors): only those at which every amount can really be measured.

const VULGAR = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };
const NUM = String.raw`(?:\d+(?:[.,]\d+)?)?[¼½¾⅓⅔⅛]?`;


export function parseNumber(text) {
  const m = String(text).trim().match(/^(\d+(?:[.,]\d+)?)?([¼½¾⅓⅔⅛])?$/);
  if (!m || (!m[1] && !m[2])) return null;
  return (m[1] ? parseFloat(m[1].replace(',', '.')) : 0) + (m[2] ? VULGAR[m[2]] : 0);
}

// Whole part plus the nearest fraction from `fractions` (null if none is close).
function fraction(x, fractions) {
  const whole = Math.floor(x + 1e-9);
  const rest = x - whole;
  let best = { sym: '', v: 0 };
  for (const [sym, v] of [['', 0], ...fractions, ['', 1]]) {
    if (Math.abs(rest - v) < Math.abs(rest - best.v)) best = { sym, v };
  }
  if (best.v === 1) return { whole: whole + 1, sym: '' };
  return { whole, sym: best.sym };
}

const FRIENDLY = [['¼', 0.25], ['⅓', 1 / 3], ['½', 0.5], ['⅔', 2 / 3], ['¾', 0.75]];
const QUARTERS = [['¼', 0.25], ['½', 0.5], ['¾', 0.75]];
const HALVES = [['½', 0.5]];

export function formatNumber(x, fractions = FRIENDLY) {
  const { whole, sym } = fraction(x, fractions);
  if (!whole && !sym) return '0';
  return `${whole || ''}${sym}`;
}

const SPOONS = {
  en: { cup: ['cup', 'cups'], tbsp: ['tbsp', 'tbsp'], tsp: ['tsp', 'tsp'], pinch: ['pinch', 'pinches'] },
  de: { cup: ['Tasse', 'Tassen'], tbsp: ['EL', 'EL'], tsp: ['TL', 'TL'], pinch: ['Prise', 'Prisen'] },
};
const UNIT_OF = {
  cup: ['en', 'cup'], cups: ['en', 'cup'], tbsp: ['en', 'tbsp'], tsp: ['en', 'tsp'],
  Tasse: ['de', 'cup'], Tassen: ['de', 'cup'], EL: ['de', 'tbsp'], TL: ['de', 'tsp'],
};
const TSP = { cup: 48, tbsp: 3, tsp: 1 };

const word = (lang, unit, n) => SPOONS[lang][unit][n > 1 ? 1 : 0];

// "1 cup + 1½ tsp" → total teaspoons, or null if any term is not a plain spoon term.
function parseSpoons(text) {
  let total = 0;
  let lang = null;
  for (const term of text.split(' + ')) {
    const m = term.trim().match(new RegExp(`^(${NUM}) (cups?|tbsp|tsp|Tassen?|EL|TL)$`));
    if (!m) return null;
    const n = parseNumber(m[1]);
    if (n === null) return null;
    const [l, unit] = UNIT_OF[m[2]];
    if (lang && lang !== l) return null;
    lang = l;
    total += n * TSP[unit];
  }
  return { total, lang };
}

// cups (a friendly value, or 0) + whole tbsp + tsp to the nearest ¼, as parts
function spoonParts(tsp, cups, lang) {
  const parts = cups ? [`${formatNumber(cups)} ${word(lang, 'cup', cups)}`] : [];
  let rest = Math.round((tsp - cups * 48) * 4) / 4;
  const tbsp = Math.floor(rest / 3 + 1e-9);
  rest -= tbsp * 3;
  if (tbsp) parts.push(`${tbsp} ${word(lang, 'tbsp', tbsp)}`);
  if (rest > 1e-9) parts.push(`${formatNumber(rest, QUARTERS)} ${word(lang, 'tsp', rest)}`);
  return parts;
}

// Teaspoons → the most readable cups + tbsp + tsp: of every friendly cup size
// that fits (and spoons only, up to ½ cup), the one with the fewest parts wins,
// the larger cup on a tie. "6 tbsp" beats "⅓ cup + 2 tsp"; "2¼ cups + 3 tbsp"
// beats "2⅓ cups + 1 tbsp + 2 tsp".
export function formatSpoons(tsp, lang) {
  // ⅛ tsp and less is a pinch
  if (tsp < 0.2) return `1 ${word(lang, 'pinch', 1)}`;
  const options = [];
  if (tsp <= 24 + 1e-6) options.push(0);
  for (let w = 0; w <= Math.floor(tsp / 48); w++) {
    for (const f of [0, 0.25, 1 / 3, 0.5, 2 / 3, 0.75]) {
      const c = w + f;
      // beside a cup amount, the spoons left over stay under ¼ cup (no "3⅔ cups + 8 tbsp")
      if (c > 0 && c * 48 <= tsp + 1e-6 && tsp - c * 48 < 12 - 1e-6) options.push(c);
    }
  }
  let best = null;
  for (const c of options) {
    const parts = spoonParts(tsp, c, lang);
    if (!parts.length) continue;
    if (!best || parts.length < best.parts.length || (parts.length === best.parts.length && c > best.c)) {
      best = { c, parts };
    }
  }
  return best.parts.join(' + ');
}

// Grams and millilitres: whole units under 100 (at least 1), else nearest 5.
export function roundMetric(x) {
  if (x < 100) return Math.max(1, Math.round(x));
  return Math.round(x / 5) * 5;
}

const decimal = (x, lang) => (lang === 'de' ? String(x).replace('.', ',') : String(x));

// Countables scale to wholes or halves, never below ½.
const countable = (x) => Math.max(0.5, Math.round(x * 2) / 2);

// Custom amounts (scaled exactly as entered, no feasibility filter) round
// honestly instead: countables to one decimal (0.6 egg), spoons to the nearest
// ¼ with anything under ¼ tsp a pinch, grams and ml to whole units.
export const CUSTOM_MIN = 0.1;
export const CUSTOM_MAX = 10;
export const clampFactor = (f) => Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, f));
const oneDecimal = (x, lang) => {
  const v = Math.max(0.1, Math.round(x * 10) / 10);
  return decimal(Number.isInteger(v) ? v : v.toFixed(1), lang);
};

// Teaspoon total of a plain spoon sum, or null (exported for the tests).
export const spoonTotal = (text) => parseSpoons(String(text).trim())?.total ?? null;

// "8 tbsp" → "16 tbsp": one spoon term kept in its own unit (used inside parentheses).
function scaleSameUnit(text, factor) {
  const m = String(text).match(new RegExp(`^(${NUM}) (cups?|tbsp|tsp|Tassen?|EL|TL)$`));
  if (!m) return null;
  const n = parseNumber(m[1]) * factor;
  const [l, unit] = UNIT_OF[m[2]];
  return `${formatNumber(n, unit === 'cup' ? FRIENDLY : QUARTERS)} ${word(l, unit, n)}`;
}

export function scaleAmount(text, factor, lang = 'en', custom = false) {
  if (factor === 1 || text == null) return text;
  const s = String(text).trim();
  if (!s) return text;

  // ½ cup (8 tbsp): both halves, each in its own unit
  const paren = s.match(/^(.+?) \((.+)\)$/);
  if (paren) {
    const outer = scaleAmount(paren[1], factor, lang, custom);
    if (outer === paren[1]) return text;
    const inner = scaleSameUnit(paren[2], factor) ?? scaleAmount(paren[2], factor, lang, custom);
    // "2 tbsp (2 tbsp)" says nothing twice
    return inner === outer ? outer : `${outer} (${inner})`;
  }

  // plain spoon sums
  const spoons = parseSpoons(s);
  if (spoons) {
    const tsp = spoons.total * factor;
    if (custom && tsp < 0.25) return `1 ${word(spoons.lang, 'pinch', 1)}`;
    return formatSpoons(tsp, spoons.lang);
  }

  // pinch + ¼ tsp: keep the pinch, scale the spoons
  const pinchPlus = s.match(/^(pinch|Prise) \+ (.+)$/);
  if (pinchPlus) {
    const rest = parseSpoons(pinchPlus[2]);
    if (rest) {
      const scaled = rest.total * factor;
      const lang2 = rest.lang;
      // the spoon part shrank to a pinch itself: two pinches
      if (scaled < (custom ? 0.25 : 0.2)) return `2 ${word(lang2, 'pinch', 2)}`;
      return `${pinchPlus[1]} + ${formatSpoons(scaled, lang2)}`;
    }
  }

  // 1 pinch, 2 Prisen
  const pinch = s.match(/^(\d+) (pinch(?:es)?|Prisen?)$/);
  if (pinch) {
    const n = Math.max(1, Math.round(parseNumber(pinch[1]) * factor));
    const lang2 = /^P/.test(pinch[2]) ? 'de' : 'en';
    return `${n} ${word(lang2, 'pinch', n)}`;
  }

  // qualified cups: "1 heaped cup", "scant ½ cup", "~1½ cups"
  const qual = s.match(new RegExp(`^(~|scant |knapp )?(${NUM})( heaped| gehäufte?)? (cups?|Tassen?)$`));
  if (qual && (qual[1] || qual[3])) {
    const n = parseNumber(qual[2]) * factor;
    const [l] = UNIT_OF[qual[4]];
    return `${qual[1] || ''}${formatNumber(n, QUARTERS)}${qual[3] || ''} ${word(l, 'cup', n)}`;
  }

  // grams, millilitres and ranges of them: "175 g", "10–20 ml", "1.5 g"
  const metric = s.match(/^(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))? (g|ml|kg|l)$/);
  if (metric) {
    const a = decimal(roundMetric(parseNumber(metric[1]) * factor), lang);
    if (!metric[2]) return `${a} ${metric[3]}`;
    const b = decimal(roundMetric(parseNumber(metric[2]) * factor), lang);
    return `${a}–${b} ${metric[3]}`;
  }

  // ounces
  const oz = s.match(new RegExp(`^(${NUM}) oz$`));
  if (oz) return `${formatNumber(Math.max(0.5, Math.round(parseNumber(oz[1]) * factor * 2) / 2), HALVES)} oz`;

  // countables: "4", "½", "1 large", "4 (size M)" (the parenthetical is caught above)
  const count = s.match(new RegExp(`^(${NUM})( large| small| medium| groß| klein)?$`));
  if (count) {
    const n = parseNumber(count[1]);
    if (n !== null) {
      const shown = custom ? oneDecimal(n * factor, lang) : formatNumber(countable(n * factor), HALVES);
      return `${shown}${count[2] || ''}`;
    }
  }

  return text;
}

// A yield stat ("24" squares, "1" portion): only a plain number scales.
export function scaleStat(value, factor, custom = false, lang = 'en') {
  if (factor === 1 || !/^\d+$/.test(String(value).trim())) return value;
  return custom ? oneDecimal(Number(value) * factor, lang) : formatNumber(countable(Number(value) * factor), HALVES);
}

export const factorLabel = (f) => `${formatNumber(f)}×`;

/* ---------- Feasibility: only offer factors a kitchen can actually measure ----------
   An amount is feasible at a factor when it can be measured without fuss:
   - countables (eggs, "1 large", "½" lemon) land on whole numbers;
   - grams and ml round to whole units of at least 1 (5 g steps from 100),
     drifting no more than 5% from the exact value;
   - cups, tbsp and tsp land on quarter steps (¼ cup, ¼ tbsp, ¼ tsp smallest),
     within 5%, and never shrink to a pinch;
   - words ("to taste", "a splash", a pinch already in the JSON) and anything
     unparsed are always fine. */

export const CANDIDATES = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];
const TOLERANCE = 0.05;
const near = (got, exact) => exact > 0 && Math.abs(got - exact) / exact <= TOLERANCE;
const isWhole = (x) => Math.abs(x - Math.round(x)) < 1e-6 && Math.round(x) >= 1;
const quarterStep = (x) => x >= 0.25 - 1e-9 && near(Math.round(x * 4) / 4, x);

function spoonsFeasible(tsp) {
  if (tsp < 0.25 - 1e-9) return false; // would be a pinch
  const shown = spoonTotal(formatSpoons(tsp, 'en'));
  return shown !== null && near(shown, tsp);
}

export function feasible(text, factor) {
  if (factor === 1 || text == null) return true;
  const s = String(text).trim();
  if (!s) return true;

  const paren = s.match(/^(.+?) \((.+)\)$/);
  if (paren) {
    const inner = paren[2].match(new RegExp(`^(${NUM}) (cups?|tbsp|tsp|Tassen?|EL|TL)$`));
    const innerOk = inner ? quarterStep(parseNumber(inner[1]) * factor) : feasible(paren[2], factor);
    return feasible(paren[1], factor) && innerOk;
  }

  const spoons = parseSpoons(s);
  if (spoons) return spoonsFeasible(spoons.total * factor);

  const pinchPlus = s.match(/^(pinch|Prise) \+ (.+)$/);
  if (pinchPlus) {
    const rest = parseSpoons(pinchPlus[2]);
    return rest ? spoonsFeasible(rest.total * factor) : true;
  }

  if (/^\d+ (pinch(?:es)?|Prisen?)$/.test(s)) return true;

  const qual = s.match(new RegExp(`^(~|scant |knapp )?(${NUM})( heaped| gehäufte?)? (cups?|Tassen?)$`));
  if (qual && (qual[1] || qual[3])) return quarterStep(parseNumber(qual[2]) * factor);

  const metric = s.match(/^(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))? (g|ml|kg|l)$/);
  if (metric) {
    return [metric[1], metric[2]].filter(Boolean).every((v) => {
      const exact = parseNumber(v) * factor;
      return exact >= 1 - 1e-9 && near(roundMetric(exact), exact);
    });
  }

  const oz = s.match(new RegExp(`^(${NUM}) oz$`));
  if (oz) return quarterStep(parseNumber(oz[1]) * factor);

  const count = s.match(new RegExp(`^(${NUM})( large| small| medium| groß| klein)?$`));
  if (count && parseNumber(count[1]) !== null) return isWhole(parseNumber(count[1]) * factor);

  return true;
}

// The recipe's yield stat, when its value is a plain number ("24" squares).
export function yieldStat(text) {
  return text.stats.find((s) => /^\d+$/.test(String(s.value).trim())) || null;
}

// Every factor at which every amount (cups and metric) in every language the
// recipe is written in can be measured, and the yield stays whole. 1× always.
export function feasibleFactors(recipe) {
  const texts = ['en', 'de'].filter((l) => recipe[l]).map((l) => recipe[l]);
  return CANDIDATES.filter((f) => {
    if (f === 1) return true;
    return texts.every((t) => {
      const y = yieldStat(t);
      if (y && !isWhole(Number(y.value) * f)) return false;
      return t.groups.every((g) => g.items.every((it) => feasible(it.amount, f) && feasible(it.metric, f)));
    });
  });
}

// At most 5 chips: 1×, the most useful smaller one (nearest ½×), and up to
// three larger ones in order of usefulness (2×, 3×, 1½×, 4×, 2½×, 1¼×).
export function offeredFactors(recipe) {
  const ok = feasibleFactors(recipe);
  const below = ok.filter((f) => f < 1).sort((a, b) => Math.abs(a - 0.5) - Math.abs(b - 0.5)).slice(0, 1);
  const above = [2, 3, 1.5, 4, 2.5, 1.25].filter((f) => ok.includes(f)).slice(0, 3);
  return [...below, 1, ...above].sort((a, b) => a - b);
}
