// Tiny always-loaded sign-in state. Firebase itself lives in ./sync.js and is
// only fetched when someone taps "sign in" (or presses/focuses it first), or
// in the background after page load when this device already has a session.
import { applyFavState, getFavState, subscribeFav } from '../fav.js';
import { PROFILE_KEY, REDIRECT_KEY, authEnabled, firebaseConfig } from './config.js';

const listeners = new Set();
let mod = null;
let loading = null;

// Read (value undefined), write (string) or remove (null) a localStorage key.
function store(key, value) {
  try {
    const ls = localStorage;
    if (value === undefined) return ls.getItem(key);
    if (value === null) ls.removeItem(key);
    else ls.setItem(key, value);
  } catch {
    /* storage blocked: sign-in still works for this visit */
  }
  return null;
}

let cached = null;
try {
  cached = authEnabled ? JSON.parse(store(PROFILE_KEY) || 'null') : null;
} catch {
  /* malformed cache: treat as signed out */
}

// status: 'out' | 'busy' | 'in'; sync: '' | 'syncing' | 'synced' | 'offline' | 'error'
// note: '' | 'signInError' | 'signedOut' (one-off message for the entry)
let state = { status: cached ? 'in' : 'out', profile: cached, sync: '', note: '' };

function set(patch) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn();
}

export const getSession = () => state;

export function subscribeSession(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const handlers = {
  onUser(profile) {
    store(PROFILE_KEY, profile ? JSON.stringify(profile) : null);
    set(profile ? { status: 'in', profile, note: '' } : { status: 'out', profile: null, sync: '' });
  },
  onSync: (sync) => set({ sync }),
  onError: () => set({ status: state.profile ? 'in' : 'out', note: 'signInError' }),
};

export function loadSync() {
  loading ||= import('./sync.js').then((m) => {
    m.start(firebaseConfig, handlers, { applyFavState, getFavState, subscribeFav, redirectKey: REDIRECT_KEY });
    return (mod = m);
  });
  loading.catch(() => (loading = null)); // offline on first try: allow a retry
  return loading;
}

// Warm the chunk on pointerdown/focus so the popup can still open inside the
// tap's user gesture (Safari blocks popups opened after an async gap).
export const prefetchSync = () => loadSync().catch(() => {});

export function signIn() {
  if (state.status === 'busy') return;
  set({ status: 'busy', note: '' });
  (mod ? mod.signIn() : loadSync().then((m) => m.signIn())).then(
    (cred) => !cred && state.status === 'busy' && set({ status: 'out' }),
    () => set({ status: 'out', note: 'signInError' }),
  );
}

// Signing out only stops syncing: this device keeps its favorites and counts.
export function signOut() {
  store(PROFILE_KEY, null);
  set({ status: 'out', profile: null, sync: '', note: 'signedOut' });
  loading?.then((m) => m.signOut()).catch(() => {});
}

// Returning signed-in visitor: bring Firebase up quietly once the page is idle,
// never competing with first paint. A pending redirect needs it straight away.
if (authEnabled && typeof window !== 'undefined') {
  if (store(REDIRECT_KEY)) {
    set({ status: 'busy' });
    loadSync().catch(() => set({ status: 'out' }));
  } else if (cached) {
    const start = () => loadSync().catch(() => set({ sync: 'offline' }));
    const later = () =>
      window.requestIdleCallback ? requestIdleCallback(start, { timeout: 5000 }) : setTimeout(start, 2000);
    if (document.readyState === 'complete') later();
    else addEventListener('load', later, { once: true });
  }
}
