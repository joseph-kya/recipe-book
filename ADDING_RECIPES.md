# Adding a Recipe

Adding a recipe takes two files and zero code edits:

1. Drop the recipe JSON into `content/recipes/<slug>.json`.
2. Drop its printable sheet into `content/pdfs/<slug>.pdf`.
3. Run `npm test && npm run build`.

Everything else — book numbering, routing, portion scaling chips, step timers, PDF download link, and service worker precaching — is wired automatically at build time.

## Minimal JSON

Only `en.title`, `en.groups`, and `en.steps` are required. If `slug` is omitted, it is derived from the filename.

```json
{
  "slug": "apple-crumble",
  "route": "apple-crumble",
  "number": 7,
  "source": {
    "site": "Source Name",
    "author": "Author Name",
    "url": "https://example.com/apple-crumble"
  },
  "en": {
    "title": "Apple Crumble",
    "tagline": "Warm spiced apples under a buttery oat topping.",
    "stats": [
      { "value": "35 min", "label": "at 180 °C" },
      { "value": "4", "label": "portions" }
    ],
    "equipment": "Baking dish, mixing bowl.",
    "groups": [
      {
        "title": "Filling",
        "items": [
          { "amount": "2 cups", "metric": "250 g", "name": "apples", "note": "peeled and sliced" }
        ]
      }
    ],
    "steps": [
      { "title": "Bake.", "text": "Bake 35 min at 180 °C until bubbling.", "cue": "Golden on top." }
    ],
    "tips": [
      { "title": "Serve warm.", "text": "Best straight from the dish with vanilla ice cream." }
    ]
  }
}
```

## Optional Extras

- **Ordering**: Set `"number"` to control position in the book; displayed numbers are always contiguous `1, 2, 3…`. Unnumbered recipes sort alphabetically at the end.
- **Translations (`de`, `fr`)**: Add `"de"` and `"fr"` blocks matching the `"en"` shape (and `"amounts_credit"` if you include conversion notes). `npm test` checks all committed recipes for complete German and French translations and matching step timers. An English-only recipe still renders in dev/preview with a fallback note.
- **Metric PDF**: Drop `content/pdfs/<slug>.grams.pdf` and it links automatically when the user toggles to grams.
- **Photo**: Drop `public/photos/<slug>-400.webp` and `public/photos/<slug>-800.webp` (auto-detected), or add an entry with credit in `content/photos.json` (or inline `"photo"` in the recipe JSON).
- **Nutrition / Macros**: Add an entry under `recipes.<slug>` in `content/nutrition.json` (or inline `"nutrition"` in the recipe JSON). Unused USDA breakdown fields are stripped automatically during build.
- **Scaling & Timers**: Amounts like `1 cup + 1½ tsp`, `175 g`, `10–20 ml`, or `4` scale automatically; offered portion chips are precomputed at build time. Step durations like `20–25 min` or `1 hour` automatically get tap-to-start timers.
