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

const timers = new Map(); // key -> { endAt, total, done, handle }
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
    const left = Math.max(0, (entry.endAt - now) / 1000);
    const next = Math.max(MIN_SECONDS, left + delta);
    entry.endAt = now + next * 1000;
    entry.total = Math.max(MIN_SECONDS, entry.total + (next - left));
    clearTimeout(entry.handle);
    if (typeof setTimeout === 'function') entry.handle = setTimeout(() => finishTimer(key), next * 1000);
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
  if (typeof setTimeout === 'function') {
    entry.handle = setTimeout(() => finishTimer(key), seconds * 1000);
  }
  timers.set(key, entry);
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
  ring();
  notify(key);
}

export function remainingSeconds(key, now = Date.now()) {
  const entry = timers.get(key);
  if (!entry) return 0;
  return Math.max(0, (entry.endAt - now) / 1000);
}

// --- the ding ------------------------------------------------------------

let audio;

// Call from a user gesture so the browser lets the context play later.
export function primeAudio() {
  if (typeof AudioContext !== 'function') return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    /* no audio: the timer still shows done */
  }
}

function ring() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([120, 80, 120]);
  if (!audio || audio.state !== 'running') return;
  const t0 = audio.currentTime;
  for (const [freq, at] of [[1320, 0], [1760, 0.18]]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + at);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.9);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0 + at);
    osc.stop(t0 + at + 1);
  }
}
