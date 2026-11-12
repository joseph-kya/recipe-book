import { createContext, createElement, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { FACTORS } from './scale.js';
import { transition } from './motion.js';

// Portion scale, per recipe: you scale the one you are cooking, and opening
// another recipe never surprises you with doubled amounts. Stored as one map,
// { "<slug>": 2 }, under recipe-book:scale.
const KEY = 'recipe-book:scale';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved && typeof saved === 'object') {
      return Object.fromEntries(Object.entries(saved).filter(([, f]) => FACTORS.includes(f) && f !== 1));
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
    if (!FACTORS.includes(factor) || (latest.current[slug] || 1) === factor) return;
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

export function useScale(slug) {
  const { scales, setScale } = useContext(ScaleContext);
  return [scales[slug] || 1, (f) => setScale(slug, f)];
}
