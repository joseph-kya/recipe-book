# Bugs Found and Fixed (`more-bugs`)

End-to-end Playwright testing at `390x844` (mobile) and `1440x900` (desktop) across EN, DE, and FR uncovered four real bugs. Each was fixed with the smallest possible change and covered by regression checks in `scripts/e2e.test.mjs`.

## 1. Fresh German loads double-counted total time on recipes with a `"gesamt"` total stat
- **File:** `src/recipeMeta.js`
- **Symptom:** Opening `#/r/protein-cloud-cheesecake` directly in German (`de`) displayed `~2 h 10 min` in the at-a-glance stub instead of `~1 h 15 min` (summing the `~1 h 15 min` total stat together with the `10 + 45 min` oven stat).
- **Root cause:** Because recipe language chunks are lazy-loaded, a fresh German visit leaves `recipe.en` undefined and `computeTotalTime()` falls back to `recipe.de.stats`. `TOTAL_LABEL` matched only `/\btotal\b/i` (English `"total"` and French `"au total"`), missing German `"gesamt"`.
- **Fix:** Extended `TOTAL_LABEL` to `/\b(?:total|gesamt)\b/i`.

## 2. English step timer missed `"2 more hours"` on Fudge Brownies step 5
- **File:** `src/timer.js`
- **Symptom:** Step 5 of Fudge Brownies rendered a 2-hour timer in German (`2 Stunden`) and French (`2 heures`), but no timer at all in English (`"Chill for 2 more hours..."`), causing the timer to disappear when switching to English.
- **Root cause:** `DURATION` required the time unit immediately after the number or range, failing when English phrased it as `2 more hours`.
- **Fix:** Allowed an optional `(?:more\s+)?` modifier between the quantity and unit in `DURATION` and stripped `"more "` from the rendered button label (`2 hours`), achieving full step-timer parity across EN, DE, and FR.

## 3. Rapid consecutive page turns dropped clicks and hash navigation started duplicate springs
- **File:** `src/Book.jsx`
- **Symptom:** Quickly clicking Next twice from the cover (`detail: 1`) stopped on `#/contents` instead of reaching `#/r/fudge-brownies`, and quickly clicking Prev twice from `#/r/fudge-brownies` stopped on `#/contents` instead of returning to `#/`. Hash link clicks (`Open`, `Contents`, `Surprise me`) firing both `popstate` and `hashchange` before `useLayoutEffect` also triggered a premature spring before turning faces mounted.
- **Root cause:** `navigate()` set `s.pendingTarget` when starting a new spring turn without updating `s.target` (which `destination()` and `finishNow()` read), and `runSpring()` did not clear `s.pendingTarget` when retargeting.
- **Fix:** Synchronized `s.target = t > k ? 1 : 0` alongside `s.pendingTarget = s.target` in `navigate()`, and cleared `s.pendingTarget = null` inside `runSpring()`.

## 4. Contents search missed English recipe names on fresh German and French loads
- **File:** `src/contents-find.js`
- **Symptom:** Searching `"cinnamon"` or `"cheesecake"` in `#/contents` returned 0 results on a fresh German or French load, then started matching only after switching to English once.
- **Root cause:** `filterRecipes()` included `recipe.en?.title` in the search haystack, which is `undefined` until the English chunk is loaded.
- **Fix:** Fell back to the base recipe's `slug` and `route` tokens (`[recipe.slug, recipe.route].filter(Boolean).join(' ').replace(/-/g, ' ')`) when `recipe.en?.title` is not loaded yet.
