# Sign in with Google: setup

The book can sync your favorites (hearts) and "baked it" counts across devices
with Firebase Auth (Google) and Cloud Firestore. Both are free on the
**Spark** plan, so you don't need a credit card.

Until the four `VITE_FIREBASE_*` values are set at build time, the site builds
**without** sign-in. The button is hidden, Firebase is left out of the
build, and favorites and counts stay in this browser's localStorage, as they
do today.

Nothing here is created for you. Do these steps once in the Firebase console.

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> and click **Create a project**
   (or **Add project**).
2. Name it, for example `recipe-book`. Turn **Google Analytics off**. The book
   doesn't need it, and leaving it off keeps the setup smaller.
3. Make sure the project stays on the **Spark (no-cost)** plan. Don't upgrade.

## 2. Register a web app and copy its config

1. In the project overview, click the **Web** icon (`</>`), name it
   `recipe-book-web`, and leave **Firebase Hosting unticked** (GitHub Pages hosts the site).
2. Firebase shows a `firebaseConfig` object. You only need four of its values:

   | firebaseConfig key | env var                      |
   | ------------------ | ---------------------------- |
   | `apiKey`           | `VITE_FIREBASE_API_KEY`      |
   | `authDomain`       | `VITE_FIREBASE_AUTH_DOMAIN`  |
   | `projectId`        | `VITE_FIREBASE_PROJECT_ID`   |
   | `appId`            | `VITE_FIREBASE_APP_ID`       |

   You can find them again later under **Project settings → General → Your apps**.

These values are public identifiers, not secrets. They end up in the shipped
JavaScript, as Firebase intends. Your data is protected by the Firestore rules
(step 5) and the authorized-domains list (step 3).

## 3. Turn on Google sign-in and authorize the domain

1. Go to **Build → Authentication → Get started**.
2. On the **Sign-in method** tab, choose **Google**, toggle it **Enable**, pick
   your support email, and click **Save**.
3. On the **Settings** tab, open **Authorized domains**, click **Add domain**,
   and add:
   - `joseph-kya.github.io`

   `localhost` is already listed, so `npm run dev` works too.

## 4. Create the Firestore database

1. Go to **Build → Firestore Database → Create database**.
2. Choose a location close to you, for example `eur3 (europe-west)`. You can't
   change it later.
3. Start in **production mode**. The rules come next.

## 5. Paste the security rules

1. In **Firestore Database → Rules**, replace everything with the contents of
   [`firestore.rules`](firestore.rules) from this repo.
2. Click **Publish**.

These rules let each signed-in user read and write only their own
`users/{uid}` document, check its shape and size, and deny access to
everything else.

> **Profiles update: republish the rules.** The "who's baking?" profiles
> changed the doc shape (up to six profiles in one `users/{uid}` doc). Paste
> the current [`firestore.rules`](firestore.rules) and click **Publish** again
> *before* deploying that build, or every sync fails with "Not synced". The
> new rules still accept docs written by the previous version, so nothing
> needs migrating by hand.

## 6. Put the config into the build

### Local builds (`npm run build`, `npm run deploy`)

```sh
cp .env.example .env
# then fill in the four values in .env
npm run build
```

`.env` is git-ignored, so never commit it.

### GitHub Actions builds (if you add one later)

Under **GitHub repo → Settings → Secrets and variables → Actions → Variables**,
add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
`VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID`, then pass them to the
build step:

```yaml
- run: npm run build
  env:
    VITE_FIREBASE_API_KEY: ${{ vars.VITE_FIREBASE_API_KEY }}
    VITE_FIREBASE_AUTH_DOMAIN: ${{ vars.VITE_FIREBASE_AUTH_DOMAIN }}
    VITE_FIREBASE_PROJECT_ID: ${{ vars.VITE_FIREBASE_PROJECT_ID }}
    VITE_FIREBASE_APP_ID: ${{ vars.VITE_FIREBASE_APP_ID }}
```

## 7. Rebuild and deploy

Run `npm run build` (or `npm run deploy`) with the values set, then publish as
usual. After the service worker updates, the Contents page shows a quiet
**Sign in to sync** link. On a wide screen it sits under the service bell. On
a phone it sits at the end of the recipe list.

## How it behaves

- **Performance:** the initial bundle only contains a ~2 kB gzip stub. The
  Firebase chunk (~63 kB gzip: Auth plus Firestore *Lite*) loads only when
  someone taps **Sign in** (it starts warming on press or focus), or in the
  background after page load on a device that is already signed in.
- **Offline:** localStorage stays the source of truth. Taps work offline and
  sync the next time the device is online, when the tab is reopened, or about
  a second after a change.
- **Merging:** on sign-in, this device and the cloud are merged. Favorites
  combine (union) and baked counts take the higher number. Deliberate changes
  win when they are newer: removing a heart, resetting a count, undo, and
  hold-to-undo are timestamped, so they don't get "re-added" by another device.
- **Profiles ("who's baking?"):** each profile has its own hearts and baked
  counts, and the merge above runs per profile. Everything the book stored
  before profiles moves into a default profile (named after your Google first
  name, or "Me"). Renames sync (newest wins) and deleted profiles stay deleted
  on every device. Which profile is active is remembered per device and never
  synced. Up to six profiles fit in the cloud doc. An app version from before
  profiles can't overwrite a doc that has profiles (the rules refuse it), so
  that version shows "Not synced" until its service worker updates.
- **Sign out** only stops syncing. This device keeps its favorites and counts.
- **iOS Safari:** sign-in uses a popup. If the browser blocks it, the book
  falls back to a full-page redirect. Safari's tracking prevention can break
  that redirect when `authDomain` is `*.firebaseapp.com`, so the popup is the
  reliable path. If redirect sign-in fails on an iPhone or iPad, tap again
  and allow the popup.
- **Service worker:** the precache step in `vite.config.js` adds every built
  file to the offline cache, including the Firebase chunk once it exists.
  That chunk is then downloaded in the background on service-worker install,
  even for people who never sign in. If that cost matters for old iPads,
  exclude `assets/sync-*.js` from `PRECACHE_URLS`. It is still cached on first
  use.
