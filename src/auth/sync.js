// Lazily loaded chunk: Firebase Auth (Google) + Firestore Lite sync of
// favorites and baked counts to users/{uid}. Never imported statically.
//
// localStorage (src/fav.js) stays the source of truth. Each sync runs a small
// transaction: read the cloud doc, merge it with this device (merge.js),
// write the result back if it changed, then apply it locally. Syncs run on
// sign-in, ~1s after any local change, when the tab becomes visible again and
// when the device comes back online. Firestore Lite (REST, no offline cache,
// no live listener) keeps this chunk small for older iPads.
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getRedirectResult,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getFirestore, runTransaction } from 'firebase/firestore/lite';
import { fromCloudDoc, mergeFavStates, sameFavState, toCloudDoc } from './merge.js';

// fav.js and the storage keys are handed in by session.js (instead of
// imported) so this chunk shares no modules with the main bundle and Rollup
// doesn't split a shared chunk out of the initial load.
let applyFavState, getFavState, subscribeFav, REDIRECT_KEY;

const CHANGE_DELAY_MS = 1000;
const VISIBLE_RESYNC_MS = 20000;
const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);
const NEEDS_REDIRECT = new Set(['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment']);

let auth = null;
let db = null;
let handlers = null;
let user = null;
let timer = 0;
let running = false;
let again = false;
let applying = false;
let lastSync = 0;
let detach = null;

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

function profileOf(u) {
  const name = u.displayName || u.email || '';
  return { name, photo: u.photoURL || '', initial: (name.trim()[0] || '•').toUpperCase() };
}

function clearRedirectFlag() {
  try {
    localStorage.removeItem(REDIRECT_KEY);
  } catch {
    /* ignore */
  }
}

function schedule(ms) {
  clearTimeout(timer);
  timer = setTimeout(syncNow, ms);
}

async function syncNow() {
  clearTimeout(timer);
  if (!user) return;
  if (running) {
    again = true;
    return;
  }
  if (isOffline()) {
    handlers.onSync('offline');
    return;
  }
  running = true;
  handlers.onSync('syncing');
  const uid = user.uid;
  try {
    const ref = doc(db, 'users', uid);
    const merged = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const remote = snap.exists() ? fromCloudDoc(snap.data()) : null;
      const next = mergeFavStates(getFavState(), remote || {});
      if (!remote || !sameFavState(next, remote)) tx.set(ref, toCloudDoc(next));
      return next;
    });
    if (!user || user.uid !== uid) return;
    // Fold in anything tapped while the request was in flight.
    const local = getFavState();
    const next = mergeFavStates(local, merged);
    if (!sameFavState(next, local)) {
      applying = true;
      try {
        applyFavState(next);
      } finally {
        applying = false;
      }
    }
    if (!sameFavState(next, merged)) again = true;
    lastSync = Date.now();
    handlers.onSync('synced');
  } catch (err) {
    handlers.onSync(isOffline() || err?.code === 'unavailable' ? 'offline' : 'error');
  } finally {
    running = false;
    if (again) {
      again = false;
      schedule(300);
    }
  }
}

function attach() {
  const offFav = subscribeFav(() => {
    if (!applying) schedule(CHANGE_DELAY_MS);
  });
  const onVisible = () => {
    if (document.visibilityState === 'visible' && Date.now() - lastSync > VISIBLE_RESYNC_MS) syncNow();
  };
  const onOnline = () => syncNow();
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  return () => {
    offFav();
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
    clearTimeout(timer);
  };
}

export function start(config, h, deps) {
  handlers = h;
  ({ applyFavState, getFavState, subscribeFav, redirectKey: REDIRECT_KEY } = deps);
  const app = initializeApp(config);
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  db = getFirestore(app);

  let redirectPending = false;
  try {
    redirectPending = Boolean(localStorage.getItem(REDIRECT_KEY));
  } catch {
    /* ignore */
  }
  if (redirectPending) {
    clearRedirectFlag();
    getRedirectResult(auth).catch((err) => {
      if (!CANCELLED.has(err?.code)) handlers.onError(err);
    });
  }

  onAuthStateChanged(auth, (u) => {
    const sameUser = Boolean(u && user && u.uid === user.uid);
    user = u;
    handlers.onUser(u ? profileOf(u) : null);
    if (u && !sameUser) {
      detach?.();
      detach = attach();
      syncNow();
    } else if (!u) {
      detach?.();
      detach = null;
    }
  });
}

function provider() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
}

// Popup first (must run inside the tap's user gesture), full-page redirect
// when the browser blocks popups or can't do them (some iOS Safari setups).
export function signIn() {
  return signInWithPopup(auth, provider()).catch((err) => {
    if (CANCELLED.has(err?.code)) return null;
    if (NEEDS_REDIRECT.has(err?.code)) {
      try {
        localStorage.setItem(REDIRECT_KEY, '1');
      } catch {
        /* ignore */
      }
      return signInWithRedirect(auth, provider()).then(() => null);
    }
    throw err;
  });
}

// Signing out only stops syncing: this device keeps its favorites and counts.
export function signOut() {
  detach?.();
  detach = null;
  user = null;
  return firebaseSignOut(auth).catch(() => {});
}
