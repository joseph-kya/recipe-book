// Firebase web config from Vite env vars (see .env.example / AUTH_SETUP.md).
// These are public identifiers, not secrets: access is enforced by
// firestore.rules and the authorized-domains list in the Firebase console.
// When any value is missing the whole sign-in feature is compiled out.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const authEnabled = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID
);

// Cached signed-in profile (doubles as the "has a session" flag that lets us
// load Firebase in the background on the next visit) and the pending-redirect
// marker for the iOS Safari redirect fallback.
export const PROFILE_KEY = 'recipe-book:auth:v1';
export const REDIRECT_KEY = 'recipe-book:auth:redirect';
