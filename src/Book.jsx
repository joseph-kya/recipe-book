import { Suspense, lazy, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { recipes, textFor } from './content.js';
import { ui } from './i18n.js';
import { buildSpreads, firstIndexFor, hashForSpread, routeOfHash, spreadMatchesRoute } from './layout.js';
import { paginate } from './paginate.js';
import { useScales } from './useScale.js';
import { getDoneSteps, RecipeMeasure, renderFace } from './pages.jsx';
import { animateSpring, makeSpring, project, rubberband, unRubberband, rubberbandVelocity } from './spring.js';
import Controls from './Controls.jsx';
import CookMode from './CookMode.jsx';
import { PrintRecipe } from './Share.jsx';
import { enterPage, swapContent, transition } from './motion.js';
import { closeSettings, settingsTrigger, useSettingsOpen } from './settings-store.js';

const SettingsSheet = lazy(() => import('./Settings.jsx'));

const WIDE_QUERY = '(min-width: 960px) and (min-height: 560px)';
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';
// A button turn settles in ~260 ms; gesture releases retain their own momentum.
const TURN_RESPONSE = 0.28;
const TURN_SPRING = makeSpring({ response: TURN_RESPONSE, damping: 1 });
// A button turn starts at the spring's natural velocity. From rest a
// critically damped spring is an S-curve (it creeps first, like ease-in); with
// v0 = ω·distance it becomes x(t) = 1 − e^(−ωt), a pure ease-out with the same settle.
const TURN_OMEGA = (2 * Math.PI) / TURN_RESPONSE;
const EDGE_SPRING = makeSpring({ response: 0.32, damping: 0.86 });
const NARROW_MAX_DEG = 94; // past 90° a phone page is off-screen left and backface-culled

function useMedia(query) {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const ANCHOR_SELECTOR =
  '[data-unit="hero"], .menu-head, [data-item], .ticket-head, [data-step], [data-tip], [data-unit="macros"], [data-unit="credits"], [data-unit="photo"], .toc-link[href]';

function anchorSelectorFor(el) {
  if (el.dataset.item) return `[data-item="${el.dataset.item}"]`;
  if (el.dataset.step) return `[data-step="${el.dataset.step}"]`;
  if (el.dataset.tip) return `[data-tip="${el.dataset.tip}"]`;
  if (el.dataset.unit) return `[data-unit="${el.dataset.unit}"]`;
  if (el.classList.contains('toc-link')) return `.toc-link[href="${el.getAttribute('href')}"]`;
  if (el.classList.contains('menu-head')) return '.menu-head';
  if (el.classList.contains('ticket-head')) return '.ticket-head';
  return null;
}

const MemoFaceContent = memo(function MemoFaceContent({ desc, lang, units, onStartCooking }) {
  return renderFace(desc, lang, units, onStartCooking);
});

const MemoMeasureSource = memo(function MemoMeasureSource({ lang, units }) {
  return (
    <div className="measure-src" hidden>
      {recipes.map((r) => (
        <RecipeMeasure key={r.slug} recipe={r} lang={lang} units={units} />
      ))}
    </div>
  );
});

const MemoPrintSheet = memo(function MemoPrintSheet({ recipe, lang, units }) {
  return <PrintRecipe recipe={recipe} lang={lang} units={units} />;
});

const MemoControls = memo(Controls);

function setFaceRole(rec, role, live, force = false) {
  if (force || rec.role !== role) {
    rec.el.className = `face face--${rec.side} face--${role}`;
    rec.el.dataset.role = role;
    rec.role = role;
    if (role !== 'front' && role !== 'back' && rec.lastTransform !== '') {
      rec.el.style.transform = '';
      rec.lastTransform = '';
    }
    if ((role === 'rest' || role === 'standby' || role === 'fading') && rec.lastShade !== '0') {
      rec.shade.style.opacity = '0';
      rec.lastShade = '0';
    }
  }
  if (force || rec.live !== live) {
    rec.el.inert = !live;
    rec.el.setAttribute('aria-hidden', live ? 'false' : 'true');
    rec.live = live;
  }
}

export default function Book({ lang, setLang, units, setUnits }) {
  const wide = useMedia(WIDE_QUERY);
  const reduce = useMedia(REDUCE_QUERY);
  const { scales } = useScales(); // portion scale: amounts change width, so re-paginate
  const [plans, setPlans] = useState(null); // wide only: recipe slug -> pages of segments
  const [planVersion, setPlanVersion] = useState(0);
  const spreads = useMemo(() => buildSpreads(wide, plans), [wide, plans]);
  const layoutKey = wide ? `w${planVersion}` : 'n';
  const [index, setIndex] = useState(() => firstIndexFor(spreads, routeOfHash(location.hash)));
  const [turn, setTurn] = useState(null); // { lo, hi } only when React needs to mount missing faces
  const [warmed, setWarmed] = useState(null); // index whose neighbour faces are pre-mounted
  const [fade, setFade] = useState(null); // { from } during a reduced-motion crossfade
  const [announce, setAnnounce] = useState('');
  const [barAway, setBarAway] = useState(false); // phone: control bar tucked away while reading
  const [cookState, setCookState] = useState(null); // { recipe, initialStep } | null
  const settingsOpen = useSettingsOpen();
  const [printRecipe, setPrintRecipe] = useState(() => spreads[index]?.recipe || null);
  const bookRef = useRef(null);
  const measureRef = useRef(null);
  const faceEls = useRef(new Map());
  const entered = useRef(new Set());
  const swapAnimRef = useRef(null);
  const prevLocaleRef = useRef({ lang, units });
  const pendingSwapRef = useRef(null);
  const scrollAnchorRef = useRef(null);
  const cookTriggerRef = useRef(null);
  const wasCookOpenRef = useRef(false);

  // The engine's live state. React state above only decides which faces exist.
  const s = useRef({
    index,
    renderedIndex: index,
    turn: null,
    reactTurn: false,
    activeTurn: null,
    isTurning: false,
    isBookMoving: false,
    lastBookTransform: '',
    p: 0,
    target: 0,
    anim: null,
    dragRaf: 0,
    scrollRaf: 0,
    pendingTarget: null,
    drag: null,
    detachMove: null,
    didDrag: false,
    rb: 0,
    rbAnim: null,
    pageWidth: 0,
    viewportHeight: typeof innerHeight === 'number' ? innerHeight : 0,
    barAway: false,
    spreads,
    key: layoutKey,
    plans: null,
    planVersion: 0,
    repaginating: false,
    planCache: new Map(),
    cookOpen: false,
    settingsOpen: false,
  }).current;
  s.wide = wide;
  s.reduce = reduce;
  s.lang = lang;
  s.scales = scales;
  s.cookOpen = Boolean(cookState);
  s.settingsOpen = settingsOpen;
  s.renderedIndex = index;
  s.barAway = barAway;
  const last = () => s.spreads.length - 1;

  /* ---------- geometry cache: zero layout reads during drag ---------- */

  useLayoutEffect(() => {
    const book = bookRef.current;
    if (!book) return;
    const updateGeometry = () => {
      const w = book.clientWidth || innerWidth;
      s.pageWidth = s.wide ? w / 2 : w;
      s.viewportHeight = innerHeight;
    };
    updateGeometry();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(updateGeometry) : null;
    ro?.observe(book);
    addEventListener('resize', updateGeometry, { passive: true });
    return () => {
      ro?.disconnect();
      removeEventListener('resize', updateGeometry);
    };
  }, [wide, s]);

  const pageWidth = useCallback(
    () => s.pageWidth || (s.wide ? innerWidth / 2 : innerWidth),
    [s],
  );

  /* ---------- face role & painting: transform + opacity only ---------- */

  const syncFacesDOM = useCallback(
    (force = false) => {
      const book = bookRef.current;
      const active = s.turn;
      if (active) {
        const activeTurn = { front: null, back: null, underL: null, underR: null };
        for (const rec of faceEls.current.values()) {
          if (rec.isFading) {
            setFaceRole(rec, 'fading', false, force);
          } else if (rec.idx === active.lo && rec.side === 'R') {
            setFaceRole(rec, 'front', false, force);
            activeTurn.front = rec;
          } else if (rec.idx === active.hi && rec.side === 'R') {
            setFaceRole(rec, 'under-r', false, force);
            activeTurn.underR = rec;
          } else if (s.wide && rec.idx === active.lo && rec.side === 'L') {
            setFaceRole(rec, 'under-l', false, force);
            activeTurn.underL = rec;
          } else if (s.wide && rec.idx === active.hi && rec.side === 'L') {
            setFaceRole(rec, 'back', false, force);
            activeTurn.back = rec;
          } else {
            setFaceRole(rec, 'standby', false, force);
          }
        }
        s.activeTurn = activeTurn;
        if (book && !s.isTurning) {
          book.classList.add('is-turning');
          s.isTurning = true;
        }
      } else {
        s.activeTurn = null;
        if (book && s.isTurning) {
          book.classList.remove('is-turning');
          s.isTurning = false;
        }
        for (const rec of faceEls.current.values()) {
          if (rec.isFading) {
            setFaceRole(rec, 'fading', false, force);
          } else if (rec.idx === s.index && (rec.side === 'R' || (s.wide && rec.side === 'L'))) {
            setFaceRole(rec, 'rest', true, force);
          } else {
            setFaceRole(rec, 'standby', false, force);
          }
        }
      }
    },
    [s],
  );

  const hasMountedFacesForTurn = useCallback(
    (lo, hi) => {
      const spLo = s.spreads[lo];
      const spHi = s.spreads[hi];
      if (!spLo || !spHi) return false;
      const has = (idx, side) => {
        if (!s.spreads[idx]?.[side]) return true;
        for (const rec of faceEls.current.values()) {
          if (!rec.isFading && rec.idx === idx && rec.side === side) return true;
        }
        return false;
      };
      if (!has(lo, 'R') || !has(hi, 'R')) return false;
      if (s.wide && (!has(lo, 'L') || !has(hi, 'L'))) return false;
      return true;
    },
    [s],
  );

  const paint = useCallback(() => {
    const book = bookRef.current;
    if (!book) return;
    const active = s.activeTurn;
    const p = clamp(s.p, 0, 1);
    if (active) {
      const maxDeg = s.wide ? 180 : NARROW_MAX_DEG;
      const leafShade = (0.36 * Math.sin(Math.PI * p)).toFixed(3);
      if (active.front) {
        const tf = `rotateY(${(-maxDeg * p).toFixed(2)}deg)`;
        if (active.front.lastTransform !== tf) {
          active.front.el.style.transform = tf;
          active.front.lastTransform = tf;
        }
        if (active.front.lastShade !== leafShade) {
          active.front.shade.style.opacity = leafShade;
          active.front.lastShade = leafShade;
        }
      }
      if (active.back) {
        const tf = `rotateY(${(180 - 180 * p).toFixed(2)}deg)`;
        if (active.back.lastTransform !== tf) {
          active.back.el.style.transform = tf;
          active.back.lastTransform = tf;
        }
        if (active.back.lastShade !== leafShade) {
          active.back.shade.style.opacity = leafShade;
          active.back.lastShade = leafShade;
        }
      }
      if (active.underR) {
        const op = (0.4 * (1 - p)).toFixed(3);
        if (active.underR.lastShade !== op) {
          active.underR.shade.style.opacity = op;
          active.underR.lastShade = op;
        }
      }
      if (active.underL) {
        const op = (0.4 * p).toFixed(3);
        if (active.underL.lastShade !== op) {
          active.underL.shade.style.opacity = op;
          active.underL.lastShade = op;
        }
      }
    }
    // A closed book sits centred on its cover; it slides over as it opens.
    let shift = 0;
    if (s.wide) shift = s.turn ? (s.turn.lo === 0 ? 1 - p : 0) : s.index === 0 ? 1 : 0;
    const rbX = s.wide ? s.rb : s.rb * 0.7;
    const bookMoving = Boolean((s.wide && s.turn && s.turn.lo === 0) || s.rb !== 0 || s.rbAnim || s.drag?.mode === 'edge');
    if (s.isBookMoving !== bookMoving) {
      book.classList.toggle('is-book-moving', bookMoving);
      s.isBookMoving = bookMoving;
    }
    let bookTf = '';
    if (shift !== 0 && rbX !== 0) {
      bookTf = `translate3d(${(-25 * shift).toFixed(3)}%, 0, 0) translate3d(${rbX.toFixed(2)}px, 0, 0)`;
    } else if (shift !== 0) {
      bookTf = `translate3d(${(-25 * shift).toFixed(3)}%, 0, 0)`;
    } else if (rbX !== 0) {
      bookTf = `translate3d(${rbX.toFixed(2)}px, 0, 0)`;
    }
    if (s.lastBookTransform !== bookTf) {
      book.style.transform = bookTf;
      s.lastBookTransform = bookTf;
    }
  }, [s]);

  const scheduleDragPaint = useCallback(() => {
    if (s.dragRaf) return;
    s.dragRaf = requestAnimationFrame(() => {
      s.dragRaf = 0;
      paint();
    });
  }, [s, paint]);

  const cancelDragPaint = useCallback(() => {
    if (s.dragRaf) {
      cancelAnimationFrame(s.dragRaf);
      s.dragRaf = 0;
    }
  }, [s]);

  /* ---------- settling and the URL ---------- */

  // Hash names the recipe (#/r/<slug>); history.state remembers which of its spreads.
  const syncHash = useCallback(
    (k) => {
      const sp = s.spreads[k];
      const url = hashForSpread(sp);
      const curRoute = routeOfHash(location.hash);
      const st = history.state;
      if (!spreadMatchesRoute(sp, curRoute)) {
        history.pushState({ k, key: s.key }, '', url);
      } else {
        const known = st && st.key === s.key ? st.k : firstIndexFor(s.spreads, curRoute);
        if (known !== k) history.pushState({ k, key: s.key }, '', url);
      }
    },
    [s],
  );

  const announceFor = useCallback(
    (k) => {
      const t = ui[s.lang];
      const sp = s.spreads[k];
      const name =
        sp.kind === 'cover' ? t.cover : sp.kind === 'contents' ? t.contents : textFor(sp.recipe, s.lang).text.title;
      setAnnounce(`${t.pageOf(k + 1, s.spreads.length)}: ${name}`);
    },
    [s],
  );

  // A language switch must also replace any previous live page announcement.
  useEffect(() => {
    announceFor(s.index);
  }, [lang, announceFor, s]);

  const settle = useCallback(
    (k, { push = true } = {}) => {
      cancelDragPaint();
      s.anim = null;
      s.turn = null;
      s.index = k;
      s.p = 0;
      syncFacesDOM();
      paint();
      if (s.reactTurn) {
        s.reactTurn = false;
        setTurn(null);
      }
      if (k !== s.renderedIndex) {
        setIndex(k);
        if (push) syncHash(k);
        announceFor(k);
      }
    },
    [s, cancelDragPaint, syncFacesDOM, paint, syncHash, announceFor],
  );

  const runSpring = useCallback(
    (target, velocity = 0) => {
      cancelDragPaint();
      if (s.anim) s.anim.stop();
      s.pendingTarget = null;
      s.target = target;
      if (s.reactTurn) {
        setTurn((prev) => (prev && prev.target !== target ? { ...prev, target } : prev));
      }
      s.anim = animateSpring({
        from: s.p,
        to: target,
        velocity,
        spring: TURN_SPRING,
        onUpdate: (p) => {
          s.p = p;
          paint();
        },
        onDone: () => {
          if (!s.turn) return;
          const { lo, hi } = s.turn;
          settle(target === 1 ? hi : lo);
        },
      });
    },
    [s, cancelDragPaint, paint, settle],
  );

  const destination = () => (s.turn ? (s.target === 1 ? s.turn.hi : s.turn.lo) : s.index);

  /* ---------- navigation: every route into the book ends here ---------- */

  const finishNow = useCallback(() => {
    cancelDragPaint();
    s.pendingTarget = null;
    if (!s.turn) return;
    if (s.anim) s.anim.stop();
    s.anim = null;
    s.index = s.target === 1 ? s.turn.hi : s.turn.lo;
    s.turn = null;
    s.p = 0;
  }, [s, cancelDragPaint]);

  const navigate = useCallback(
    (to, { instant = false, connected = false } = {}) => {
      const t = clamp(to, 0, s.spreads.length - 1);
      if (s.drag?.decided) return;
      s.skipEntrance = instant;
      s.keyboardNavigation = false;

      if (instant || (connected && !s.reduce)) {
        if (t === destination()) return;
        const update = () => {
          finishNow();
          // Retain a short crossfade on browsers without snapshot transitions.
          setFade(connected && !instant && !document.startViewTransition
            ? { from: s.index, key: performance.now() } : null);
          settle(t);
        };
        if (instant) update();
        else transition(update);
        return;
      }

      if (s.reduce) {
        finishNow();
        const from = s.index;
        if (t === from) return;
        s.index = t;
        if (s.reactTurn) {
          s.reactTurn = false;
          setTurn(null);
        }
        setFade({ from, key: Date.now() });
        setIndex(t);
        syncHash(t);
        announceFor(t);
        return;
      }

      if (t === destination()) return;
      // Reversal or re-press inside the moving leaf: retarget, keep velocity.
      if (s.turn && (t === s.turn.lo || t === s.turn.hi)) {
        runSpring(t === s.turn.hi ? 1 : 0, s.anim ? s.anim.velocity : 0);
        return;
      }
      // Anywhere else: land the current leaf instantly, then turn from there.
      finishNow();
      const k = s.index;
      const lo = Math.min(k, t);
      const hi = Math.max(k, t);
      s.turn = { lo, hi };
      s.p = t > k ? 0 : 1;
      s.target = t > k ? 1 : 0;
      if (hasMountedFacesForTurn(lo, hi)) {
        // Fast path: neighbours are already pre-mounted, so turn immediately with zero React work.
        s.pendingTarget = null;
        syncFacesDOM();
        paint();
        runSpring(s.target, TURN_OMEGA * (s.target - s.p));
        return;
      }
      s.pendingTarget = s.target;
      s.reactTurn = true;
      setFade(null);
      setIndex(k);
      setTurn({ ...s.turn, target: s.pendingTarget });
    },
    [s, finishNow, runSpring, syncHash, announceFor, settle, hasMountedFacesForTurn, syncFacesDOM, paint],
  );

  /* ---------- pagination (wide) ---------- */

  const applySpreads = useCallback(
    (nextSpreads, nextKey) => {
      const old = s.spreads;
      if (old === nextSpreads || s.key === nextKey) return;
      const oldIndex = destination();
      cancelDragPaint();
      if (s.anim) s.anim.stop();
      s.anim = null;
      s.pendingTarget = null;
      s.drag = null;
      s.detachMove?.();
      bookRef.current?.classList.remove('is-dragging');
      s.turn = null;
      s.reactTurn = false;
      s.activeTurn = null;
      s.p = 0;
      const was = old[oldIndex] || old[0];
      s.spreads = nextSpreads;
      s.key = nextKey;
      const base = firstIndexFor(nextSpreads, was.route);
      const count = nextSpreads.filter((x) => x.route === was.route).length;
      const k = base + Math.min(was.offset || 0, count - 1);
      s.index = k;
      setTurn(null);
      setWarmed(null);
      setFade(null);
      setIndex(k);
      if (history.state) history.replaceState({ k, key: nextKey }, '', location.hash || '#/');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s, cancelDragPaint],
  );

  const runPaginate = useCallback(() => {
    const root = measureRef.current;
    if (!s.wide || !root) return false;
    const fontsReady = document.fonts?.status === 'loaded' ? 1 : 0;
    const cacheKey = `${s.lang}|${root.clientWidth}x${root.clientHeight}|${JSON.stringify(s.scales)}|${fontsReady}`;
    let next = s.planCache.get(cacheKey);
    if (!next) {
      next = paginate(root);
      s.planCache.set(cacheKey, next);
    }
    if (JSON.stringify(next) === JSON.stringify(s.plans)) return false;
    const nextVersion = s.planVersion + 1;
    const nextKey = `w${nextVersion}`;
    s.plans = next;
    s.planVersion = nextVersion;
    setPlans(next);
    setPlanVersion(nextVersion);
    applySpreads(buildSpreads(true, next), nextKey);
    return true;
  }, [s, applySpreads]);

  // Measure before paint, again when the language or portion scale changes.
  // Units (cups <-> g) reserve both sizes in CSS and never alter pagination.
  useLayoutEffect(() => {
    s.repaginating = wide ? runPaginate() : false;
  }, [wide, lang, scales, runPaginate, s]);

  // ...and once the real fonts are in, and after every resize.
  useEffect(() => {
    if (!wide) return;
    let timer = 0;
    let alive = true;
    document.fonts?.ready.then(() => alive && runPaginate());
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(runPaginate, 120);
    };
    addEventListener('resize', onResize, { passive: true });
    return () => {
      alive = false;
      clearTimeout(timer);
      removeEventListener('resize', onResize);
    };
  }, [wide, runPaginate]);

  // New layout (phone ↔ spread, or a new pagination): stay on the same recipe,
  // as close to the same page as the new layout allows.
  useLayoutEffect(() => {
    applySpreads(spreads, layoutKey);
  }, [spreads, layoutKey, applySpreads]);

  // Pre-mount immediate neighbour pages once the settled page has been calm
  // briefly so swipes and turns start with zero DOM creation, zero layout, and
  // zero React reconciliation — without competing with settle or entrance motion.
  useEffect(() => {
    if (reduce || turn || fade || (wide && !plans)) return;
    if (warmed === index) return;
    let timer = 0;
    let idle = 0;
    const commitWarm = () => {
      if (s.turn || s.drag) {
        timer = setTimeout(scheduleIdle, 120);
        return;
      }
      setWarmed(index);
    };
    const scheduleIdle = () => {
      if (typeof requestIdleCallback === 'function') {
        idle = requestIdleCallback(commitWarm, { timeout: 220 });
      } else {
        commitWarm();
      }
    };
    timer = setTimeout(scheduleIdle, 140);
    return () => {
      if (idle && typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
      clearTimeout(timer);
    };
  }, [index, warmed, reduce, turn, fade, wide, plans, s]);

  // Faces changed: sync roles with live engine state, repaint, start any pending turn.
  useLayoutEffect(() => {
    syncFacesDOM(true);
    paint();
    if (s.pendingTarget !== null && s.turn) {
      const target = s.pendingTarget;
      s.pendingTarget = null;
      runSpring(target, TURN_OMEGA * (target - s.p));
    }
  }, [turn, index, wide, fade, spreads, warmed, syncFacesDOM, paint, runSpring, s]);

  // A first entry belongs to the visit, not a language, layout or face mount.
  // Parent turns finish before the children enter; subsequent visits stay still.
  useLayoutEffect(() => {
    if (turn) return;
    const kind = s.spreads[index]?.kind;
    if (!['cover', 'contents'].includes(kind) || entered.current.has(kind)) return;
    entered.current.add(kind);
    if (reduce || s.skipEntrance) return;
    const root = bookRef.current?.querySelector(`.face--rest .${kind === 'cover' ? 'cover' : 'contents'}`);
    return enterPage(root, kind);
  }, [index, turn, wide, reduce, s]);

  // After a language or unit switch settles (including any wide repagination),
  // restore the phone reading anchor without hiding the bar and animate the
  // swapped words/amounts cleanly in-place.
  useLayoutEffect(() => {
    const prev = prevLocaleRef.current;
    if (prev.lang !== lang) pendingSwapRef.current = 'lang';
    else if (prev.units !== units) pendingSwapRef.current = 'units';
    prevLocaleRef.current = { lang, units };

    if (s.repaginating) {
      s.repaginating = false;
      return;
    }
    if (!pendingSwapRef.current) return;
    const kind = pendingSwapRef.current;
    pendingSwapRef.current = null;

    if (!wide) {
      const scroller = bookRef.current?.querySelector('.face--rest .face-scroll');
      if (scroller) {
        s.suppressScrollUntil = performance.now() + 100;
        const anchor = scrollAnchorRef.current;
        scrollAnchorRef.current = null;
        if (kind === 'lang' && anchor && scroller.scrollTop > 0) {
          const target = scroller.querySelector(anchor.selector);
          if (target) {
            const dy = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - anchor.offset;
            if (Math.abs(dy) > 0.5) scroller.scrollTop = Math.max(0, scroller.scrollTop + dy);
          }
        }
        s.scrollMark = scroller.scrollTop;
      } else {
        scrollAnchorRef.current = null;
      }
      if (s.barAway) {
        s.barAway = false;
        setBarAway(false);
      }
    } else {
      scrollAnchorRef.current = null;
    }

    if (turn || s.turn) return;
    const restFaces = [...(bookRef.current?.querySelectorAll('.face--rest') || [])];
    swapContent(restFaces, kind, swapAnimRef);
  }, [lang, units, spreads, index, wide, turn, reduce, s]);

  // Back / forward and plain #/ links.
  useEffect(() => {
    const onHistory = () => {
      const route = routeOfHash(location.hash);
      const st = history.state;
      const k =
        st && st.key === s.key && spreadMatchesRoute(s.spreads[st.k], route)
          ? st.k
          : firstIndexFor(s.spreads, route);
      setCookState((cur) => (cur && s.spreads[k]?.recipe?.slug === cur.recipe.slug ? cur : null));
      navigate(k, { instant: s.keyboardNavigation });
      s.keyboardNavigation = false;
    };
    addEventListener('hashchange', onHistory);
    addEventListener('popstate', onHistory);
    return () => {
      removeEventListener('hashchange', onHistory);
      removeEventListener('popstate', onHistory);
    };
  }, [navigate, s]);

  // ← / → turn pages, unless someone is typing or Cook mode / Settings is open.
  useEffect(() => {
    const onKey = (e) => {
      if (s.cookOpen) return;
      if (s.settingsOpen) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigate(destination() + 1, { instant: true });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigate(destination() - 1, { instant: true });
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  /* ---------- the swipe: 1:1 while the finger is down, spring after ---------- */

  // Progress from finger travel. The free edge of the page follows the finger.
  const progressFor = useCallback(
    (pStart, dx, W = pageWidth()) => {
      const A = s.wide ? Math.PI : (NARROW_MAX_DEG * Math.PI) / 180;
      const e0 = Math.cos(A * pStart);
      const e = clamp(e0 + dx / W, Math.cos(A), 1);
      return Math.acos(e) / A;
    },
    [s, pageWidth],
  );

  // The tab names the page you are on, in the current language.
  useEffect(() => {
    const t = ui[lang];
    const sp = spreads[index];
    if (!sp) return;
    const page =
      sp.kind === 'recipe' ? textFor(sp.recipe, lang).text.title : sp.kind === 'contents' ? t.contents : null;
    document.title = page ? `${page} · ${t.bookTitleFlat}` : t.bookTitleFlat;
  }, [index, lang, spreads]);

  /* ---------- phone control bar: away while reading down, back on any sign of need ---------- */

  // Every new page starts with the bar in view.
  useEffect(() => {
    if (s.barAway) {
      s.barAway = false;
      setBarAway(false);
    }
    const scroller = !s.wide ? bookRef.current?.querySelector('.face--rest .face-scroll') : null;
    s.scrollMark = scroller ? scroller.scrollTop : 0;
  }, [index, s]);

  const onFaceScroll = useCallback(
    (e) => {
      if (s.turn || s.drag?.decided) return;
      const el = e.currentTarget;
      if (s.scrollRaf) return;
      s.scrollRaf = requestAnimationFrame(() => {
        s.scrollRaf = 0;
        if (s.turn || s.drag?.decided) return;
        const y = el.scrollTop;
        if (s.suppressScrollUntil && performance.now() < s.suppressScrollUntil) {
          s.scrollMark = y;
          return;
        }
        const atEnd = y + el.clientHeight >= el.scrollHeight - 24;
        if (atEnd || y < 64) {
          s.scrollMark = y;
          if (s.barAway) {
            s.barAway = false;
            setBarAway(false);
          }
          return;
        }
        // Only a deliberate move counts: small jitters accumulate until 8px.
        const dy = y - (s.scrollMark || 0);
        if (Math.abs(dy) < 8) return;
        s.scrollMark = y;
        const nextAway = dy > 0;
        if (s.barAway !== nextAway) {
          s.barAway = nextAway;
          setBarAway(nextAway);
        }
      });
    },
    [s],
  );

  // Passive pointer listeners with rAF-batched drag painting and zero React
  // updates during pointermove. Vertical scroll stays on the compositor thread.
  useEffect(() => {
    const book = bookRef.current;
    if (!book) return;
    let moveAttached = false;

    const returnEdge = (velocity = 0) => {
      s.rbAnim?.stop();
      s.rbAnim = animateSpring({
        from: s.rb,
        to: 0,
        velocity,
        spring: EDGE_SPRING,
        restDelta: 0.15,
        restSpeed: 2,
        onUpdate: (x) => {
          s.rb = x;
          paint();
        },
        onDone: () => {
          s.rbAnim = null;
          paint();
        },
      });
    };

    const beginDrag = (dir) => {
      const d = s.drag;
      if (s.reduce) {
        d.mode = 'fade';
        d.dir = dir;
        return;
      }
      let edgeVelocity = 0;
      if (s.rbAnim) {
        edgeVelocity = s.rbAnim.velocity;
        s.rbAnim.stop();
        s.rbAnim = null;
      }
      if (s.turn) {
        // Grab the leaf mid-flight.
        if (s.anim) s.anim.stop();
        s.anim = null;
        d.mode = 'turn';
        d.pStart = s.p;
        d.returnTarget = s.target;
        return;
      }
      const k = s.index;
      if ((dir < 0 && k < last()) || (dir > 0 && k > 0)) {
        // A swipe into the book can catch an edge rebound too. Let its remaining
        // offset settle continuously alongside the newly grabbed leaf.
        if (s.rb) returnEdge(edgeVelocity);
        const lo = dir < 0 ? k : k - 1;
        const hi = dir < 0 ? k + 1 : k;
        s.turn = { lo, hi };
        s.p = dir < 0 ? 0 : 1;
        s.target = s.p;
        d.mode = 'turn';
        d.pStart = s.p;
        d.returnTarget = s.p;
        if (hasMountedFacesForTurn(lo, hi)) {
          // Neighbour already mounted: activate turn roles directly on DOM, zero React re-render.
          syncFacesDOM();
        } else {
          s.reactTurn = true;
          setFade(null);
          setTurn({ ...s.turn, target: s.target });
        }
      } else {
        d.mode = 'edge';
        d.rb0 = unRubberband(s.rb, d.width);
      }
    };

    const detachMove = () => {
      if (!moveAttached) return;
      moveAttached = false;
      book.removeEventListener('pointermove', onPointerMove);
      book.removeEventListener('pointerup', onPointerUp);
      book.removeEventListener('pointercancel', onPointerUp);
      removeEventListener('pointerup', onPointerUp);
      removeEventListener('pointercancel', onPointerUp);
    };
    s.detachMove = detachMove;

    const attachMove = () => {
      if (moveAttached) return;
      moveAttached = true;
      book.addEventListener('pointermove', onPointerMove, { passive: true });
      book.addEventListener('pointerup', onPointerUp, { passive: true });
      book.addEventListener('pointercancel', onPointerUp, { passive: true });
      addEventListener('pointerup', onPointerUp, { passive: true });
      addEventListener('pointercancel', onPointerUp, { passive: true });
    };

    const onPointerDown = (e) => {
      if (s.cookOpen) return;
      if (s.settingsOpen) return;
      // A tap near the bottom edge asks for the bar.
      if (!s.wide && s.barAway && e.clientY > s.viewportHeight - 96) {
        s.barAway = false;
        setBarAway(false);
      }
      if (!e.isPrimary || e.button !== 0 || s.drag) return;
      s.didDrag = false;
      if (e.target.closest?.('button, input, select, textarea, [contenteditable]')) return;
      s.drag = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        dx: 0,
        dy: 0,
        width: pageWidth(),
        decided: false,
        samples: [{ x: e.clientX, t: performance.now() }],
      };
      attachMove();
    };

    const onPointerMove = (e) => {
      const d = s.drag;
      if (!d || e.pointerId !== d.id) return;
      const dxRaw = e.clientX - d.x0;
      const dyRaw = e.clientY - d.y0;
      d.dx = dxRaw;
      d.dy = dyRaw;
      if (!d.decided) {
        // The first ~10px pick the axis; after that the other axis is ignored.
        if (Math.abs(dxRaw) < 10 && Math.abs(dyRaw) < 10) return;
        if (Math.abs(dyRaw) >= Math.abs(dxRaw)) {
          s.drag = null; // vertical: let the page scroll natively
          detachMove();
          return;
        }
        d.decided = true;
        d.x0 = e.clientX; // start tracking from here, no jump
        s.didDrag = true;
        try {
          book.setPointerCapture(e.pointerId);
        } catch {
          /* Synthetic pointer events may not have an active browser pointer to capture. */
        }
        book.classList.add('is-dragging');
        beginDrag(Math.sign(dxRaw));
      }
      const now = performance.now();
      d.samples.push({ x: e.clientX, t: now });
      while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift();
      const dx = e.clientX - d.x0;
      if (d.mode === 'turn') {
        s.p = progressFor(d.pStart, dx, d.width);
        scheduleDragPaint();
      } else if (d.mode === 'edge') {
        s.rb = rubberband(d.rb0 + dx, d.width);
        scheduleDragPaint();
      }
    };

    const onPointerUp = (e) => {
      const d = s.drag;
      if (!d || e.pointerId !== d.id) return;
      s.drag = null;
      detachMove();
      cancelDragPaint();
      book.classList.remove('is-dragging');
      if (!d.decided) return;
      if (book.hasPointerCapture?.(e.pointerId)) {
        try {
          book.releasePointerCapture(e.pointerId);
        } catch {
          /* Ignore if capture was already released. */
        }
      }
      const sm = d.samples;
      const cancelled = e.type === 'pointercancel';
      const stale = !sm.length || performance.now() - sm[sm.length - 1].t > 80;
      // Include release coordinates: even a one-move flick has a useful history.
      const now = performance.now();
      if (!cancelled && !stale) sm.push({ x: e.clientX, t: now });
      while (sm.length > 2 && now - sm[0].t > 100) sm.shift();
      const elapsed = sm.length > 1 ? (sm.at(-1).t - sm[0].t) / 1000 : 0;
      const v = cancelled || stale || elapsed === 0 ? 0 : (sm.at(-1).x - sm[0].x) / elapsed;
      const dx = (cancelled ? (sm.at(-1)?.x ?? d.x0) : e.clientX) - d.x0;

      if (d.mode === 'fade') {
        if (!cancelled && (Math.abs(dx) > 50 || Math.abs(v) > 300)) {
          navigate(s.index - (Math.abs(v) > 300 ? Math.sign(v) : Math.sign(dx)));
        }
        return;
      }
      if (d.mode === 'edge') {
        s.rb = rubberband(d.rb0 + dx, d.width);
        paint();
        returnEdge(rubberbandVelocity(d.rb0 + dx, v, d.width));
        return;
      }
      // Throw: project where the finger was heading, and let a fast flick decide on its own.
      if (cancelled) {
        runSpring(d.returnTarget, 0);
        return;
      }
      const pProjected = progressFor(d.pStart, dx + project(v), d.width);
      let target = pProjected > 0.5 ? 1 : 0;
      if (Math.abs(v) > 250) target = v < 0 ? 1 : 0;
      const dpdx = (progressFor(d.pStart, dx + 1, d.width) - progressFor(d.pStart, dx - 1, d.width)) / 2;
      s.p = progressFor(d.pStart, dx, d.width);
      paint();
      runSpring(target, clamp(dpdx * v, -10, 10));
    };

    book.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => {
      detachMove();
      s.detachMove = null;
      book.removeEventListener('pointerdown', onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, pageWidth, progressFor, paint, scheduleDragPaint, cancelDragPaint, hasMountedFacesForTurn, syncFacesDOM, runSpring, navigate]);

  // A drag must never also count as a tap on a link underneath.
  const onClickCapture = (e) => {
    if (s.didDrag) {
      e.preventDefault();
      e.stopPropagation();
      s.didDrag = false;
      return;
    }
    const link = e.target.closest?.('.toc-link[href^="#/"]');
    if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(firstIndexFor(s.spreads, routeOfHash(link.hash)), { instant: true });
  };

  // Preference changes and unmounts must not leave a hidden moving leaf behind.
  useEffect(() => {
    if (!reduce) return;
    if (s.turn) {
      const k = destination();
      finishNow();
      settle(k);
    }
    cancelDragPaint();
    s.rbAnim?.stop();
    s.rbAnim = null;
    s.rb = 0;
    s.drag = null;
    s.detachMove?.();
    bookRef.current?.classList.remove('is-dragging');
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  useEffect(() => () => {
    cancelDragPaint();
    if (s.scrollRaf) cancelAnimationFrame(s.scrollRaf);
    s.anim?.stop();
    s.rbAnim?.stop();
    swapAnimRef.current?.cancel();
  }, [s, cancelDragPaint]);

  const captureScrollAnchor = useCallback(() => {
    if (s.wide) return;
    const scroller = bookRef.current?.querySelector('.face--rest .face-scroll');
    if (!scroller || scroller.scrollTop <= 0) {
      scrollAnchorRef.current = null;
      return;
    }
    const viewTop = scroller.getBoundingClientRect().top;
    const nodes = scroller.querySelectorAll(ANCHOR_SELECTOR);
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (rect.height > 0 && rect.bottom > viewTop + 8) {
        const selector = anchorSelectorFor(node);
        if (selector) {
          scrollAnchorRef.current = { selector, offset: rect.top - viewTop };
          return;
        }
      }
    }
    scrollAnchorRef.current = null;
  }, [s]);

  const handleSetLang = useCallback(
    (next) => {
      captureScrollAnchor();
      setLang(next);
    },
    [captureScrollAnchor, setLang],
  );

  const handleSetUnits = useCallback(
    (next) => {
      if (!s.wide) s.suppressScrollUntil = performance.now() + 100;
      setUnits(next);
    },
    [s, setUnits],
  );

  const openCookMode = useCallback(
    (recipe, triggerEl) => {
      if (!recipe) return;
      cookTriggerRef.current = triggerEl || document.activeElement;
      const done = getDoneSteps(recipe.slug);
      const { text } = textFor(recipe, lang);
      const firstUndone = text.steps.findIndex((_, i) => !done.has(i));
      setCookState({ recipe, initialStep: firstUndone === -1 ? 0 : firstUndone });
    },
    [lang],
  );

  const closeCookMode = useCallback(() => {
    setCookState(null);
  }, []);

  const handleCloseSettings = useCallback(() => {
    const trigger = settingsTrigger();
    closeSettings();
    if (trigger?.isConnected) trigger.focus();
  }, []);

  const handleShowBar = useCallback(() => {
    if (s.barAway) {
      s.barAway = false;
      setBarAway(false);
    }
  }, [s]);

  const handlePrev = useCallback((instant = false) => navigate(destination() - 1, { instant }), [navigate]);
  const handleNext = useCallback((instant = false) => navigate(destination() + 1, { instant }), [navigate]);

  const cookOpen = Boolean(cookState);

  useEffect(() => {
    if (wasCookOpenRef.current && !cookOpen) {
      const target = cookTriggerRef.current?.isConnected
        ? cookTriggerRef.current
        : bookRef.current?.querySelector('.face--rest .cook-start-btn');
      cookTriggerRef.current = null;
      target?.focus();
    }
    wasCookOpenRef.current = cookOpen;
  }, [cookOpen]);

  /* ---------- which faces exist right now ---------- */

  const faces = [];
  const seen = new Set();
  const add = (idx, side, role) => {
    const sp = spreads[idx];
    const desc = sp?.[side];
    if (!desc) return;
    // Key recipe faces by recipe + spread offset + side (not layoutKey or idx) so
    // EN/DE/FR or cups<->g repagination updates content in-place without remounting.
    const baseKey = sp.kind === 'recipe' ? `${wide}-${sp.recipe.slug}-${sp.offset}-${side}` : `${wide}-${sp.kind}-${side}`;
    const key = role === 'fading' ? `fade-${baseKey}` : baseKey;
    if (seen.has(key)) return;
    seen.add(key);
    faces.push({ key, idx, side, role, desc });
  };
  if (turn) {
    if (wide) add(turn.lo, 'L', 'under-l');
    add(turn.hi, 'R', 'under-r');
    add(turn.lo, 'R', 'front');
    if (wide) add(turn.hi, 'L', 'back');
  } else {
    if (fade) {
      if (wide) add(fade.from, 'L', 'fading');
      add(fade.from, 'R', 'fading');
    }
    if (wide) add(index, 'L', 'rest');
    add(index, 'R', 'rest');
    if (!reduce && !fade && (!wide || plans)) {
      const addStandby = (idx) => {
        if (idx < 0 || idx >= spreads.length || idx === index) return;
        if (wide) add(idx, 'L', 'standby');
        add(idx, 'R', 'standby');
      };
      if (warmed === index) {
        addStandby(index - 1);
        addStandby(index + 1);
      } else if (warmed !== null && Math.abs(warmed - index) === 1) {
        // Keep the just-departed page mounted without synchronously mounting the far neighbour on settle.
        addStandby(warmed);
      }
    }
  }
  // Stable DOM order (index, then side) so React never moves a node and loses its scroll.
  faces.sort((a, b) => a.idx - b.idx || (a.side < b.side ? -1 : 1));

  const t = ui[lang];
  const atRest = !turn;
  const activeIndex = turn ? (turn.target === 1 ? turn.hi : turn.lo) : index;
  const settledRecipe = spreads[index]?.recipe || null;

  // Defer mounting the hidden print-only sheet until idle (or immediately on
  // beforeprint) so settling onto a recipe never mounts a duplicate recipe tree.
  useEffect(() => {
    if (!settledRecipe) {
      setPrintRecipe(null);
      return;
    }
    if (printRecipe === settledRecipe) return;
    let idle = 0;
    let timer = 0;
    const syncPrint = () => setPrintRecipe(settledRecipe);
    const onBeforePrint = () => syncPrint();
    addEventListener('beforeprint', onBeforePrint);
    timer = setTimeout(() => {
      if (typeof requestIdleCallback === 'function') {
        idle = requestIdleCallback(syncPrint, { timeout: 250 });
      } else {
        syncPrint();
      }
    }, 180);
    return () => {
      removeEventListener('beforeprint', onBeforePrint);
      if (idle && typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
      clearTimeout(timer);
    };
  }, [settledRecipe, printRecipe]);

  return (
    <>
      <div
        className={`stage ${wide ? 'stage--wide' : 'stage--narrow'}`}
        data-has-print={settledRecipe ? 'true' : undefined}
        inert={cookOpen}
        aria-hidden={cookOpen || undefined}
        onClickCapture={(e) => {
          if (e.target.closest?.('a[href^="#/"]')) s.keyboardNavigation = e.detail === 0;
        }}
      >
        <div
          className={`book ${wide ? 'book--wide' : 'book--narrow'}`}
          ref={bookRef}
          aria-label={t.bookLabel}
          role="region"
          onClickCapture={onClickCapture}
        >
          {faces.map((f) => {
            const live = f.role === 'rest' && atRest;
            return (
              <div
                key={f.key}
                ref={(el) => {
                  if (el) {
                    const prev = faceEls.current.get(f.key);
                    if (prev && prev.el === el) {
                      prev.idx = f.idx;
                      prev.side = f.side;
                      prev.isFading = f.role === 'fading';
                    } else {
                      faceEls.current.set(f.key, {
                        el,
                        shade: el.lastElementChild,
                        idx: f.idx,
                        side: f.side,
                        role: f.role,
                        live,
                        isFading: f.role === 'fading',
                        lastTransform: '',
                        lastShade: '0',
                      });
                    }
                  } else {
                    faceEls.current.delete(f.key);
                  }
                }}
                data-role={f.role}
                className={`face face--${f.side} face--${f.role}`}
                inert={!live}
                aria-hidden={!live}
                onAnimationEnd={f.role === 'fading' ? () => setFade(null) : undefined}
              >
                <div
                  className="face-scroll"
                  onScroll={live && !wide && spreads[f.idx]?.kind === 'recipe' ? onFaceScroll : undefined}
                >
                  <MemoFaceContent desc={f.desc} lang={lang} units={units} onStartCooking={openCookMode} />
                </div>
                <div className="shade" aria-hidden="true" />
              </div>
            );
          })}
        </div>
        {wide && (
          // Off-screen copy of every recipe for the paginator to measure against.
          <div className="book book--wide measure" ref={measureRef} aria-hidden="true" inert>
            <MemoMeasureSource lang={lang} units={units} />
          </div>
        )}
        <MemoControls
          lang={lang}
          units={units}
          setUnits={handleSetUnits}
          index={activeIndex}
          last={spreads.length - 1}
          wide={wide}
          away={!wide && barAway}
          onShow={handleShowBar}
          onPrev={handlePrev}
          onNext={handleNext}
        />
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>
      {printRecipe && <MemoPrintSheet recipe={printRecipe} lang={lang} units={units} />}
      {cookState && (
        <CookMode
          recipe={cookState.recipe}
          lang={lang}
          initialStep={cookState.initialStep}
          onClose={closeCookMode}
        />
      )}
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsSheet
            lang={lang}
            setLang={handleSetLang}
            units={units}
            setUnits={handleSetUnits}
            onClose={handleCloseSettings}
          />
        </Suspense>
      )}
    </>
  );
}
