import { useEffect, useState } from 'react';
import { getDuration, getRecipeTimers, getTimer, reconcileTimer, remainingSeconds, subscribe } from './timer.js';

// Live view of one step timer: { state: 'idle' | 'running' | 'paused' | 'done', remaining, seconds, total }.
export function useTimer(key, fallback = 0) {
  const read = () => {
    if (!key) return { state: 'idle', remaining: 0, seconds: fallback, total: fallback };
    const seconds = getDuration(key, fallback);
    const entry = getTimer(key);
    if (!entry) return { state: 'idle', remaining: 0, seconds, total: seconds };
    return {
      state: entry.done ? 'done' : entry.remaining != null ? 'paused' : 'running',
      remaining: remainingSeconds(key),
      seconds,
      total: entry.total,
    };
  };
  const [view, setView] = useState(read);

  useEffect(() => {
    setView(read());
    if (!key) return;
    return subscribe((k) => k === key && setView(read()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fallback]);

  useEffect(() => {
    if (!key || view.state !== 'running') return;
    const id = setInterval(() => {
      reconcileTimer(key);
      setView(read());
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.state, key]);

  return view;
}

// Live list of all active (running, paused, or done) timers for a recipe.
export function useRecipeTimers(slug) {
  const [list, setList] = useState(() => getRecipeTimers(slug));

  useEffect(() => {
    setList(getRecipeTimers(slug));
    if (!slug) return;
    const prefix = `${slug}:`;
    return subscribe((k) => {
      if (k.startsWith(prefix)) setList(getRecipeTimers(slug));
    });
  }, [slug]);

  const hasRunning = list.some((item) => item.state === 'running');
  useEffect(() => {
    if (!slug || !hasRunning) return;
    const id = setInterval(() => {
      const current = getRecipeTimers(slug);
      for (const item of current) {
        if (item.state === 'running') reconcileTimer(item.key);
      }
      setList(getRecipeTimers(slug));
    }, 500);
    return () => clearInterval(id);
  }, [slug, hasRunning]);

  return list;
}
