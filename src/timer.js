import { ring } from './audio.js';
export { primeAudio } from './audio.js';

// Step timers. A step that names a time ("bake 20–25 min") gets a tap-to-start
// countdown. Timers live here, outside React, so they keep running while the
// reader flips pages, and ring when they hit zero.

const DURATION = /(\d+)(?:\s*(?:[–-]|to|bis)\s*(\d+))?\s*(minutes?|minuten|min\.?|hours?|stunden?|std\.?|h)\b/i;

// Finds the first duration named in a step. Ranges start at the low end: the
// first moment to check the oven. Returns { seconds, label } or null.
export function parseDuration(...texts) {
  for (const text of texts) {
    const m = DURATION.exec(text || '');
    if (!m) continue;
    const low = Number(m[1]);
    if (!low) continue;
    const hours = /^(h|hours?|stunden?|std)/i.test(m[3]);
    const seconds = low * (hours ? 3600 : 60);
    const label = m[0].replace(/\s+/g, ' ').replace(/\.$/, '');
    return { seconds, label };
  }
  return null;
}

export function formatRemaining(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// --- store ---------------------------------------------------------------

const timers = new Map(); // key -> { endAt, remaining (paused only), total, done, handle }
export const TIMERS_KEY = 'recipe-book:timers:v1';
const chosen = new Map(); // key -> seconds picked with −/+ before starting
const listeners = new Set();

export const STEP_SECONDS = 60;
export const MIN_SECONDS = 60;

// The duration a step will start with: the parsed one unless the reader changed it.
export function getDuration(key, fallback) {
  return chosen.get(key) ?? fallback;
}

// Moves a timer by delta seconds. Running: shifts the end (never below one
// minute left). Idle: changes the duration it will start with.
export function adjustTimer(key, delta, fallback, now = Date.now()) {
  const entry = timers.get(key);
  if (entry && !entry.done) {
    const paused = entry.remaining != null;
    const left = paused ? entry.remaining : Math.max(0, (entry.endAt - now) / 1000);
    const next = Math.max(MIN_SECONDS, left + delta);
    if (paused) entry.remaining = next;
    else entry.endAt = now + next * 1000;
    entry.total = Math.max(MIN_SECONDS, entry.total + (next - left));
    clearTimeout(entry.handle);
    if (!paused) schedule(key, entry, now);
    notify(key);
    return next;
  }
  const next = Math.max(MIN_SECONDS, getDuration(key, fallback) + delta);
  chosen.set(key, next);
  notify(key);
  return next;
}

export function formatMinutes(seconds) {
  const m = Math.round(seconds / 60);
  return m >= 60 && m % 60 === 0 ? `${m / 60} h` : `${m} min`;
}

function notify(key) {
  persistTimers();
  for (const fn of listeners) fn(key);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getTimer(key) {
  return timers.get(key) ?? null;
}

export function startTimer(key, seconds, now = Date.now()) {
  stopTimer(key);
  const entry = { endAt: now + seconds * 1000, total: seconds, done: false, handle: 0 };
  timers.set(key, entry);
  schedule(key, entry, now);
  notify(key);
  return entry;
}

export function stopTimer(key) {
  const entry = timers.get(key);
  if (!entry) return;
  clearTimeout(entry.handle);
  timers.delete(key);
  notify(key);
}

export function finishTimer(key) {
  const entry = timers.get(key);
  if (!entry || entry.done) return;
  clearTimeout(entry.handle);
  entry.done = true;
  entry.handle = 0;
  void ring();
  notify(key);
}

export function remainingSeconds(key, now = Date.now()) {
  const entry = timers.get(key);
  if (!entry || entry.done) return 0;
  if (entry.remaining != null) return entry.remaining;
  return Math.max(0, (entry.endAt - now) / 1000);
}

// Persist data only: timeout handles belong to this document.
function persistTimers() {
  try {
    localStorage.setItem(TIMERS_KEY, JSON.stringify({
      timers: [...timers].map(([key, { endAt, remaining, total, done }]) => [key, { endAt, remaining, total, done }]),
      chosen: [...chosen],
    }));
  } catch { /* Storage can be unavailable; timers still work this visit. */ }
}

function schedule(key, entry, now = Date.now()) {
  clearTimeout(entry.handle);
  entry.handle = setTimeout(() => {
    if (entry.endAt <= Date.now()) finishTimer(key);
    else schedule(key, entry);
  }, Math.min(2147483647, Math.max(0, entry.endAt - now)));
}

export function pauseTimer(key, now = Date.now()) {
  const entry = timers.get(key);
  if (!entry || entry.done || entry.remaining != null) return;
  if (entry.endAt <= now) return finishTimer(key);
  entry.remaining = (entry.endAt - now) / 1000;
  clearTimeout(entry.handle);
  entry.handle = 0;
  notify(key);
}

export function resumeTimer(key, now = Date.now()) {
  const entry = timers.get(key);
  if (!entry || entry.done || entry.remaining == null) return;
  entry.endAt = now + entry.remaining * 1000;
  delete entry.remaining;
  schedule(key, entry, now);
  notify(key);
}

function restoreTimers() {
  try {
    const saved = JSON.parse(localStorage.getItem(TIMERS_KEY));
    if (!saved || !Array.isArray(saved.timers)) return;
    const now = Date.now();
    for (const row of saved.timers) {
      if (!Array.isArray(row)) continue;
      const [key, data] = row;
      if (typeof key !== 'string' || !data || !Number.isFinite(data.total) || data.total <= 0 ||
          !Number.isFinite(data.endAt) || typeof data.done !== 'boolean' ||
          (data.remaining != null && (!Number.isFinite(data.remaining) || data.remaining <= 0))) continue;
      const entry = { ...data, done: data.done || (data.remaining == null && data.endAt <= now), handle: 0 };
      timers.set(key, entry);
      if (!entry.done && entry.remaining == null) schedule(key, entry, now);
    }
    for (const row of Array.isArray(saved.chosen) ? saved.chosen : []) {
      if (Array.isArray(row) && typeof row[0] === 'string' && Number.isFinite(row[1]) && row[1] >= MIN_SECONDS) chosen.set(...row);
    }
    persistTimers();
  } catch { /* Ignore malformed or inaccessible storage. */ }
}

restoreTimers();
if (typeof document !== 'undefined') {
  const reconcile = () => {
    if (document.visibilityState !== 'visible') return;
    for (const [key, entry] of timers) {
      if (!entry.done && entry.remaining == null && entry.endAt <= Date.now()) finishTimer(key);
    }
  };
  document.addEventListener('visibilitychange', reconcile);
  window.addEventListener('pageshow', reconcile);
}
