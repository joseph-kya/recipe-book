# Performance & Old-Safari Compatibility Report (`perf-compat`)

## Scope

Owned files modified/added in this branch:
- `vite.config.js` — build target (`es2017` / `safari12`), CSS target (`safari12`), build-time top-level-`await` elimination, cascade-preserving CSS fallbacks, slim SW precache filter.
- `index.html` — minimal, zero-dependency ES5 runtime shims for Safari 12–15 APIs (no-op on modern browsers).
- `public/sw.js` — ES2017-safe syntax (removed `?.` / `??`), concurrency-capped (`4`) precache install worker pool.
- `package.json` — added `"perf": "node scripts/perf.mjs"` (separate from `npm test`).
- `scripts/perf.mjs` — Playwright 6x CPU-throttled swipe & bundle/SW benchmark harness.
- `scripts/compat.test.mjs` — unit tests for SW ES2017 compatibility, `index.html` shims, CSS fallback output, and SW precache filtering.

Design, EN/DE/FR copy, `content/`, `src/fav.*`, and all component/stylesheet sources owned by parallel perf branches were left untouched.

---

## Before vs. After Measurements

Measured via `npm run perf` (Playwright Chromium, **6x CPU throttle** via CDP `Emulation.setCPUThrottlingRate`, serving production `dist/` via Vite preview).

### 1. Bundle, Syntax Compatibility & Service Worker Precache

| Metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Built JS (raw / gzip) | 426.0 KB / 138.9 KB | 433.5 KB / 140.5 KB | +1.6 KB gz (+1.2%) |
| Built CSS (raw / gzip) | 93.4 KB / 16.8 KB | 95.4 KB / 17.1 KB | +0.3 KB gz (+1.8%) |
| `dist/index.html` (gzip) | 1.46 KB | 2.36 KB | +0.90 KB gz |
| Built JS `?.` / `??` / `||=` / TLA | 200 / 16 / 2 / 1 | **0 / 0 / 0 / 0** | 100% eliminated |
| `dist/sw.js` ES2020 syntax (`?.` / `??`) | `true` (SyntaxError < Safari 13.4) | **`false`** | Fixed |
| CSS `inset: 0` un-lowered | 11 | **0** | Lowered by `cssTarget: ['safari12']` |
| SW Precache URLs | 40 | **16** | **-60.0%** |
| SW Precache raw bytes | 1,511.8 KB | **708.8 KB** | **-53.1% (-803 KB)** |
| SW Install fetch concurrency | 40 parallel (`Promise.all`) | **4 concurrent** | Bounded I/O on old iPads |

> Why `build.target: ['es2017', 'safari12']` instead of `@vitejs/plugin-legacy`?  
> Safari 12 (iOS 12, supporting iPad Air 1, iPad mini 2/3, iPad 5th gen+) natively supports `<script type="module">`, `async`/`await`, `Promise`, `fetch`, CSS custom properties, CSS Grid, and Service Workers. A single ES2017 ES-module bundle adds only **+2.8 KB gzipped total** across HTML+JS+CSS, avoids doubling `dist/` with SystemJS/nomodule chunks, and avoids bloating the SW precache.

### 2. Phone Viewport (`390×844`, 6x CPU Throttle — 9 Touch Swipes Through Full Book)

| Metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Dropped frames (`> 20 ms`) | 13 / 515 (2.5%) | **9 / 516 (1.7%)** | **-31%** |
| Jank frames (`> 34 ms`) | 6 | **3** | **-50%** |
| Severe jank frames (`> 50 ms`) | 6 | **3** | **-50%** |
| Worst swipe frame delta | 300.0 ms | **216.7 ms** | **-28%** |
| Swipe long tasks (`> 50 ms`) | 5 | **3** | **-40%** |
| Max swipe long task | 304.0 ms | **229.0 ms** | **-25%** |
| Swipe Total Blocking Time (TBT) | 382.0 ms | **310.0 ms** | **-19%** |
| Swipes 4–9 long tasks / TBT | 2 / 21 ms | **0 / 0 ms** | Clean |

### 3. iPad Landscape Viewport (`1024×768`, 6x CPU Throttle — 4 Touch Swipes)

| Metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Cold load ready time | 1,099.4 ms | **880.3 ms** | **-20%** |
| Cold load TBT | 612.0 ms | **534.0 ms** | **-13%** |
| Jank frames (`> 34 ms`) | 1 | **0** | **-100%** |
| Worst swipe frame delta | 50.0 ms | **33.4 ms** | **-33%** |
| Swipe long tasks / TBT | 0 / 0 ms | **0 / 0 ms** | Clean |

---

## Old-Safari (iOS 12–15) Compatibility Audit

### Fixed in This Branch (`vite.config.js`, `index.html`, `public/sw.js`)

1. **Vite 7 default target was `baseline-widely-available` (`safari16.0`)**: shipped 200 optional chaining (`?.`), 16 nullish coalescing (`??`), 2 logical assignments (`||=`), and top-level `await`, causing immediate `SyntaxError` on Safari 12–14. Fixed via `build.target: ['es2017', 'safari12']` plus build-time top-level-`await` elimination for `src/content.js` / `src/main.jsx`.
2. **Un-transpiled `public/sw.js`**: contained `?.` and `??` (SyntaxError on Safari 12–13.3). Rewritten in plain ES2017.
3. **SW precache bloat & install stampede**: previously precached all 40 files (1.51 MB, including 12 WebP photos at 400w+800w, 7 PDFs, and 5 PWA PNG icons) concurrently via `Promise.all` right on `load`. Slimmed to 16 core files (708.8 KB: app shell, EN/DE/FR chunks, JS/CSS, fonts) with concurrency capped at 4; photos, PDFs, and secondary icons remain cached on-demand by `cacheFirstAsset`.
4. **Missing Safari 12–15 JS APIs (shimmed in `index.html`, no-op on modern browsers)**:
   - `Array.prototype.at` / `String.prototype.at` (Safari 15.4+) — prevented crashes on every swipe end in `Book.jsx`, `CookMode.jsx`, and pagination in `paginate.js`.
   - `MediaQueryList.prototype.addEventListener` / `removeEventListener` (Safari 14.0+) — prevented boot crash in `Book.jsx`'s `useMedia`.
   - `Promise.allSettled` (Safari 13.0+) — prevented crashes in `motion.js` animations.
   - `ResizeObserver` (Safari 13.1+) — window-resize fallback prevents crash in `Scaler.jsx`.
   - `Element.prototype.animate` (Safari 13.1+) — resolved no-op fallback prevents crashes in `motion.js` and `CookMode.jsx`.
   - `globalThis` (Safari 12.1+) and `Object.hasOwn` (Safari 15.4+).
5. **Safari 12–16.1 CSS fallbacks (build-time, cascade-preserving, pixel-identical on modern browsers)**:
   - `inset: 0` → `top: 0; right: 0; bottom: 0; left: 0` via `build.cssTarget: ['safari12']` (prevents 0×0 page collapse on Safari 12–14.0).
   - `100dvh` → `100vh` fallback emitted before `100dvh` (prevents collapsed `--ph` book height on iPad landscape & Cook Mode on Safari 12–15.3).
   - `inset-inline` / `inset-block` and `padding`/`margin`-`inline`/`block` → physical `left`/`right`/`top`/`bottom` fallbacks emitted before logical shorthands (Safari 12–14.0).
   - `-webkit-user-select: none` emitted before `user-select: none` where missing.
   - Opaque `color-mix(in srgb, ..., var(--paper|--cream|--mustard|--btn-primary,...))` backgrounds and `.shade` `linear-gradient` → solid theme-token / neutral translucent fallbacks emitted before `color-mix()` (Safari 12–16.1).
   - Flex `gap` (Safari 12–14.0 / pre-iOS 14.5): UA-gated `DOMContentLoaded` probe sets `html.no-flex-gap` only on failing Safari ≤14, enabling spacing fallbacks for key flex bars without touching modern browsers.

### Remaining Compatibility Notes in Other Agents' Files (Not Edited Here)

These live outside this branch's area and are documented for follow-up or awareness:

| File(s) | Feature | Minimum Safari | Impact & Suggested Fix |
| --- | --- | --- | --- |
| `src/Book.jsx`, `src/CookMode.jsx`, `src/Contents.jsx`, `src/Method.jsx`, `src/Awake.jsx`, `src/pages.jsx` | `PointerEvent` (`onPointerDown`/`Move`/`Up`, `setPointerCapture`) | Safari 13.0 | **iOS 12 only**: iOS 12 lacks `PointerEvent`, so drag-swiping in `Book.jsx` / `CookMode.jsx` won't fire (button/tap navigation still works). If iOS 12 touch-swipe is required, add touch event fallback (`touchstart`/`touchmove`/`touchend`) in `Book.jsx` (`perf-swipe` area). |
| `src/Book.jsx:635-637`, `src/CookMode.jsx:153,287-289`, `src/paginate.js:68,526,534` | `Array.prototype.at(-1)` | Safari 15.4 | Already polyfilled globally by `index.html`, or can be replaced directly with `arr[arr.length - 1]` in those files. |
| `src/Book.jsx:29-31` | `matchMedia(q).addEventListener('change', cb)` | Safari 14.0 | Already polyfilled globally by `index.html`, or can branch on `m.addEventListener ? ... : m.addListener`. |
| `src/styles.css:885` | `.contents-medallion { aspect-ratio: 1; }` | Safari 15.0 | On Safari 12–14, `.contents-medallion` relies on `aspect-ratio: 1` for height; adding `height: min(calc(var(--pw) * 0.57), calc(var(--ph) * 0.31));` alongside `width` makes it circular on Safari 12–14 (`perf-paint` area). |
| `src/photo.css:42` | `.photo-frame img { aspect-ratio: 4 / 3; }` | Safari 15.0 | Low impact: `<img width="800" height="600">` + `height: auto` preserves 4:3 once loaded; Safari 12–13 may shift layout before image load. |
| `src/styles.css:1615,1957` | `@container (max-width: 30rem)` | Safari 16.0 | Graceful degradation: inside wide pages narrower than 30rem, Safari 12–15 keeps the default non-compact layout. |
| `src/styles.css`, `src/cover-contents.css`, `src/cook.css`, `src/recipe-reading.css`, `src/idea-*.css` | Dotted/translucent `color-mix(in srgb, var(--ink) N%, transparent)` borders & hover tints | Safari 16.2 | Opaque `color-mix` backgrounds and `.shade` gradients are handled in `vite.config.js`; translucent dotted rules / hover tints degrade gracefully (subtle rules omit rather than breaking layout). |
| `public/photos/*.webp` & `src/content.js:17` | WebP images only (`-400.webp`, `-800.webp`) | Safari 14.0 | **iOS 12–13 only**: iOS 12–13 does not decode WebP, so recipe photos stay hidden (`opacity: 0`). Fixing requires generating JPEG fallbacks + `<picture>` in `src/Photo.jsx` (note: do not precache them in SW). |
| `src/styles.css:292` | `repeating-conic-gradient(...)` on `.stage--wide` | Safari 12.1 | Supported on iOS 12.2+; falls back cleanly to solid `background-color: var(--table)` on iOS 12.0–12.1. |
| `src/styles.css`, `src/cook.css`, etc. | `:focus-visible`, `overscroll-behavior`, `text-wrap`, `overflow-wrap: anywhere` | Safari 15.4–17.5 | All degrade gracefully (no breakage). Note: `:is()` (Safari 14.0+) is used in `styles.css`, `cover-contents.css`, `idea-random.css`, `motion.css` — selectors inside `:is()` are skipped on Safari 12–13. |

---

## Running the Perf Harness

```bash
npm run perf           # Run against existing dist/ (CPU 6x, Phone 390x844 + iPad 1024x768)
npm run perf -- --build # Rebuild dist/ first, then benchmark
npm run perf -- --json  # Emit machine-readable JSON
PERF_CPU_RATE=4 npm run perf # Override CPU throttle factor
```
