import { createContext, createElement, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CANDIDATES, clampFactor, offeredFactors } from './scale.js';
import { transition } from './motion.js';

// Portion scale, per recipe: you scale the one you are cooking, and opening
// another recipe never surprises you with doubled amounts. Stored as one map
// under recipe-book:scale: a preset factor ({ "<slug>": 2 }) or a custom one
// ({ "<slug>": { "custom": 1.7 } }).
const KEY = 'recipe-book:scale';

const isCustom = (v) => v && typeof v === 'object' && Number.isFinite(v.custom);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved && typeof saved === 'object') {
      return Object.fromEntries(
        Object.entries(saved)
          .filter(([, v]) => (CANDIDATES.includes(v) && v !== 1) || isCustom(v))
          .map(([slug, v]) => [slug, isCustom(v) ? { custom: clampFactor(v.custom) } : v]),
      );
    }
  } catch {
    /* storage blocked or malformed: start at 1× */
  }
  return {};
}

const ScaleContext = createContext({ scales: {}, setScale: () => {} });

export function ScaleProvider({ children }) {
  const [scales, setScales] = useState(load);
  const latest = useRef(scales);
  // value: a preset factor, or { custom: f }. animate: the shared crossfade
  // (presets); custom typing skips it so it never fights the keyboard.
  const setScale = useCallback((slug, value, { animate = true } = {}) => {
    const next = { ...latest.current };
    if (isCustom(value)) next[slug] = { custom: clampFactor(value.custom) };
    else if (!CANDIDATES.includes(value)) return;
    else if (value === 1) delete next[slug];
    else next[slug] = value;
    if (JSON.stringify(next[slug]) === JSON.stringify(latest.current[slug])) return;
    latest.current = next;
    // Crossfade wide spreads where scaling can repaginate; on phone screens keep
    // preset taps instant so the pill glide and amount wave play unblurred.
    const isWide = typeof document !== 'undefined' && document.querySelector('.book--wide');
    if (animate && isWide) transition(() => setScales(next));
    else setScales(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage blocked: the choice lasts this visit */
    }
  }, []);
  const value = useMemo(() => ({ scales, setScale }), [scales, setScale]);
  return createElement(ScaleContext.Provider, { value }, children);
}

export const useScales = () => useContext(ScaleContext);

const offeredCache = new Map();
const offeredFor = (recipe) => {
  if (!offeredCache.has(recipe.slug)) offeredCache.set(recipe.slug, offeredFactors(recipe));
  return offeredCache.get(recipe.slug);
};

// One recipe's scale: { factor, custom, offered, setFactor, setCustom }.
// A saved preset this recipe does not offer quietly reads as 1×; a custom
// factor is used exactly (clamped to 0.1–10×).
export function useScale(recipe) {
  const { scales, setScale } = useContext(ScaleContext);
  const offered = offeredFor(recipe);
  const saved = scales[recipe.slug] ?? 1;
  const custom = isCustom(saved);
  const factor = custom ? saved.custom : offered.includes(saved) ? saved : 1;
  return {
    factor,
    custom,
    offered,
    setFactor: (f) => offered.includes(f) && setScale(recipe.slug, f),
    setCustom: (f, opts) => setScale(recipe.slug, { custom: f }, opts),
  };
}
