import { useEffect, useState } from 'react';
import { getTimer, remainingSeconds, subscribe } from './timer.js';

// Live view of one step timer: { state: 'idle' | 'running' | 'done', remaining }.
export function useTimer(key) {
  const read = () => {
    const entry = getTimer(key);
    if (!entry) return { state: 'idle', remaining: 0 };
    return { state: entry.done ? 'done' : 'running', remaining: remainingSeconds(key) };
  };
  const [view, setView] = useState(read);

  useEffect(() => {
    setView(read());
    const unsub = subscribe((k) => k === key && setView(read()));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (view.state !== 'running') return;
    const id = setInterval(() => setView(read()), 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.state, key]);

  return view;
}
