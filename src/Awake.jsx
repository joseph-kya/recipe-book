import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createTapHandlers, flipLabel } from './motion.js';

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

function SunIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.8" />
      <path
        d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AwakeToggle({ label }) {
  const [on, setOn] = useWakeLock();
  const btnRef = useRef(null);
  const inRef = useRef(null);
  const outRef = useRef(null);
  const animRef = useRef(null);
  const pressRef = useRef(null);
  const downRef = useRef(false);
  const releasedAtRef = useRef(-1);
  const prev = useRef(on);

  const tapHandlers = useMemo(
    () => createTapHandlers({ btnRef, pressRef, releasedAtRef, downRef }),
    [],
  );

  useEffect(() => () => {
    animRef.current?.cancel();
    pressRef.current?.cancel();
  }, []);

  useLayoutEffect(() => {
    const old = prev.current;
    prev.current = on;
    if (old === on) return;
    const fromPointer = releasedAtRef.current >= 0 && performance.now() - releasedAtRef.current < 80;
    releasedAtRef.current = -1;
    flipLabel(inRef.current, {
      button: fromPointer ? null : btnRef.current,
      outgoing: outRef.current,
      preserveOutgoing: true,
      animRef,
      buttonAnimRef: pressRef,
    });
  }, [on]);

  if (!canWake) return null;
  return (
    <button
      ref={btnRef}
      type="button"
      className="ctl ctl--awake"
      aria-pressed={on}
      aria-label={label}
      title={label}
      {...tapHandlers}
      onClick={() => setOn((v) => !v)}
    >
      <span className="ctl-flip-box">
        <span ref={outRef} className="ctl-flip ctl-flip--out" aria-hidden="true" hidden>
          <SunIcon className={`ctl-icon${on ? '' : ' ctl-icon--tilted'}`} />
        </span>
        <span ref={inRef} className="ctl-flip ctl-flip--in">
          <SunIcon className="ctl-icon" />
        </span>
      </span>
    </button>
  );
}
