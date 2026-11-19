import { useSyncExternalStore } from 'react';

/* ---------- Step ↔ Ingredient Matching (no invented content) ---------- */

// Culinary modifiers/stop words stripped when deriving core ingredient nouns.
// Kept conservative so distinguishing modifiers (icing, powdered, glace, blanc,
// frais, sour, baking, cream, brown) remain intact.
const MODIFIERS = new Set([
  // EN
  'a', 'an', 'and', 'all', 'purpose', 'bread', 'couverture', 'dark', 'dry',
  'durum', 'extract', 'fat', 'fine', 'full', 'granulated', 'grated', 'ground',
  'instant', 'liquid', 'low', 'mixed', 'of', 'or', 'organic', 'plain', 'powder',
  'pure', 'reduced', 'softened', 'table', 'the', 'unbleached', 'unsalted',
  'unsweetened', 'wheat', 'white',
  // DE
  'abgeriebene', 'abgeriebener', 'abgeriebenes', 'backstarkes', 'bio', 'der',
  'die', 'das', 'dunkelbrauner', 'dunkelbraune', 'extrakt', 'fein', 'feines',
  'fettreduzierter', 'fettreduzierte', 'fluessiges', 'flüssiges', 'frisch',
  'gemahlen', 'gemahlener', 'gemahlene', 'gemischte', 'gemischter', 'instant',
  'oder', 'pulver', 'reiner', 'reine', 'ungebleichtes', 'ungesalzene',
  'ungesalzen', 'ungesuesst', 'ungesüßt', 'ungesüßter', 'weich', 'weiche',
  // FR
  'a', 'à', 'allege', 'allégé', 'allégée', 'au', 'aux', 'bio', 'blanchie',
  'ble', 'blé', 'd', 'de', 'des', 'doux', 'du', 'dur', 'en', 'entier',
  'entière', 'epaisse', 'épaisse', 'extrait', 'fin', 'fine', 'force', 'gruau',
  'instantanee', 'instantanée', 'l', 'la', 'le', 'les', 'liquide', 'melange',
  'mélange', 'moulu', 'moulue', 'nature', 'noir', 'noire', 'non', 'ou',
  'poudre', 'pure', 'rape', 'râpé', 'râpée', 'seche', 'sèche', 'sucreé',
  'sucré', 'sucrée', 't45', 't55', 't65',
]);

// Multi-word compounds whose head noun alone must NEVER match a different
// ingredient (e.g. "icing sugar" must not match plain "sugar"; "fromage blanc"
// must not match bare "fromage" or "blanc").
const PROTECTED_PHRASES = new Set([
  'icing sugar',
  'powdered sugar',
  'sucre glace',
  'baking powder',
  'cream cheese',
  'sour cream',
  'fromage blanc',
  'fromage frais',
  'creme fraiche',
  'crème fraîche',
  'lait ribot',
  'pate a tartiner',
  'pâte à tartiner',
  'fruits rouges',
  'lemon zest',
  'zeste citron',
  'zeste de citron',
  'coconut oil',
  'huile coco',
  'huile de coco',
]);

// German single-word compounds that must NOT collapse to their generic suffix
// (e.g. "Puderzucker" / "Staubzucker" must not match plain "Zucker";
// "Buttermilch" must not match plain "Milch"; "Backpulver" is distinct).
const PROTECTED_COMPOUND_HEADS = new Set([
  'puderzucker',
  'staubzucker',
  'vanillezucker',
  'buttermilch',
  'backpulver',
  'maisstaerke',
  'maisstärke',
  'cornflour',
]);

// Suffixes commonly attached in German steps to an ingredient stem
// (e.g. "Erythritpulver", "Mehlmischung", "Zimtmischung", "Zitronenschale").
const DE_COMPOUND_SUFFIXES = ['pulver', 'mischung', 'schale', 'abrieb'];

// Words that represent egg parts when an egg ingredient is in the recipe.
const EGG_WORDS = {
  en: new Set(['egg', 'eggs']),
  de: new Set(['ei', 'eier']),
  fr: new Set(['oeuf', 'oeufs']),
};

const EGG_PART_PATTERNS = {
  en: /\b(?:yolks?|(?<!no\s)whites?(?!\s+streaks?))\b/i,
  de: /\b(?:eigelb|dottern?|eiweiß|eiweiss|eiklar|eischnee)\b/i,
  fr: /\b(?:jaunes?|(?<!fromage\s)blancs?(?!\s+et\s+le|\s+à\s+tartiner))\b/i,
};

const ZEST_NOTE_RE = /\b(?:zest|abrieb|zeste)\b/i;

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[’']/g, ' ')
    .replace(/[-–—/]+/g, ' ');
}

function tokenize(text) {
  const m = norm(text).match(/[\p{L}\p{N}]+/gu);
  return m || [];
}

function stripDiacritics(s) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function cleanTokens(raw) {
  return tokenize(raw).filter((w) => {
    if (/^\d+$/.test(w)) return false;
    if (w.length <= 1) return false;
    return !MODIFIERS.has(w);
  });
}

function extractVariants(item) {
  const variants = [];
  const raw = String(item.name || '');
  // Split out parentheticals (e.g. "Magerquark (low-fat quark)", "durum wheat semolina (Grieß)")
  const parens = [];
  const main = raw.replace(/\(([^)]+)\)/g, (_, inner) => {
    parens.push(inner);
    return ' ';
  });
  for (const chunk of [main, ...parens]) {
    // Split alternatives ("butter or coconut oil", "Obst oder Kompott", "fruits ou compote")
    for (const alt of chunk.split(/\s+(?:or|oder|ou)\s+/i)) {
      const trimmed = alt.trim();
      if (trimmed) variants.push(trimmed);
    }
  }
  return variants;
}

function deriveGermanStems(word) {
  const out = [];
  if (word.endsWith('extrakt') && word.length > 10) out.push(word.slice(0, -7));
  if (word.endsWith('pulver') && word.length > 9 && !PROTECTED_COMPOUND_HEADS.has(word)) {
    out.push(word.slice(0, -6));
  }
  return out;
}

function stripDeStepSuffix(word) {
  for (const suf of DE_COMPOUND_SUFFIXES) {
    if (word.length > suf.length + 3 && word.endsWith(suf)) {
      return word.slice(0, -suf.length);
    }
  }
  return null;
}

function wordsMatch(candidate, stepWord, lang = 'en', allowCompoundSuffix = true) {
  if (candidate === stepWord) return true;
  const c = stripDiacritics(candidate);
  const s = stripDiacritics(stepWord);
  if (c === s) return true;

  // German egg singular/plural ("Ei" <-> "Eier") without falsely matching "ein"
  if (lang === 'de' && ((c === 'ei' && s === 'eier') || (c === 'eier' && s === 'ei'))) {
    return true;
  }

  // Simple singular/plural inflections (EN/DE/FR), guarded to stems >= 3 chars
  if (c.length >= 3 && s.length >= 3) {
    if (c + 's' === s || s + 's' === c) return true;
    if (c + 'es' === s || s + 'es' === c) return true;
    if (c + 'e' === s || s + 'e' === c) return true;
    if (c + 'n' === s || s + 'n' === c) return true;
    if (c + 'en' === s || s + 'en' === c) return true;
    if (c + 'er' === s || s + 'er' === c) return true;
    if (c.endsWith('y') && c.slice(0, -1) + 'ies' === s) return true;
    if (s.endsWith('y') && s.slice(0, -1) + 'ies' === c) return true;
    if (c.endsWith('e') && c.slice(0, -1) + 'en' === s) return true;
    if (s.endsWith('e') && s.slice(0, -1) + 'en' === c) return true;
  }

  // German compound matching only when reading German recipes
  if (lang === 'de') {
    // Strip combining step suffixes like "Mehlmischung" -> "Mehl", "Erythritpulver" -> "Erythrit"
    const strippedStep = stripDeStepSuffix(s);
    if (strippedStep && strippedStep !== s && wordsMatch(c, strippedStep, lang, allowCompoundSuffix)) {
      return true;
    }
  }

  // Compound head noun match: full German compounds in DE (Weizenmehl -> Mehl,
  // Backkakao -> Kakao, Zartbitterkuvertüre -> Kuvertüre) and long German loanwords
  // used in EN recipes (Magertopfen -> Topfen).
  const allowDeLoanword = lang === 'en' && s.length >= 5 && c.length >= 10;
  if (
    (lang === 'de' || allowDeLoanword) &&
    allowCompoundSuffix &&
    !PROTECTED_COMPOUND_HEADS.has(c) &&
    !PROTECTED_COMPOUND_HEADS.has(s) &&
    s.length >= 4 &&
    c.length > s.length + 1
  ) {
    if (c.endsWith(s)) return true;
    if (lang === 'de') {
      if (s.endsWith('e') && c.endsWith(s.slice(0, -1))) return true;
      if (c.endsWith(s + 'e') || c.endsWith(s + 'en')) return true;
    }
  }

  return false;
}

function findPhraseSpan(stepTokens, phraseTokens, masked, lang) {
  const len = phraseTokens.length;
  if (!len || len > stepTokens.length) return null;
  for (let i = 0; i <= stepTokens.length - len; i++) {
    let ok = true;
    for (let j = 0; j < len; j++) {
      if (masked[i + j]) {
        ok = false;
        break;
      }
      if (!wordsMatch(phraseTokens[j], stepTokens[i + j], lang, len === 1)) {
        ok = false;
        break;
      }
    }
    if (ok) return [i, i + len];
  }
  return null;
}

function buildItemProfile(item, gi, ii, lang) {
  const id = `${gi}:${ii}`;
  const variants = extractVariants(item);
  const phrases = []; // array of { tokens: string[], specific: boolean }
  let isEgg = false;

  for (const variant of variants) {
    const rawTokens = tokenize(variant);
    const core = cleanTokens(variant);
    if (!core.length) continue;

    // Check raw multi-word protected phrases first (e.g. "pâte à tartiner", "zeste de citron")
    const rawJoined = stripDiacritics(rawTokens.join(' '));
    for (const prot of PROTECTED_PHRASES) {
      const pNorm = stripDiacritics(prot);
      if (rawJoined.includes(pNorm)) {
        phrases.push({ tokens: tokenize(prot), specific: true });
      }
    }

    const coreJoined = stripDiacritics(core.join(' '));
    const isProtected = PROTECTED_PHRASES.has(coreJoined);

    if (core.length >= 2) {
      phrases.push({ tokens: core, specific: true });
      // For non-protected multi-word names (e.g. "Lotus Biscoff biscuits",
      // "spelt flour", "dark brown sugar", "fécule de maïs"), also allow matching
      // the trailing head noun (EN/DE) or leading head noun (FR: "biscuits Lotus", "fécule maïs", "levure chimique").
      if (!isProtected) {
        const last = core.at(-1);
        const first = core[0];
        if (lang === 'fr') {
          if (first.length >= 3 && first !== 'fromage' && first !== 'creme' && first !== 'crème') {
            phrases.push({ tokens: [first], specific: false });
          }
          if (last !== first && last.length >= 4 && !['lotus', 'biscoff', 'mais', 'maïs', 'epeautre', 'épeautre', 'chimique', 'brune'].includes(stripDiacritics(last))) {
            phrases.push({ tokens: [last], specific: false });
          }
        } else {
          if (last.length >= 3 && last !== 'cheese' && last !== 'cream') {
            phrases.push({ tokens: [last], specific: false });
          }
        }
      }
    } else {
      const w = core[0];
      phrases.push({ tokens: [w], specific: true });
      if (lang === 'de') {
        for (const stem of deriveGermanStems(w)) {
          phrases.push({ tokens: [stem], specific: false });
        }
      }
    }

    // French vergeoise brune -> referred to as "sucre" in the filling step
    if (lang === 'fr' && core.some((w) => stripDiacritics(w) === 'vergeoise')) {
      phrases.push({ tokens: ['sucre'], specific: false });
    }

    if (core.some((w) => EGG_WORDS[lang]?.has(stripDiacritics(w)))) {
      isEgg = true;
    }
  }

  // Note-derived zest match (e.g. "organic lemon" with note "zest only",
  // "Bio-Zitrone" with note "nur der Abrieb", "citron bio" with note "uniquement le zeste")
  const noteZestMatch = item.note && ZEST_NOTE_RE.exec(item.note);
  if (noteZestMatch) {
    phrases.push({ tokens: [norm(noteZestMatch[0]).trim()], specific: false });
  }

  // Deduplicate phrases by normalized joined key
  const seen = new Set();
  const deduped = [];
  for (const p of phrases) {
    const key = p.tokens.map(stripDiacritics).join(' ');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }

  // Canonical key for detecting duplicate ingredients across groups (e.g. butter in dough/filling/icing)
  const primaryCore = cleanTokens(variants[0] || item.name);
  let canon =
    primaryCore.length >= 2 && !PROTECTED_PHRASES.has(stripDiacritics(primaryCore.join(' ')))
      ? stripDiacritics(lang === 'fr' ? primaryCore[0] : primaryCore.at(-1))
      : stripDiacritics(primaryCore.join(' '));
  if (lang === 'fr' && canon === 'vergeoise') canon = 'sucre';

  // Numbers from amount/metric/note for disambiguating duplicate items (e.g. "200 g" vs "6 biscuits")
  const qtyHints = new Set();
  for (const field of [item.amount, item.metric, item.note]) {
    if (!field) continue;
    const nums = String(field).match(/\b\d+(?:\s*(?:g|ml|el|tl))?\b/gi);
    if (nums) nums.forEach((n) => qtyHints.add(n.toLowerCase().replace(/\s+/g, ' ')));
  }

  return {
    id,
    gi,
    ii,
    item,
    phrases: deduped,
    isEgg,
    canon,
    qtyHints,
  };
}

function groupTitleWords(group) {
  if (!group.title) return [];
  const stop = new Set([
    'the', 'and', 'for', 'der', 'die', 'das', 'für', 'und', 'la', 'le', 'les', 'et', 'pour', 'de', 'du',
    'pan', 'plate', 'pfanne', 'teller', 'poele', 'poêle', 'assiette',
  ]);
  return tokenize(group.title)
    .map(stripDiacritics)
    .filter((w) => w.length >= 3 && !stop.has(w));
}

function disambiguateGroups(matchedProfiles, matchedSpans, stepText, groups, usedBefore) {
  if (groups.length <= 1 || matchedProfiles.length <= 1) {
    return matchedProfiles;
  }

  // Group matched profiles by canonical key OR shared exact step span across different groups
  const byBucket = new Map();
  for (const p of matchedProfiles) {
    const span = matchedSpans.get(p.id);
    const key = p.canon || (span ? `span:${span[0]}:${span[1]}` : p.id);
    if (!byBucket.has(key)) byBucket.set(key, []);
    byBucket.get(key).push(p);
  }

  const hasDuplicates = [...byBucket.values()].some((arr) => arr.length > 1);
  if (!hasDuplicates) return matchedProfiles;

  // Score each group for this step using:
  // 1. Group title words appearing in the step
  // 2. Unambiguous (non-duplicated) ingredients matched from that group
  const stepNorm = stripDiacritics(norm(stepText));
  const stepToks = tokenize(stepText).map(stripDiacritics);
  const groupScore = new Map();

  groups.forEach((g, gi) => {
    let score = 0;
    for (const tw of groupTitleWords(g)) {
      if (stepToks.some((st) => st === tw || (tw.length >= 4 && st.startsWith(tw.slice(0, 4))))) {
        score += 3;
      }
    }
    groupScore.set(gi, score);
  });

  // Count unambiguous items per group
  for (const arr of byBucket.values()) {
    if (arr.length === 1) {
      const gi = arr[0].gi;
      groupScore.set(gi, (groupScore.get(gi) || 0) + 2);
    }
  }

  const kept = [];
  for (const arr of byBucket.values()) {
    if (arr.length === 1) {
      kept.push(arr[0]);
      continue;
    }
    // Score each candidate copy of this duplicated ingredient
    let best = arr[0];
    let bestScore = -Infinity;
    for (const cand of arr) {
      let s = (groupScore.get(cand.gi) || 0) * 10;
      // Quantity hint match in step text (e.g. "200 g" or "6 biscuits")
      for (const hint of cand.qtyHints) {
        if (hint.length >= 2 && stepNorm.includes(hint)) s += 8;
        else if (/^\d+$/.test(hint) && new RegExp(`\\b${hint}\\b`).test(stepNorm)) s += 4;
      }
      // Progression tie-breaker: prefer unused group in natural recipe order
      if (!usedBefore.has(cand.id)) s += 2;
      // Slight preference for earlier group if otherwise completely tied
      s -= cand.gi * 0.1;
      if (s > bestScore) {
        bestScore = s;
        best = cand;
      }
    }
    kept.push(best);
  }

  return kept;
}

/**
 * Matches each method step to the ingredient IDs (`"gi:ii"`) whose names appear
 * in the step's title or text. Never invents content; returns an array of
 * matched ID arrays (one per step), sorted in ingredient-list order.
 */
export function matchRecipeSteps(groups = [], steps = [], lang = 'en') {
  const profiles = [];
  groups.forEach((group, gi) => {
    (group.items || []).forEach((item, ii) => {
      profiles.push(buildItemProfile(item, gi, ii, lang));
    });
  });

  // Detect single-word tokens shared by multiple distinct items within the same group
  // (e.g. "fromage" in "fromage blanc" & "fromage frais") so non-specific fallbacks don't collide.
  const singleWordOwners = new Map();
  for (const p of profiles) {
    for (const ph of p.phrases) {
      if (ph.tokens.length === 1) {
        const key = `${p.gi}:${stripDiacritics(ph.tokens[0])}`;
        if (!singleWordOwners.has(key)) singleWordOwners.set(key, new Set());
        singleWordOwners.get(key).add(p.id);
      }
    }
  }

  // Build ordered phrase match tasks grouped by phrase length so duplicate-group
  // items sharing a multi-word phrase (e.g. "pâte à tartiner" in Group 1 & Group 2)
  // both match before the span is masked against shorter generic phrases.
  const tasksByLen = new Map();
  for (const p of profiles) {
    for (const ph of p.phrases) {
      if (ph.tokens.length === 1 && !ph.specific) {
        const key = `${p.gi}:${stripDiacritics(ph.tokens[0])}`;
        if ((singleWordOwners.get(key)?.size || 0) > 1) continue;
      }
      const len = ph.tokens.length;
      if (!tasksByLen.has(len)) tasksByLen.set(len, []);
      tasksByLen.get(len).push({ profile: p, tokens: ph.tokens, specific: ph.specific });
    }
  }
  const lengthsDesc = [...tasksByLen.keys()].sort((a, b) => b - a);
  for (const len of lengthsDesc) {
    tasksByLen.get(len).sort((a, b) => {
      if (a.specific !== b.specific) return a.specific ? -1 : 1;
      return b.tokens[0].length - a.tokens[0].length;
    });
  }

  const orderIndex = new Map(profiles.map((p, idx) => [p.id, idx]));
  const usedBefore = new Set();

  return steps.map((step) => {
    const stepText = `${step.title || ''} ${step.text || ''}`;
    const stepTokens = tokenize(stepText);
    const masked = new Array(stepTokens.length).fill(false);
    const matchedIds = new Set();
    const matchedSpans = new Map();

    // Pass 1: match phrases longest-length-first, masking multi-word spans after each length bucket
    for (const len of lengthsDesc) {
      const spansToMask = [];
      for (const task of tasksByLen.get(len)) {
        if (matchedIds.has(task.profile.id)) continue;
        const span = findPhraseSpan(stepTokens, task.tokens, masked, lang);
        if (span) {
          matchedIds.add(task.profile.id);
          matchedSpans.set(task.profile.id, span);
          if (len >= 2) spansToMask.push(span);
        }
      }
      for (const [start, end] of spansToMask) {
        for (let k = start; k < end; k++) masked[k] = true;
      }
    }

    // Pass 2: egg parts (yolks/whites, Eigelb/Dotter/Eiklar/Eischnee, jaunes/blancs)
    const eggPattern = EGG_PART_PATTERNS[lang] || EGG_PART_PATTERNS.en;
    const unmaskedText = stepTokens.filter((_, idx) => !masked[idx]).join(' ');
    if (eggPattern.test(unmaskedText)) {
      for (const p of profiles) {
        if (p.isEgg) matchedIds.add(p.id);
      }
    }

    let matchedProfiles = profiles.filter((p) => matchedIds.has(p.id));
    matchedProfiles = disambiguateGroups(matchedProfiles, matchedSpans, stepText, groups, usedBefore);
    matchedProfiles.sort((a, b) => orderIndex.get(a.id) - orderIndex.get(b.id));

    for (const p of matchedProfiles) usedBefore.add(p.id);
    return matchedProfiles.map((p) => p.id);
  });
}

/* ---------- Mise en place store (separate from shopping ticks) ---------- */

export const MISE_KEY = 'recipe-book:mise:v1';

const EMPTY_SET = new Set();
const ITEM_ID = /^\d+:\d+$/;
const prepBySlug = new Map();
const miseModeBySlug = new Map();
const miseListeners = new Set();

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function reloadMise(storage = defaultStorage()) {
  prepBySlug.clear();
  try {
    const raw = storage?.getItem(MISE_KEY);
    if (!raw) return prepBySlug;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return prepBySlug;
    for (const [slug, items] of Object.entries(parsed)) {
      if (typeof slug !== 'string' || !slug || !Array.isArray(items)) continue;
      const set = new Set(items.filter((id) => typeof id === 'string' && ITEM_ID.test(id)));
      if (set.size > 0) prepBySlug.set(slug, set);
    }
  } catch {
    /* storage blocked or malformed: start with empty prep ticks */
  }
  return prepBySlug;
}

function persistMise(storage = defaultStorage()) {
  try {
    if (!storage) return;
    const out = {};
    for (const [slug, set] of prepBySlug) {
      if (set.size > 0) out[slug] = [...set];
    }
    storage.setItem(MISE_KEY, JSON.stringify(out));
  } catch {
    /* storage blocked: prep ticks still work this visit */
  }
}

function notifyMise(slug) {
  for (const fn of miseListeners) fn(slug);
}

export function subscribeMise(fn) {
  miseListeners.add(fn);
  return () => miseListeners.delete(fn);
}

export function getPrepItems(slug) {
  return prepBySlug.get(slug) || EMPTY_SET;
}

export function togglePrepItem(slug, itemId, storage = defaultStorage()) {
  if (!slug || typeof itemId !== 'string' || !ITEM_ID.test(itemId)) return getPrepItems(slug);
  const next = new Set(prepBySlug.get(slug));
  if (next.has(itemId)) next.delete(itemId);
  else next.add(itemId);
  if (next.size > 0) prepBySlug.set(slug, next);
  else prepBySlug.delete(slug);
  persistMise(storage);
  notifyMise(slug);
  return getPrepItems(slug);
}

export function clearPrepItems(slug, storage = defaultStorage()) {
  if (!prepBySlug.has(slug)) return;
  prepBySlug.delete(slug);
  persistMise(storage);
  notifyMise(slug);
}

export function isMiseMode(slug) {
  return miseModeBySlug.get(slug) === true;
}

export function setMiseMode(slug, on) {
  if (!slug) return;
  const next = Boolean(on);
  if (isMiseMode(slug) === next) return;
  if (next) miseModeBySlug.set(slug, true);
  else miseModeBySlug.delete(slug);
  notifyMise(slug);
}

export function toggleMiseMode(slug) {
  setMiseMode(slug, !isMiseMode(slug));
  return isMiseMode(slug);
}

const noopSubscribe = () => () => {};

export function usePrepItems(slug, disabled = false) {
  return useSyncExternalStore(
    disabled ? noopSubscribe : subscribeMise,
    () => (disabled ? EMPTY_SET : getPrepItems(slug)),
  );
}

export function useMiseMode(slug, disabled = false) {
  return useSyncExternalStore(
    disabled ? noopSubscribe : subscribeMise,
    () => (disabled ? false : isMiseMode(slug)),
  );
}

reloadMise();

/* ---------- Active step-to-ingredient link store ---------- */

// Value per slug:
// - undefined / null: auto-follow currentStepIndex when cooking is underway
// - 'none': explicitly cleared by the user
// - integer >= 0: explicitly tapped step
const activeStepBySlug = new Map();
const linkListeners = new Set();

function notifyLink(slug) {
  for (const fn of linkListeners) fn(slug);
}

export function subscribeStepLink(fn) {
  linkListeners.add(fn);
  return () => linkListeners.delete(fn);
}

export function getActiveStep(slug) {
  return activeStepBySlug.has(slug) ? activeStepBySlug.get(slug) : null;
}

export function setActiveStep(slug, value) {
  if (!slug) return;
  const normalized =
    value === 'none'
      ? 'none'
      : Number.isInteger(value) && value >= 0
        ? value
        : null;
  if (getActiveStep(slug) === normalized) return;
  if (normalized === null) activeStepBySlug.delete(slug);
  else activeStepBySlug.set(slug, normalized);
  notifyLink(slug);
}

export function toggleStepLink(slug, stepIndex, resolvedLinkedStep = null) {
  if (!slug || !Number.isInteger(stepIndex) || stepIndex < 0) return;
  if (resolvedLinkedStep === stepIndex || getActiveStep(slug) === stepIndex) {
    setActiveStep(slug, 'none');
  } else {
    setActiveStep(slug, stepIndex);
  }
}

export function clearStepLink(slug) {
  setActiveStep(slug, 'none');
}

export function resetAutoStepLink(slug) {
  setActiveStep(slug, null);
}

export function resolveLinkedStep(activeStep, currentStepIndex, matchesByStep) {
  if (!Array.isArray(matchesByStep) || !matchesByStep.length) return null;
  if (activeStep === 'none') return null;
  if (Number.isInteger(activeStep) && activeStep >= 0 && activeStep < matchesByStep.length) {
    return matchesByStep[activeStep]?.length ? activeStep : null;
  }
  if (
    Number.isInteger(currentStepIndex) &&
    currentStepIndex >= 0 &&
    currentStepIndex < matchesByStep.length &&
    matchesByStep[currentStepIndex]?.length
  ) {
    return currentStepIndex;
  }
  return null;
}

export function useActiveStep(slug, disabled = false) {
  return useSyncExternalStore(
    disabled ? noopSubscribe : subscribeStepLink,
    () => (disabled ? null : getActiveStep(slug)),
  );
}

/* ---------- Live units sync (so Method chips match Ingredients units) ---------- */

let syncedUnits = (() => {
  try {
    return globalThis.localStorage?.getItem('recipe-book:units') === 'metric' ? 'metric' : 'cups';
  } catch {
    return 'cups';
  }
})();
const unitsListeners = new Set();

export function syncUnits(units) {
  if (units !== 'cups' && units !== 'metric') return;
  if (syncedUnits === units) return;
  syncedUnits = units;
  for (const fn of unitsListeners) fn();
}

export function useSyncedUnits(disabled = false) {
  return useSyncExternalStore(
    disabled
      ? noopSubscribe
      : (fn) => {
          unitsListeners.add(fn);
          return () => unitsListeners.delete(fn);
        },
    () => syncedUnits,
  );
}
