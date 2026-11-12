# Joseph's Recipe Book

Joseph's baking recipes as a book you flip through. Cups and spoons come first, grams sit beside them, and every recipe has a printable PDF sheet. Static site: Vite + React, no backend, no router library, no external requests.

## Run it

```bash
npm install
npm run dev       # local dev server
npm run build     # static build into dist/
npm run preview   # serve dist/ locally
```

`dist/` works from any static host or subfolder (`base: './'`).

## Using the book

- **Routes:** `#/` cover, `#/contents`, then one per recipe: `#/brownies`, `#/cinnamon-rolls`, `#/cheesecake`, `#/topfenschmarren`, `#/quark-bake`. Browser back/forward turns the pages.
- **Turning:** swipe (the page follows your finger; a flick is enough), ← / → keys, or the arrow buttons. A turn can be caught and reversed mid-flight.
- **Phone:** one scrolling page per recipe. **Wide screens (≥ 960 px):** an open book with two-page spreads; the closed book sits centred on its cover. Book pages never scroll: `src/paginate.js` measures the real rendered blocks and runs each recipe over as many spreads as it needs (never splitting an ingredient row, step or tip card), and re-paginates on resize and language change. `#/brownies` always opens a recipe's first spread; Back steps through its spreads.
- **Reduced motion:** no flip, a 200 ms crossfade instead.
- **EN / DE:** the toggle translates all UI text and is remembered in `localStorage`. Recipe text switches only where the JSON has a `de` block. Otherwise the English recipe shows with a short note saying so. Nothing is machine-translated.

## Add a recipe

1. Drop `content/recipes/<slug>.json` in place.
2. Drop its sheet at `content/pdfs/<slug>.pdf` (same `slug`).
3. `npm run build`. Done.

No code or index file needs editing. `src/content.js` picks up both folders with `import.meta.glob` and orders recipes by their JSON `number`. The number shown in the book is the recipe's position (1, 2, 3…), so new or removed recipes never leave a gap: give a new recipe any `number` that sorts it where you want it.

### JSON shape

```jsonc
{
  "slug": "fudge-brownies",          // matches the PDF file name
  "route": "brownies",               // optional short URL (#/brownies); falls back to slug
  "number": 1,                       // sort order only; the book numbers recipes 1, 2, 3… by position
  "source": { "site": "…", "author": "…", "url": "https://…" },
  "conversions": "…",                // optional, shown small
  "amounts_credit": { "en": { "label": "…", "src": "…" } },  // optional, shown small
  "en": {                            // required
    "title": "Fudge Brownies",
    "title_lines": ["Fudge", "Brownies"],   // how the display title breaks
    "tagline": "…",
    "sticker": ["No scale.", "No problem."], // used by the PDF sheet; not shown on the site
    "intro": "…",
    "stats": [{ "value": "30 min", "label": "prep" }],
    "equipment": "…",
    "ingredients_headline": "The good stuff",
    "groups": [
      {
        "title": null,                       // or "The dough"
        "items": [
          { "amount": "1 cup + 1½ tsp", "metric": "175 g", "name": "…", "note": "…or null" }
        ]
      }
    ],
    "method_headline": "Let's make a mess.",
    "steps": [{ "title": "…", "text": "…", "cue": "…" }],
    "tips": [{ "title": "…", "text": "…" }]
  },
  "de": { /* optional, same shape as "en" */ }
}
```

`amount` is the cups-and-spoons figure and is set large. `metric` is set small beneath it and is hidden when it's empty or identical to `amount`.

## Design

Retro Diner, translated from `design-ref/diner.html` (the print template behind the PDFs): cream pages, chocolate rules, mint menu card with a hard drop shadow, mustard step dots, tilted tip cards and checkers. Colours: cherry `#C8233A`, mint `#A8DCCB`, mustard `#F2B134`, choc `#3A2216`, cream `#FFF4DF`. Two darker cherries are used for small text where contrast needs it: `#A11B2E` on mint, `#8E1626` on mustard. Fonts are self-hosted WOFF2 (OFL) from `assets/fonts/`: Shrikhand for display, Lilita One for badges, heads and amounts, Kalam for handwritten lines, Nunito for body text.

**Reference DESIGN.md:** Starbucks, from the awesome-design-md catalogue. It's a warm food-and-drink brand on a cream ground, with strict colour roles and three type voices that each keep to their own job (it even uses Kalam for handwritten touches), plus a pill button that presses with a scale. I borrowed that discipline and none of the brand.

The page turn is hand-written: every page is its own element rotating around the spine with `transform` and `opacity` only. A critically damped spring (response 0.42 s, so a turn takes about 450 ms) drives it from the live position and velocity. That's why turns can be interrupted, and why a flick carries its momentum into the turn.
