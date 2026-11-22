# Simplicity Pass

Five small, subtractive visual changes to calm competing boxes, borders, and secondary metadata while keeping the retro diner aesthetic (colors, fonts, cupcake theme button, illustrations, hard-shadow cards, page-turn feel), EN/DE/FR copy, 44px touch targets, and all features intact.

1. **Quiet the recipe header Share button to match Favorite**
   - **Where:** `src/idea-share.css` (`.share-btn`, `.share-btn-face`, `.share-btn-icon`)
   - **What:** Removed the resting `2px solid` ring and cream fill on `.share-btn-face` so Share sits as a borderless icon in `--ink-soft` matching the Favorite heart beside it (retaining the 44×44px hit target, subtle hover tint, and inverted `--choc` pill only during the brief "copied/shared" confirmation).
   - **Why:** On narrow 390px recipe headers, the ringed Share circle was visually louder than the borderless Favorite heart right next to it and crowded the eyebrow row.

2. **Flatten the Ingredients "At a glance" box into an inline summary line**
   - **Where:** `src/Ingredients.jsx` (`RecipeGlance`), `src/recipe-reading.css` (`.recipe-glance*`)
   - **What:** Removed the full-width `2px` bordered cream box, dashed vertical divider, and decorative `.effort-dots` circles, rendering Total time and Effort as a clean inline typography row directly on the mint card.
   - **Why:** Stacking a bordered "At a glance" box directly above the bordered portion scaler chips put two loud cream boxes at the top of every Ingredients card before the first ingredient, and the three dots repeated what the effort label already stated.

3. **Hide the disabled Method reset button until a step is ticked, and remove extra left-accent bars**
   - **Where:** `src/styles.css` (`.cook-reset-btn:disabled`), `src/recipe-reading.css` (`.ticket .equipment`, `.ticket .step-body .cue`)
   - **What:** Hid `.cook-reset-btn:disabled` with `visibility: hidden` (preserving its pagination slot so desktop layouts never shift) until `doneCount > 0`, and removed the left-border callout bar/box from `.equipment` and the `2.5px` left bar from every `.cue`.
   - **Why:** A ghosted disabled circle button beside `Start cooking` added dead chrome before cooking starts (unlike Ingredients, which only shows clear-ticks after ticking). Dropping the extra vertical bars lets the handwritten Kalam cues speak for themselves and reserves the left accent bar strictly for the active `.step--current` highlight.

4. **Calm Cook Mode's header step counter and "Up next" strip**
   - **Where:** `src/cook.css` (`.cook-progress`, `.cook-upnext`, `.cook-upnext-time`)
   - **What:** Removed the mustard fill and `2px` border from `.cook-progress` so `Step X of Y` reads as quiet tabular text beside the title, and softened `.cook-upnext` into a borderless low-emphasis strip with plain tabular duration text (keeping its 44px touch target).
   - **Why:** In active cooking mode, the bordered mustard step badge duplicated the cherry progress bar directly below it, and the heavy bordered "Up next" card with its nested duration pill competed with the main step card.

5. **Tuck the USDA nutrition footnote beneath the Macros strip**
   - **Where:** `src/Macros.jsx`, `src/macros.css` (`.macros-note`)
   - **What:** Moved `t.macroNote` (`approx., USDA data` / `ca., USDA-Daten` / `env., données USDA`) out of `.macros-head` to a quiet footnote `<p className="macros-note">` directly below `.macros-strip`.
   - **Why:** Keeping three dot-separated clauses in `.macros-head` caused messy multi-line wrapping on 390px screens and gave a sourcing caveat the same prominence as the per-serving basis.
