# Settings: vision

One sheet that holds what you set once and forget. Each setting has to earn
its place: it must already exist somewhere in the app (and be scattered or
hidden today), or be trivial and clearly useful. No new recipe content.

## Where it lives

Settings is a **sheet**, not a page of the book. It never enters the spread
list, the page count, prev/next or the URL, so reading and paginating stay as
they are. Bottom sheet on phones, centred card on wide screens: the same frame
as the feedback sheet (`src/auth/feedback.css`), so the app has one sheet language.

Two ways in, both open the same sheet:

1. **The control bar (inside the book).** The language button `EN/DE/FR`
   leaves the bar and a Settings button (sliders icon) takes its slot.
   Language is set once; it belongs in Settings. The bar keeps what you touch
   mid-recipe: Contents, units (cups/g) and keep-awake. The bar does not grow.
2. **Contents.** The quiet "Sign in to sync" and the two feedback buttons
   leave Contents. One quiet entry takes their place: **Settings**, with a
   small handwritten hint underneath ("Language, colours, sync"). Phones: under
   the list (where sync/feedback were). Wide: on the left page, under the
   who's-baking switcher (where sync/feedback were). The who's-baking
   switcher stays on Contents: you use it every bake.

```
 390px, sheet open                       control bar (phone)
 ┌──────────────────────────────┐        ┌──────────────────────────────┐
 │▚▚▚▚▚▚▚▚ cherry checkers ▚▚▚▚▚▚│        │ ‹  ☰  3/14  ⚙  cups  ☀    ›  │
 │ Settings                  ✕ │        └──────────────────────────────┘
 │                              │          ⚙ = sliders icon, was "EN"
 │ Language                     │
 │ ( English | Deutsch | Français )   segmented, mint track, cherry thumb
 │                              │
 │ Amounts                      │
 │ ( Cups & spoons |  Grams  )  │       segmented
 │                              │
 │ Colours                      │
 │  ●  ●  ●  ●  ●  ●            │       6 cover swatches, 44px, ✓ on current
 │  Cherry                      │       name of the current one, Kalam
 │                              │
 │ Keep the screen on      [━●] │       switch; hidden without Wake Lock
 │ While a recipe is open.      │
 │                              │
 │ Sync                         │       (only when sign-in is compiled in)
 │  [☁ Sign in with Google]     │       the existing SyncEntry
 │                              │
 │ Feedback                     │       (only when sign-in is compiled in)
 │  [Send feedback] [Suggest a recipe]   the existing FeedbackEntry
 │                              │
 │ This device                  │
 │  [Clear this device]         │       two-step inline confirm
 └──────────────────────────────┘
```

Left aligned throughout. Section headings in Lilita One (`--display-2` or the
token the app already uses for small display), body in Nunito, hints in Kalam
(`--hand`/cue colour). No section cards, no dividers: space separates sections
(`--sp-5` between, `--sp-2` heading→control). The sheet scrolls inside itself;
on a 390×844 phone everything up to "Keep the screen on" sits above the fold.

## Controls and their source of truth

| Control | Source of truth (existing) | Change needed |
| --- | --- | --- |
| Language: EN / DE / FR | `useLang()` in `src/i18n.js` via `App.jsx` → `Book` `setLang` (loads recipe text lazily) | Pass `lang`/`setLang` into the sheet from `Book.jsx` (use Book's `handleSetLang`). Remove `.lang-btn` from `Controls.jsx`. |
| Amounts: cups / grams | `useUnits()` in `src/units.js`, `'cups' \| 'metric'` | Same values; Book's `handleSetUnits`. Bar toggle stays. |
| Colours: 6 colourways | `src/theme.js` `THEME_IDS`, `useTheme()`; names `themeText[lang].names` (`src/theme-i18n.js`); colour = the `cover` token of each theme | `useTheme` becomes a shared store (`useSyncExternalStore`) so the cover cupcake and Settings never disagree. Cupcake tap still cycles. |
| Keep the screen on | `src/Awake.jsx` (`recipe-book:awake`, `canWake`) | Lift the on/off state into a module store; export `useAwake()` → `[on, setOn]` and `canWake`; `AwakeToggle` uses it so bar and sheet stay in sync. |
| Sync (sign in / out, status) | `src/auth/SyncEntry.jsx`, `session.js` | Rendered in the sheet instead of Contents. Renders nothing without Firebase config (unchanged). |
| Feedback / suggest a recipe | `src/auth/FeedbackEntry.jsx` | Rendered in the sheet instead of Contents. Its sheet opens on top of Settings. |
| Clear this device | localStorage keys `recipe-book:*` | New `src/clear-data.js`: `clearDeviceData()` signs out if signed in, removes every `recipe-book:` key, reloads. |

Deliberately left out: in-app reduced motion (the app already follows the OS
setting everywhere; a second switch would double the code paths), sound
mute (sounds only play on deliberate taps), profiles (stay on Contents),
version/about text (nothing true to say that isn't on the cover).

## Behaviour

- **Language** changes live: the sheet re-renders in the new language and
  stays open. The chips show each language in its own name (English,
  Deutsch, Français), with `lang` set on each chip.
- **Colours**: a tap applies the theme with the book's existing crossfade
  (`transition()` in `motion.js`); the name under the row updates and is
  announced (`aria-live="polite"`). Radiogroup semantics: one `role="radio"`
  per swatch, arrow keys move and select, `aria-checked`. The current swatch
  carries a cream check glyph (ink-coloured on Paper); no ring, no outline.
- **Segmented controls** are `role="radiogroup"` with `role="radio"` buttons
  (`aria-checked`), arrow keys move + select. Each chip ≥ 44px tall.
- **Switch**: `<button role="switch" aria-checked>`; the whole row (label +
  hint + switch) is the 44px+ target.
- **Clear this device**: first tap turns the button into a cherry
  "Clear everything" next to a "Keep it" text button and shows the hint
  line; "Keep it", Escape-free (Escape closes the sheet), or 6 s idle reverts.
  Second tap runs `clearDeviceData()`.
- **Sheet**: `role="dialog" aria-modal="true" aria-labelledby` title; focus
  moves to the close button on open, Tab is trapped, Escape closes (ignore an
  Escape whose `defaultPrevented` is set: the feedback sheet on top already
  handled it), tapping the scrim closes, focus returns to whichever trigger
  opened it. Body scroll stays where it was.

## Look (taste rules, hard)

Flat retro diner: `--paper` sheet, cherry checker band on top (the existing
`.checkers checkers--cherry`), choc ink. No outlines, rings, ribbons, paper
edges, chevrons, glows or shadows. Use theme tokens (`--primary`, `--card`,
`--accent`, `--ink`, `--ink-soft`, `--cue`, `--paper`, `--ground`) so all six
colourways look right; never hard-code cherry.

- Segmented track: `--card` (mint in Cherry) pill; thumb: `--primary` pill
  with `--paper` text; unselected text `--ink`. Radius `--r-pill`.
- Swatches: 44px circles filled with each theme's cover colour (literal hex
  from `THEMES[id].cover`; Paper's is near-white so it gets a `--card` fill
  ring-free backing disc 2px larger — a flat disc behind, not an outline).
- Switch: 52×32 pill, off `--card`, on `--primary`, knob `--paper` 24px.
- Clear button: text button in `--primary`; armed state solid `--primary`
  pill with `--paper` text.
- Focus: the book's shared keyboard-only focus style (`:focus-visible`),
  same as `.sync-btn`. Contrast: every pairing above is already AA in
  `scripts/theme.test.mjs`.

## Motion

| What | Purpose | Ingredients |
| --- | --- | --- |
| Sheet enter (phone) | spatial: comes from the bottom edge | `transform: translateY(100%)→0`, 300ms `cubic-bezier(0.32,0.72,0,1)`; scrim opacity 0→1 200ms `--ease-out` |
| Sheet exit (phone) | same path back | `translateY(100%)`, 200ms `--ease-out`; scrim fades 160ms |
| Sheet enter/exit (wide) | centred modal | `opacity 0, scale(.97)` → 1, 220ms `--ease-out`; exit 160ms |
| Segment thumb | state: the choice moves | thumb `transform: translateX()` 220ms `cubic-bezier(0.23,1,0.32,1)`; CSS transition (interruptible) |
| Switch knob | state | knob `translateX` 180ms same curve; track colour 180ms `ease` |
| Press on every chip/swatch/button | feedback | `:active { transform: scale(.97) }` 120ms |
| Theme change | prevent jarring change | existing `transition()` crossfade |
| Clear armed | state | colour 160ms `ease`; no movement |

Hover effects only inside `@media (hover: hover) and (pointer: fine)`.
`prefers-reduced-motion: reduce`: no transforms; sheet fades (opacity 160ms),
thumb and knob jump, colour transitions stay. Exit timers (≈240ms) still call
`onClose` when no animationend fires.

## Copy

Sentence case, plain verbs, du-form in German (Austrian: "Tasse", "Löffel";
no Prussianisms), French with a narrow-no-break space before `: ; ! ?` as
the app already does.

| key | EN | DE | FR |
| --- | --- | --- | --- |
| title | Settings | Einstellungen | Réglages |
| open | Settings | Einstellungen | Réglages |
| openHint | Language, colours, sync | Sprache, Farben, Sync | Langue, couleurs, synchro |
| close | Close settings | Einstellungen schließen | Fermer les réglages |
| language | Language | Sprache | Langue |
| amounts | Amounts | Mengen | Quantités |
| cups | Cups & spoons | Tassen & Löffel | Tasses et cuillères |
| grams | Grams | Gramm | Grammes |
| colours | Colours | Farben | Couleurs |
| awake | Keep the screen on | Bildschirm anlassen | Garder l’écran allumé |
| awakeHint | While you bake, your phone won’t dim. | Beim Backen wird dein Handy nicht dunkel. | Pendant que tu cuisines, l’écran reste allumé. |
| sync | Sync | Sync | Synchro |
| syncHint | Sign in to keep favourites and bakers on all your devices. | Melde dich an, damit Favoriten und Bäcker:innen auf all deinen Geräten bleiben. | Connecte-toi pour retrouver tes favoris et tes pâtissiers sur tous tes appareils. |
| feedback | Feedback | Feedback | Avis |
| device | This device | Dieses Gerät | Cet appareil |
| clear | Clear this device | Gerät zurücksetzen | Effacer cet appareil |
| clearHint | Removes favourites, ticked steps, timers, bakers and settings here. Nothing in your account is deleted. | Entfernt hier Favoriten, abgehakte Schritte, Timer, Bäcker:innen und Einstellungen. In deinem Konto wird nichts gelöscht. | Supprime ici favoris, étapes cochées, minuteurs, pâtissiers et réglages. Rien n’est supprimé de ton compte. |
| clearConfirm | Clear everything | Alles löschen | Tout effacer |
| clearCancel | Keep it | Behalten | Garder |
| themeNow(name) | Colours: {name} | Farben: {name} | Couleurs : {name} |

French uses "tu" as the rest of the app does (check `src/i18n.js` and match
whichever form it uses; if it uses "vous", convert these lines to "vous").
Language chip names are endonyms in every language: English, Deutsch, Français.

## Code contracts (so slices can work in parallel)

- `src/settings-store.js` (slice A):
  `openSettings(triggerEl?)`, `closeSettings()`, `subscribeSettings(fn) → unsubscribe`,
  `getSettingsOpen() → boolean`, `useSettingsOpen() → boolean`,
  `settingsTrigger() → Element|null` (the element to refocus).
- `src/Settings.jsx` (slice A), lazy-loaded, default export
  `SettingsSheet({ lang, setLang, units, setUnits, onClose })`. Portal to
  `document.body`, dialog frame, focus trap, Escape, scrim, close button,
  title; body is `<SettingsSections lang setLang units setUnits />`.
  CSS in `src/settings.css` (frame + motion only).
- `src/SettingsSections.jsx` (slice B), named export
  `SettingsSections({ lang, setLang, units, setUnits })`; CSS in
  `src/settings-sections.css`, imported by that file.
- `src/settings-i18n.js` (slice C): `export const settingsText = { en, de, fr }`
  with every key in the copy table (`themeNow` is a function), and
  `export function settingsCopyFor(lang)` falling back to `en`.
- `src/theme.js` (slice B): `useTheme()` keeps its signature `[theme, setTheme]`, now shared.
- `src/Awake.jsx` (slice B): `export { canWake, useAwake }`, `AwakeToggle` unchanged outside.
- `src/clear-data.js` (slice B): `export function clearDeviceData({ reload = true } = {})`
  and `export function deviceKeys(storage = localStorage) → string[]`.

## Done when

- [ ] Settings opens from the control bar (phone and wide) and from Contents
      (phone list and wide left page), and closes by ✕, Escape, scrim tap.
- [ ] `.lang-btn` is gone from the bar; language is changed in Settings and the
      book re-renders in that language with the sheet still open.
- [ ] Units chosen in Settings and in the bar always agree.
- [ ] Colour chosen in Settings and by the cover cupcake always agree.
- [ ] Keep-awake switch and the bar's sun always agree; switch hidden without Wake Lock.
- [ ] Sync and Feedback appear only in Settings, and only with Firebase config.
- [ ] Clear this device needs two taps, then the app reloads clean.
- [ ] All targets ≥ 44px; keyboard: Tab order sane, arrows in radiogroups,
      focus returns to the trigger; axe clean at 390 and 1440.
- [ ] Reduced motion: no transforms, fades only.
- [ ] No outlines/rings/ribbons/chevrons/glows/shadows; theme tokens only.
- [ ] EN/DE/FR copy complete (settings-i18n test checks key parity).
- [ ] `npm test && npm run build` pass.
