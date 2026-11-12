import { useCallback, useState } from 'react';

// Which amount leads: 'cups' (cups and spoons big, grams small) or 'metric'
// (grams big, cups small). Only metric values already in the JSON are ever shown.
const KEY = 'recipe-book:units';

function initialUnits() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'cups' || saved === 'metric') return saved;
  } catch {
    /* storage blocked: fall through */
  }
  return 'cups';
}

export function useUnits() {
  const [units, setUnitsState] = useState(initialUnits);
  const setUnits = useCallback((next) => {
    // Mark the next ~400 ms as a swap, so only the toggle (never a page load or
    // a page turn) plays the amounts' crossfade (see .ing-how in styles.css).
    const root = document.documentElement;
    root.dataset.unitsSwap = '';
    clearTimeout(useUnits.swapTimer);
    useUnits.swapTimer = setTimeout(() => delete root.dataset.unitsSwap, 400);
    setUnitsState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: the choice lasts this visit */
    }
  }, []);
  return [units, setUnits];
}

// The two amounts of an ingredient row, primary first. A row without its own
// metric value (or one identical to the cups text) keeps the cups amount as primary.
export function amountsFor(item, units) {
  const metric = item.metric && item.metric !== item.amount ? item.metric : null;
  if (units === 'metric' && metric) return { primary: metric, secondary: item.amount, metricFirst: true };
  return { primary: item.amount, secondary: metric, metricFirst: false };
}
