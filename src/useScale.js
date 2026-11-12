import { createContext, createElement, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CANDIDATES, offeredFactors } from './scale.js';
import { transition } from './motion.js';

// Portion scale, per recipe: you scale the one you are cooking, and opening
// another recipe never surprises you with doubled amounts. Stored as one map,
// { "<slug>": 2 }, under recipe-book:scale.
const KEY = 'recipe-book:scale';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved && typeof saved === 'object') {
      return Object.fromEntries(Object.entries(saved).filter(([, f]) => CANDIDATES.includes(f) && f !== 1));
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
  const setScale = useCallback((slug, factor) => {
    if (!CANDIDATES.includes(factor) || (latest.current[slug] || 1) === factor) return;
    const next = { ...latest.current };
    if (factor === 1) delete next[slug];
    else next[slug] = factor;
    latest.current = next;
    // The shared crossfade: changed amounts and any new page breaks fade together,
    // interruptible, instant under reduced motion.
    transition(() => setScales(next));
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

// [factor, setFactor, offered] for one recipe. A saved factor this recipe does
// not offer (an old choice, or the rules changed) quietly reads as 1×.
export function useScale(recipe) {
  const { scales, setScale } = useContext(ScaleContext);
  const offered = offeredFor(recipe);
  const saved = scales[recipe.slug] || 1;
  const factor = offered.includes(saved) ? saved : 1;
  return [factor, (f) => offered.includes(f) && setScale(recipe.slug, f), offered];
}
