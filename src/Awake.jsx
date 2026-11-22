import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { createTapHandlers, flipLabel } from './motion.js';
import { SunIcon } from './ornaments.jsx';

// Keep-screen-on toggle. Shared by the bottom control bar and Settings.
const AWAKE_KEY = 'recipe-book:awake';
export const canWake = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

// Shared ref-counted screen wake lock so the persisted setting and Cook mode
// never conflict, leak sentinels, or drop the lock while either still needs it.
let holdCount = 0;
let sentinel = null;
let requestInFlight = null;
let listenersAttached = false;

function requestScreenLock() {
  if (holdCount <= 0 || typeof navigator === 'undefined' || typeof navigator.wakeLock?.request !== 'function') return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  if (sentinel && !sentinel.released) return;
  if (requestInFlight) return;

  requestInFlight = navigator.wakeLock
    .request('screen')
    .then((acquired) => {
      requestInFlight = null;
      if (holdCount <= 0) {
        return acquired.release().catch(() => {});
      }
      sentinel = acquired;
      acquired.addEventListener?.('release', () => {
        if (sentinel === acquired) sentinel = null;
      });
    })
    .catch(() => {
      /* low battery, hidden tab, or denied: retry on next interaction or visibility */
      requestInFlight = null;
    });
}

function attachWakeListeners() {
  if (listenersAttached || typeof document === 'undefined') return;
  listenersAttached = true;
  document.addEventListener('visibilitychange', requestScreenLock);
  window.addEventListener('pageshow', requestScreenLock);
  document.addEventListener('pointerdown', requestScreenLock, { passive: true });
}

function detachWakeListeners() {
  if (!listenersAttached || typeof document === 'undefined') return;
  listenersAttached = false;
  document.removeEventListener('visibilitychange', requestScreenLock);
  window.removeEventListener('pageshow', requestScreenLock);
  document.removeEventListener('pointerdown', requestScreenLock);
}

function acquireHold() {
  if (!canWake) return;
  holdCount += 1;
  if (holdCount === 1) attachWakeListeners();
  requestScreenLock();
}

function releaseHold() {
  if (!canWake) return;
  holdCount = Math.max(0, holdCount - 1);
  if (holdCount === 0) {
    detachWakeListeners();
    const activeLock = sentinel;
    sentinel = null;
    activeLock?.release().catch(() => {});
  }
}

// Holds a screen wake lock while active, re-acquiring it on visibility, pageshow, or tap.
export function useHoldWakeLock(active) {
  useEffect(() => {
    if (!active || !canWake) return;
    acquireHold();
    return releaseHold;
  }, [active]);
}

function readSavedAwake() {
  try {
    return canWake && localStorage.getItem(AWAKE_KEY) === '1';
  } catch {
    return false;
  }
}

// Module store so the bar's sun and Settings' switch stay in sync and hold the
// screen lock at most once regardless of how many components subscribe.
const awakeListeners = new Set();
let awakeOn = readSavedAwake();
let awakeHolding = false;

function syncAwakeHold() {
  const shouldHold = awakeOn && awakeListeners.size > 0;
  if (shouldHold && !awakeHolding) {
    awakeHolding = true;
    acquireHold();
  } else if (!shouldHold && awakeHolding) {
    awakeHolding = false;
    releaseHold();
  }
}

function subscribeAwake(fn) {
  awakeListeners.add(fn);
  syncAwakeHold();
  return () => {
    awakeListeners.delete(fn);
    syncAwakeHold();
  };
}

function getAwake() {
  return awakeOn;
}

function setAwake(next) {
  const value = Boolean(typeof next === 'function' ? next(awakeOn) : next);
  if (!canWake && value) return;
  if (value === awakeOn) return;
  awakeOn = value;
  try {
    localStorage.setItem(AWAKE_KEY, awakeOn ? '1' : '0');
  } catch {
    /* private mode */
  }
  syncAwakeHold();
  for (const fn of awakeListeners) fn();
}

export function useAwake() {
  const on = useSyncExternalStore(subscribeAwake, getAwake, () => false);
  return [on, setAwake];
}

export function AwakeToggle({ label }) {
  const [on, setOn] = useAwake();
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
