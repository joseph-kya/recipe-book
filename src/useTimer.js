import { useEffect, useState } from 'react';
import { getDuration, getTimer, remainingSeconds, subscribe } from './timer.js';

// Live view of one step timer: { state: 'idle' | 'running' | 'paused' | 'done', remaining }.
export function useTimer(key, fallback = 0) {
  const read = () => {
    const seconds = getDuration(key, fallback);
    const entry = getTimer(key);
    if (!entry) return { state: 'idle', remaining: 0, seconds };
    return { state: entry.done ? 'done' : entry.remaining != null ? 'paused' : 'running', remaining: remainingSeconds(key), seconds };
  };
  const [view, setView] = useState(read);

  useEffect(() => {
    setView(read());
    const unsub = subscribe((k) => k === key && setView(read()));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fallback]);

  useEffect(() => {
    if (view.state !== 'running') return;
    const id = setInterval(() => setView(read()), 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.state, key]);

  return view;
}
