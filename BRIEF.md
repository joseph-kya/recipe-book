# Brief: Bread Pitt's Recipe Book (v1)

You are building the first version of a mobile-first, book-like website of Joseph's baking recipes, in this folder (`~/code/recipe-book`). Work only inside this folder. Do not deploy, publish, push, add git remotes, or sign up for anything.

## Skills to use (by name)

Read and apply these installed skills before you design or write code:

- **frontend-design**: art direction, distinctive typography, no template look.
- **taste-skill** (`design-taste-frontend`): anti-slop art direction. Run its finish gate before you call it done.
- **awesome-design-md**: pick ONE reference `DESIGN.md` from its catalogue that fits a warm retro diner cookbook. Write which one you picked and why in a line in `README.md`. Borrow structure and discipline, not its brand; the brand is Retro Diner below.
- **apple-design**: fluid interfaces, HIG, Jobs simplicity. Say no to features that don't earn their place. No settings panels, no search, no accounts, no comments, no ratings.
- **react-bits**: only where an animated component genuinely helps (for example a cover title). If you use one, pull it through the official registry as the skill describes. Skip it if hand-written CSS is better.
- Emil Kowalski's motion skills: **emil-design-eng**, **animate**, **choreograph**, **gestures**, **improve-animations**, **animation-performance**. Use them for the page turn, the swipe gesture, and its interruptibility.

## Product

A recipe book you flip through.

1. **Cover**: title (suggest "Bread Pitt's Recipe Book" / German "Bread Pitts Rezeptbuch"), Retro Diner styling.
2. **Contents page**: numbered list of recipes, each links to its page.
3. **One page (or spread on wide screens) per recipe.**

Navigation:
- Swipe (touch, with the page following the finger and snapping), arrow keys, and clickable/tappable prev/next controls.
- A satisfying page-flip or page-turn motion. Fast (roughly 350–550 ms), interruptible, GPU-friendly (transform/opacity only).
- Deep links per recipe, with a short slug: `#/brownies`, `#/cinnamon-rolls`, `#/cheesecake`, `#/topfenschmarren`, `#/quark-bake`, plus `#/` (cover) and `#/contents`. Browser back/forward must work. Put the short slug in each JSON as a new optional field (for example `"route": "brownies"`) or derive it, but do not change any recipe text.
- `prefers-reduced-motion: reduce`: no flip, just a simple short crossfade.

Each recipe page shows, from the JSON only:
- Title, recipe number ("Recipe No. 01"), tagline, intro, stats (prep / bake / yield), equipment.
- **Ingredients with cups-and-spoons amounts FIRST, metric beside them** (smaller, secondary). His kitchen scale is broken, so cups must be the dominant number.
- Steps with titles, text and the "cue" lines. Tips.
- Source credit with a link to the source URL (author, site). Also show `amounts_credit` / `conversions` where present, small.
- A **PDF download** button for that recipe's printable sheet.

Language toggle EN/DE:
- UI chrome (buttons, labels, "Contents", "Ingredients", "Download PDF", "Recipe No.", aria labels) is translated in both languages.
- Recipe text: use the `de` block where the JSON has one (only `fudge-brownies.json` today). Where it doesn't, show the English recipe text with the German UI, and a small honest note like "Dieses Rezept gibt es bisher nur auf Englisch." **Never machine-translate or invent recipe text.**
- Remember the choice (localStorage) and set `<html lang>`.

## Content (single source of truth)

- `content/recipes/*.json`: recipes. Numbers present: 1, 3, 4, 5, 6. **There is no No. 2. Do not invent one or renumber.** Show the real numbers (01, 03, 04, 05, 06).
- `content/pdfs/<slug>.pdf`: printable Retro Diner sheet per recipe (filename matches the JSON `slug`). These are English sheets.
- **Never invent recipe content.** Every recipe string on the site comes from the JSONs. Do not edit the recipe text in the JSONs.
- **Adding a recipe must be: drop a JSON in `content/recipes/` and its PDF in `content/pdfs/`, run the build, done.** Use something like Vite's `import.meta.glob` so no code or index file needs editing. Document this in `README.md`, including the JSON shape.

## Look: Retro Diner

Design reference: `design-ref/diner.html` (the print template the PDFs were made from). Read it and translate its look to the web: cream field, chocolate rules, mint "menu" ingredients card with a hard choc drop shadow, mustard numbered step dots, rotated tips card, star "Recipe No. XX" eyebrow, checkers, starburst/sticker.

- Colours: cherry `#C8233A`, mint `#A8DCCB`, mustard `#F2B134`, choc `#3A2216`, cream `#FFF4DF`.
- Fonts (self-hosted, already in `assets/fonts/` as WOFF2, OFL): **Shrikhand** (display titles), **Lilita One** (eyebrows, section heads, amounts, badges), **Kalam** (handwritten tagline, cues, footer), **Nunito** (variable, body). Use `@font-face` with `font-display: swap`. **No Google Fonts CDN, no external requests at all.**
- No photos exist. Do not add stock images or AI images. Use type, colour, CSS shapes and small inline SVG ornaments. No giant images.

## Stack

Keep it simple and fast: Vite + React (or plain Vite), static build, no backend, no router library unless it truly earns its place (a hash listener is fine). Minimal dependencies. Must work when `dist/` is served from any static host or subfolder (use `base: './'`).

## Done criteria

- `npm run build` passes with no errors. `npm run preview` serves it.
- Looks great at **390×844** (primary) and **1440×900** (show a two-page spread or a centred book on wide screens; never a stretched mobile column).
- No horizontal overflow at 390px. Long ingredient names and amounts wrap cleanly.
- Touch targets ≥ 44px. Visible focus states. Keyboard: ←/→ turn pages.
- `prefers-reduced-motion` respected (crossfade only).
- Good contrast (WCAG AA for body text; careful with mustard/mint backgrounds), meaningful alt text / aria-labels on icons and ornaments (decorative ones `aria-hidden`).
- Small, focused git commits with clear messages as you go (scaffold, content loader, layout, page turn, i18n, polish, README). Commit locally only.
- `README.md`: how to run (`npm install`, `npm run dev`, `npm run build`, `npm run preview`), how to add a recipe, design reference choice.

When done, print a short summary: what you built, files of note, anything you skipped and why.
