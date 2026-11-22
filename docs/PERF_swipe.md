# Swipe & Page-Turn Performance Report (`perf-swipe`)

Area: `src/Book.jsx`, `src/motion.js`, `src/motion.css`, `src/spring.js`  
Goal: 60 fps swiping and page turns on weak/old CPUs & GPUs (e.g. older iPads) with zero visual or feel changes, preserving EN/DE/FR, `prefers-reduced-motion`, 44px+ touch targets, and the exact spring physics.

---

## Root Causes Found

1. **Synchronous recipe mount + layout on first drag frame (`src/Book.jsx`)**  
   At rest, only the active spread (`index`) was mounted. On the very first horizontal `pointermove` (`beginDrag`) or button click (`navigate`), `setTurn(...)` forced React to synchronously construct the destination recipe's full DOM tree, run `Scaler`'s `useLayoutEffect` (`offsetLeft`/`offsetWidth` + `ResizeObserver`), compute styles, and upload GPU textures — producing 83–133 ms frame freezes and up to 54 ms of layout work on frame 1 of a swipe.
2. **Duplicate recipe mount via `<PrintRecipe>` mid-turn (`src/Book.jsx`)**  
   `activeRecipe` derived from `turn.target` caused `<PrintRecipe>` (an invisible `@media print` full copy of the recipe) to mount synchronously mid-flight / on settle, doubling the recipe mount cost.
3. **Unmemoized faces & hidden wide paginator source (`src/Book.jsx`)**  
   Every `Book` re-render (`turn`, `index`, `barAway`, `announce`) re-rendered all mounted faces and, in wide/iPad landscape mode, re-rendered all 6 `<RecipeMeasure>` trees inside `.measure-src`.
4. **1 px `border-right` reflow on every narrow page turn (`src/styles.css` overridden cleanly in `src/motion.css`)**  
   `.book--narrow .face--front` toggled `border-right: 1px solid ...`, shrinking `.face-scroll` inner width from 390 px to 389 px on turn start and expanding back to 390 px on settle — triggering full recipe reflows and `Scaler` `ResizeObserver` callbacks on every single swipe.
5. **Forced layout read on every `pointerdown` (`src/Book.jsx`)**  
   `pageWidth()` called `bookRef.current.getBoundingClientRect().width` and `onPointerDown` read `innerHeight` on every pointer start.
6. **Non-passive `touchmove` listener & unbatched `pointermove` writes (`src/Book.jsx`)**  
   A permanent `{ passive: false }` `touchmove` listener blocked compositor scrolling/touch handling, while `onPointerMove` called `paint()` synchronously on every raw pointer event (instead of coalescing to once per `requestAnimationFrame`), iterating all faces and reading `el.dataset.role` / `el.lastElementChild` per frame.
7. **Layer & View-Transition overhead (`src/motion.css`, `src/motion.js`)**  
   - `view-transition-name` was set permanently on `.book`, `.controls`, `.scaler-row`, and `.cover-cupcake-btn` even at rest / during 3D swipes.
   - `.face--front`/`.face--back` had unconditional `will-change: transform`, while `.shade` (animated `opacity` every frame on front, back, under-r, under-l) had no `will-change: opacity` during turns, and `.face` lacked `contain: layout style paint`.
8. **First-frame `dt` guard in spring loops (`src/spring.js`, `src/motion.js`)**  
   If the first rAF timestamp `now` was earlier than `performance.now()` captured at launch (common on WebKit/iOS), `now - last` went negative and wasted frame 1.

---

## Changes Made

- **`src/Book.jsx`**
  - **Cheap idle neighbour pre-mounting (`standby`)**: Immediate neighbours (`index - 1`, `index + 1`) are pre-mounted during idle time (`setTimeout` + `requestIdleCallback`, skipped during active drag/turn or `prefers-reduced-motion`). On settle, the just-departed page remains mounted as `standby` while the new far neighbour warms only after the page is calm.
  - **Zero-React-render imperative turn fast path**: When turning between already-mounted faces (the normal swipe & Next/Prev case), `beginDrag` and `navigate` promote face roles directly on cached DOM records (`s.activeTurn`) and drive `transform`/`opacity` via refs — **0 React state updates on drag start, 0 during drag, 0 during spring flight, and 0 on snap-back cancel**. Falls back cleanly to `setTurn` for unmounted multi-page jumps.
  - **Cached geometry**: `s.pageWidth` and `s.viewportHeight` are maintained via `ResizeObserver` + passive `resize` listener — zero `getBoundingClientRect` / `offsetWidth` reads during gestures.
  - **Passive pointer listeners + rAF batching**: Replaced React synthetic pointer handlers and the permanent `{ passive: false }` `touchmove` listener with native `{ passive: true }` listeners (`pointermove`/`pointerup`/`pointercancel` attached only while a pointer is down, immediately detached on vertical scroll or release). Drag updates coalesce via `requestAnimationFrame` (`scheduleDragPaint`).
  - **Diffed, cached `paint()`**: Directly updates only the 2 (narrow) or 4 (wide) active face/shade refs using `translate3d` / `rotateY` / `opacity` rounded to 2–3 decimals, skipping unchanged style writes and clearing `.book`'s inline transform at rest when `shift === 0 && rbX === 0`.
  - **Memoization & idle print sheet**: Wrapped face content (`MemoFaceContent`), wide measure source (`MemoMeasureSource`), controls (`MemoControls`), and print sheet (`MemoPrintSheet`) in `React.memo`; deferred `<PrintRecipe>` mounting until idle (or immediately on `beforeprint`).
  - **rAF-throttled phone scroll bar**: `onFaceScroll` bails out during turns, coalesces via rAF, and only calls `setBarAway` when the boolean state actually changes.
- **`src/motion.css`**
  - Scoped `view-transition-name` rules under `:root.is-vt` so named View Transition layers only exist during active `transition()` calls.
  - Added `.face { contain: layout style paint; }` and `.face--standby { visibility: hidden; pointer-events: none; z-index: 0; }`.
  - Scoped `will-change: transform` / `will-change: opacity` strictly to `.book.is-turning` and `.book.is-book-moving`.
  - Added `.book.is-dragging { touch-action: none; }` and `.book.is-turning .face { pointer-events: none; }`.
  - Replaced `.book--narrow .face--front`'s layout-shifting `border-right: 1px` with a pixel-identical `::after` 1 px hairline overlay (`border-right: 0`).
- **`src/motion.js`**
  - Toggled `:root.is-vt` around `document.startViewTransition` (cleaned up on `finished` or error).
  - Scoped `will-change: transform` on `spinCupcake` strictly to active spins and added the `now > last` `dt` guard.
  - Marked `enterPage` dismissal listeners `{ capture: true, passive: true }`.
- **`src/spring.js`**
  - Clamped `dt` when `now <= last` in `animateSpring` without altering spring constants, integration step (`1 / 240`), or feel.

---

## Measurements (Playwright Production Build, 6× CPU Throttling)

Environment: Chromium headless against `vite preview` production bundle (`dist/`), `Emulation.setCPUThrottlingRate({ rate: 6 })`, `deviceScaleFactor: 2`, `hasTouch: true`.  
Each gesture dispatches a multi-step horizontal pointer drag (with 2 pointermoves per step to exercise rAF coalescing) followed by release & spring settle, collecting rAF frame deltas, `longtask` entries (> 50 ms), forced `getBoundingClientRect` calls during drag, and CDP `Performance.getMetrics` deltas.

### Narrow Viewport (`390×844`, Phone / Portrait) — 6× CPU

| Scenario | Metric | Before | After | Change |
| --- | --- | ---: | ---: | ---: |
| **Contents → Fudge Brownies (swipe)** | Max frame | 83.4 ms | **16.7 ms** | **-80%** (0 dropped frames) |
| | Avg / P95 frame | 18.65 / 16.8 ms | **16.66 / 16.7 ms** | locked 60 fps |
| | Long tasks (> 50 ms) | 1 (155 ms) | **0 (0 ms)** | eliminated |
| | Layout time / reads in drag | 54.05 ms / 1 | **4.32 ms / 0** | **-92%** layout, 0 reads |
| | Script time | 142.07 ms | **22.31 ms** | **-84%** |
| **Fudge Brownies → Cinnamon Rolls (swipe)** | Max frame | 83.3 ms | **16.8 ms** | **-80%** (0 dropped frames) |
| | Avg / P95 frame | 18.22 / 16.8 ms | **16.66 / 16.7 ms** | locked 60 fps |
| | Long tasks (> 50 ms) | 1 (66 ms) | **0 (0 ms)** | eliminated |
| | Layout time / reads in drag | 29.03 ms / 1 | **1.24 ms / 0** | **-96%** layout, 0 reads |
| | Script time | 74.82 ms | **19.17 ms** | **-74%** |
| **Cinnamon Rolls → Fudge Brownies (swipe back)** | Max frame | 33.4 ms | **33.3 ms** | ~same (p95 16.7 ms) |
| | Layout time / reads in drag | 12.38 ms / 1 | **1.11 ms / 0** | **-91%** layout, 0 reads |
| | Script time | 60.44 ms | **23.46 ms** | **-61%** |
| **Partial drag + snap-back cancel** | Layout time / reads in drag | 17.60 ms / 1 | **0.10 ms / 0** | **-99.4%** layout, 0 reads |
| | Script time | 51.84 ms | **10.98 ms** | **-79%** |
| | Long tasks (> 50 ms) | 0 | **0** | 0 React renders |
| **Button Next turn** | Max frame | 133.4 ms | **83.3 ms** | **-38%** |
| | Long tasks (> 50 ms) | 1 (85 ms) | **0 (0 ms)** | eliminated |
| | Layout time | 19.38 ms | **1.06 ms** | **-95%** |
| | Script time | 50.17 ms | **20.76 ms** | **-59%** |

*(Note: The very first cold-session swipe `Cover → Contents` in narrow mode included a one-time V8/Chrome cold-renderer script compilation spike of ~350 ms under 6× CPU both before and after; its layout time dropped from 13.97 ms → 3.72 ms and drag layout reads dropped from 1 → 0.)*

### Wide Viewport (`1024×768`, iPad Landscape Spread) — 6× CPU

| Scenario | Metric | Before | After | Change |
| --- | --- | ---: | ---: | ---: |
| **Cover → Contents (swipe)** | Max frame | 50.0 ms | **16.8 ms** | **-66%** (0 dropped frames) |
| | Layout time / reads in drag | 10.10 ms / 1 | **2.85 ms / 0** | **-72%** |
| | Script time | 145.59 ms | **33.72 ms** | **-77%** |
| **Contents → Fudge Brownies (swipe)** | Max frame | 33.4 ms | **16.8 ms** | **-50%** (0 dropped frames) |
| | Layout time / reads in drag | 6.19 ms / 1 | **1.16 ms / 0** | **-81%** |
| | Script time | 96.07 ms | **23.11 ms** | **-76%** |
| **Recipe spread → next spread (swipe)** | Max frame | 16.8 ms | **16.8 ms** | locked 60 fps |
| | Layout time / reads in drag | 4.08 ms / 1 | **1.12 ms / 0** | **-73%** |
| | Script time | 81.16 ms | **13.34 ms** | **-84%** |
| **Swipe back to previous spread** | Max frame | 16.8 ms | **16.8 ms** | locked 60 fps |
| | Layout time / reads in drag | 7.77 ms / 1 | **0.99 ms / 0** | **-87%** |
| | Script time | 75.64 ms | **20.50 ms** | **-73%** |
| **Snap-back cancel** | Max frame | 16.8 ms | **16.8 ms** | locked 60 fps |
| | Layout time / reads in drag | 4.00 ms / 1 | **0.87 ms / 0** | **-78%** |
| | Script time | 68.30 ms | **14.74 ms** | **-78%** |
| **Button Next turn** | Max frame | 66.6 ms | **49.9 ms** | **-25%** |
| | Layout time | 2.51 ms | **0.54 ms** | **-78%** |
| | Script time | 47.36 ms | **33.37 ms** | **-30%** |

---

## Verification

- `npm test` — all 141 tests pass (unit tests + Playwright E2E across `390×844` and `1440×900`, EN/DE/FR, rapid consecutive turns, scaling, timers, favorites, share, cover cupcake).
- `npm run build` — production Vite build succeeds cleanly.
- Visuals, spring constants (`TURN_RESPONSE = 0.28`, `damping = 1`, `EDGE_SPRING`), `prefers-reduced-motion`, 44 px+ touch targets, EN/DE/FR copy, and `content/` are untouched.
