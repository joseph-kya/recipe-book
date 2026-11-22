const PREFIX = 'recipe-book:';

// Mirrors src/auth/config.js while staying safe to import in bare Node tests
// where Vite's import.meta.env is undefined.
const authEnabled = Boolean(
  typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID,
);

let sessionMod = null;
const sessionReady = authEnabled
  ? import('./auth/session.js')
      .then((m) => {
        sessionMod = m;
        return m;
      })
      .catch(() => null)
  : null;

// Every localStorage key owned by the recipe book on this device.
export function deviceKeys(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return [];
  const keys = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (typeof key === 'string' && key.startsWith(PREFIX)) keys.push(key);
    }
  } catch {
    /* storage blocked */
  }
  return keys;
}

function wipeLocalKeys() {
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : null;
    for (const key of deviceKeys(storage)) {
      storage.removeItem(key);
    }
  } catch {
    /* storage blocked */
  }
}

// Sign out if signed in (account data in the cloud stays untouched), wipe all
// local recipe-book:* keys, and reload into a clean default state.
export function clearDeviceData({ reload = true } = {}) {
  const finish = () => {
    wipeLocalKeys();
    if (reload && typeof location !== 'undefined') {
      location.reload();
    }
  };

  if (authEnabled) {
    if (sessionMod) {
      if (sessionMod.getSession().status === 'in') sessionMod.signOut();
      finish();
      return;
    }
    sessionReady?.then((m) => {
      if (m && m.getSession().status === 'in') m.signOut();
      finish();
    });
    return;
  }

  finish();
}
