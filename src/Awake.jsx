import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createTapHandlers, flipLabel } from './motion.js';
import { SunIcon } from './ornaments.jsx';

// Keep-screen-on toggle. Lives in the bottom control bar.
const AWAKE_KEY = 'recipe-book:awake';
const canWake = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

// Holds a screen wake lock while active, re-acquiring it when the tab comes back.
export function useHoldWakeLock(active) {
  useEffect(() => {
    if (!active || !canWake) return;
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
  }, [active]);
}

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
  }, [on]);
  useHoldWakeLock(on);
  return [on, setOn];
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
