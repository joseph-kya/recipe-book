import { useEffect, useState } from 'react';

// Keep-screen-on toggle. Lives in the bottom control bar.
const AWAKE_KEY = 'recipe-book:awake';
const canWake = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

// Holds a screen wake lock while on, re-acquiring it when the tab comes back.
function useWakeLock() {
  const [on, setOn] = useState(() => {
    try {
      return canWake && localStorage.getItem(AWAKE_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(AWAKE_KEY, on ? '1' : '0');
    } catch {
      /* private mode */
    }
    if (!on || !canWake) return;
    let lock = null;
    let disposed = false;
    const acquire = async () => {
      if (disposed || document.visibilityState !== 'visible') return;
      try {
        if (lock && !lock.released) return;
        const acquired = await navigator.wakeLock.request('screen');
        if (disposed) await acquired.release();
        else lock = acquired;
      } catch {
        /* low battery or denied: nothing to hold */
      }
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', acquire);
      lock?.release().catch(() => {});
    };
  }, [on]);
  return [on, setOn];
}

export function AwakeToggle({ label }) {
  const [on, setOn] = useWakeLock();
  if (!canWake) return null;
  return (
    <button type="button" className="ctl ctl--awake" aria-pressed={on} aria-label={label} title={label} onClick={() => setOn((v) => !v)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="ctl-icon">
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.8" />
        <path
          d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
