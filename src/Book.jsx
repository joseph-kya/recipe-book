import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { recipes, textFor } from './content.js';
import { ui } from './i18n.js';
import { buildSpreads, firstIndexFor, routeOfHash } from './layout.js';
import { paginate } from './paginate.js';
import { useScales } from './useScale.js';
import { RecipeMeasure, renderFace } from './pages.jsx';
import { animateSpring, makeSpring, project, rubberband, unRubberband, rubberbandVelocity } from './spring.js';
import Controls from './Controls.jsx';
import { enterPage, transition } from './motion.js';

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

export default function Book({ lang, setLang, units, setUnits }) {
  const wide = useMedia(WIDE_QUERY);
  const reduce = useMedia(REDUCE_QUERY);
  const { scales } = useScales(); // portion scale: amounts change width, so re-paginate
  const [plans, setPlans] = useState(null); // wide only: recipe slug -> pages of segments
  const [planVersion, setPlanVersion] = useState(0);
  const spreads = useMemo(() => buildSpreads(wide, plans), [wide, plans]);
  const layoutKey = wide ? `w${planVersion}` : 'n';
  const [index, setIndex] = useState(() => firstIndexFor(spreads, routeOfHash(location.hash)));
  const [turn, setTurn] = useState(null); // { lo, hi } while a leaf is moving
  const [fade, setFade] = useState(null); // { from } during a reduced-motion crossfade
  const [announce, setAnnounce] = useState('');
  const [barAway, setBarAway] = useState(false); // phone: control bar tucked away while reading
  const bookRef = useRef(null);
  const measureRef = useRef(null);
  const faceEls = useRef(new Map());
  const entered = useRef(new Set());

  // The engine's live state. React state above only decides which faces exist.
  const s = useRef({
    index,
    turn: null,
    p: 0,
    target: 0,
    anim: null,
    pendingTarget: null,
    drag: null,
    didDrag: false,
    rb: 0,
    rbAnim: null,
    spreads,
    key: layoutKey,
    plans: null,
  }).current;
  s.wide = wide;
  s.reduce = reduce;
  s.lang = lang;
  const last = () => s.spreads.length - 1;

  /* ---------- painting: transform + opacity only, straight onto the faces ---------- */

  const paint = useCallback(() => {
    const book = bookRef.current;
    if (!book) return;
    const p = clamp(s.p, 0, 1);
    const maxDeg = s.wide ? 180 : NARROW_MAX_DEG;
    for (const el of faceEls.current.values()) {
      const role = el.dataset.role;
      const shade = el.lastElementChild;
      if (role === 'front') {
        el.style.transform = `rotateY(${-maxDeg * p}deg)`;
        shade.style.opacity = String(0.36 * Math.sin(Math.PI * p));
      } else if (role === 'back') {
        el.style.transform = `rotateY(${180 - 180 * p}deg)`;
        shade.style.opacity = String(0.36 * Math.sin(Math.PI * p));
      } else if (role === 'under-r') {
        el.style.transform = s.wide ? '' : `scale(${0.98 + 0.02 * p})`;
        shade.style.opacity = String(0.42 * (1 - p));
      } else if (role === 'under-l') {
        el.style.transform = '';
        shade.style.opacity = String(0.42 * p);
      } else {
        el.style.transform = '';
        shade.style.opacity = '0';
      }
    }
    // A closed book sits centred on its cover; it slides over as it opens.
    let shift = 0;
    if (s.wide) shift = s.turn ? (s.turn.lo === 0 ? 1 - p : 0) : s.index === 0 ? 1 : 0;
    book.style.transform = `translateX(${-25 * shift}%) translateX(${s.rb}px)`;
  }, [s]);

  /* ---------- settling and the URL ---------- */

  // Hash names the recipe; history.state remembers which of its spreads.
  const syncHash = useCallback(
    (k) => {
      const sp = s.spreads[k];
      const url = `#/${sp.route}`;
      const st = history.state;
      if (routeOfHash(location.hash) !== sp.route) {
        history.pushState({ k, key: s.key }, '', url);
      } else {
        const known = st && st.key === s.key ? st.k : firstIndexFor(s.spreads, sp.route);
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
      s.anim = null;
      s.turn = null;
      s.index = k;
      s.p = 0;
      setTurn(null);
      setIndex(k);
      if (push) syncHash(k);
      announceFor(k);
    },
    [s, syncHash, announceFor],
  );

  const runSpring = useCallback(
    (target, velocity = 0) => {
      if (s.anim) s.anim.stop();
      s.target = target;
      setTurn((prev) => (prev && prev.target !== target ? { ...prev, target } : prev));
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
          const { lo, hi } = s.turn;
          settle(target === 1 ? hi : lo);
        },
      });
    },
    [s, paint, settle],
  );

  const destination = () => (s.turn ? (s.target === 1 ? s.turn.hi : s.turn.lo) : s.index);

  /* ---------- navigation: every route into the book ends here ---------- */

  const finishNow = useCallback(() => {
    s.pendingTarget = null;
    if (!s.turn) return;
    if (s.anim) s.anim.stop();
    s.anim = null;
    s.index = s.target === 1 ? s.turn.hi : s.turn.lo;
    s.turn = null;
    s.p = 0;
  }, [s]);

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
        setTurn(null);
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
      s.turn = { lo: Math.min(k, t), hi: Math.max(k, t) };
      s.p = t > k ? 0 : 1;
      s.pendingTarget = t > k ? 1 : 0;
      setFade(null);
      setIndex(k);
      setTurn({ ...s.turn, target: s.pendingTarget });
    },
    [s, finishNow, runSpring, syncHash, announceFor, settle],
  );

  /* ---------- pagination (wide) ---------- */

  const runPaginate = useCallback(() => {
    if (!s.wide || !measureRef.current) return;
    const next = paginate(measureRef.current);
    if (JSON.stringify(next) === JSON.stringify(s.plans)) return;
    s.plans = next;
    setPlans(next);
    setPlanVersion((v) => v + 1);
  }, [s]);

  // Measure before paint, again when the language changes.
  useLayoutEffect(() => {
    if (wide) runPaginate();
  }, [wide, lang, units, scales, runPaginate]);

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
    addEventListener('resize', onResize);
    return () => {
      alive = false;
      clearTimeout(timer);
      removeEventListener('resize', onResize);
    };
  }, [wide, runPaginate]);

  // New layout (phone ↔ spread, or a new pagination): stay on the same recipe,
  // as close to the same page as the new layout allows.
  useLayoutEffect(() => {
    const old = s.spreads;
    if (old === spreads) return;
    const oldIndex = destination();
    if (s.anim) s.anim.stop();
    s.anim = null;
    s.pendingTarget = null;
    s.drag = null;
    bookRef.current?.classList.remove('is-dragging');
    s.turn = null;
    s.p = 0;
    const was = old[oldIndex] || old[0];
    s.spreads = spreads;
    s.key = layoutKey;
    const base = firstIndexFor(spreads, was.route);
    const count = spreads.filter((x) => x.route === was.route).length;
    const k = base + Math.min(was.offset || 0, count - 1);
    s.index = k;
    setTurn(null);
    setFade(null);
    setIndex(k);
    if (history.state) history.replaceState({ k, key: layoutKey }, '', location.hash || '#/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreads, layoutKey]);

  // Faces changed: repaint at the current progress, start any pending turn.
  useLayoutEffect(() => {
    paint();
    if (s.pendingTarget !== null && s.turn) {
      const target = s.pendingTarget;
      s.pendingTarget = null;
      runSpring(target, TURN_OMEGA * (target - s.p));
    }
  }, [turn, index, wide, fade, spreads, paint, runSpring, s]);

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

  // Back / forward and plain #/ links.
  useEffect(() => {
    const onHistory = () => {
      const route = routeOfHash(location.hash);
      const st = history.state;
      const k =
        st && st.key === s.key && s.spreads[st.k]?.route === route ? st.k : firstIndexFor(s.spreads, route);
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

  // ← / → turn pages, unless someone is typing.
  useEffect(() => {
    const onKey = (e) => {
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

  const pageWidth = () => {
    const w = bookRef.current?.getBoundingClientRect().width || innerWidth;
    return s.wide ? w / 2 : w;
  };

  // Progress from finger travel. The free edge of the page follows the finger.
  const progressFor = (pStart, dx, W = pageWidth()) => {
    const A = s.wide ? Math.PI : (NARROW_MAX_DEG * Math.PI) / 180;
    const e0 = Math.cos(A * pStart);
    const e = clamp(e0 + dx / W, Math.cos(A), 1);
    return Math.acos(e) / A;
  };

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
    setBarAway(false);
    s.scrollMark = 0;
  }, [index, s]);

  const onFaceScroll = (e) => {
    const el = e.currentTarget;
    const y = el.scrollTop;
    const atEnd = y + el.clientHeight >= el.scrollHeight - 24;
    if (atEnd || y < 64) {
      s.scrollMark = y;
      setBarAway(false);
      return;
    }
    // Only a deliberate move counts: small jitters accumulate until 8px.
    const dy = y - (s.scrollMark || 0);
    if (Math.abs(dy) < 8) return;
    s.scrollMark = y;
    setBarAway(dy > 0);
  };

  const onPointerDown = (e) => {
    // A tap near the bottom edge asks for the bar.
    if (!s.wide && e.clientY > innerHeight - 96) setBarAway(false);
    if (!e.isPrimary || e.button !== 0 || s.drag) return;
    s.didDrag = false;
    if (e.target.closest?.('button, input, select, textarea, [contenteditable]')) return;
    s.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0,
      width: pageWidth(), decided: false, samples: [{ x: e.clientX, t: performance.now() }] };
  };

  const returnEdge = (velocity = 0) => {
    s.rbAnim?.stop();
    s.rbAnim = animateSpring({
      from: s.rb,
      to: 0,
      velocity,
      spring: EDGE_SPRING,
      restDelta: 0.15,
      restSpeed: 2,
      onUpdate: (x) => { s.rb = x; paint(); },
      onDone: () => { s.rbAnim = null; },
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
      s.turn = dir < 0 ? { lo: k, hi: k + 1 } : { lo: k - 1, hi: k };
      s.p = dir < 0 ? 0 : 1;
      s.target = s.p;
      d.mode = 'turn';
      d.pStart = s.p;
      d.returnTarget = s.p;
      setFade(null);
      setTurn({ ...s.turn, target: s.target });
    } else {
      d.mode = 'edge';
      d.rb0 = unRubberband(s.rb, d.width);
    }
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
        s.drag = null; // vertical: let the page scroll
        return;
      }
      d.decided = true;
      d.x0 = e.clientX; // start tracking from here, no jump
      s.didDrag = true;
      bookRef.current.setPointerCapture(e.pointerId);
      bookRef.current.classList.add('is-dragging');
      beginDrag(Math.sign(dxRaw));
    }
    const now = performance.now();
    d.samples.push({ x: e.clientX, t: now });
    while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift();
    const dx = e.clientX - d.x0;
    if (d.mode === 'turn') {
      s.p = progressFor(d.pStart, dx, d.width);
      paint();
    } else if (d.mode === 'edge') {
      s.rb = rubberband(d.rb0 + dx, d.width);
      paint();
    }
  };

  const onPointerUp = (e) => {
    const d = s.drag;
    if (!d || e.pointerId !== d.id) return;
    s.drag = null;
    bookRef.current.classList.remove('is-dragging');
    if (!d.decided) return;
    if (bookRef.current.hasPointerCapture(e.pointerId)) bookRef.current.releasePointerCapture(e.pointerId);
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

  // Once a swipe is horizontal, the page must not also scroll vertically.
  useEffect(() => {
    const book = bookRef.current;
    const onTouchMove = (e) => {
      const d = s.drag;
      if (!d) return;
      const horizontal = d.decided || (Math.abs(d.dx) > 3 && Math.abs(d.dx) > Math.abs(d.dy));
      if (horizontal && e.cancelable) e.preventDefault();
    };
    book.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => book.removeEventListener('touchmove', onTouchMove);
  }, [s]);

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
    navigate(firstIndexFor(s.spreads, routeOfHash(link.hash)), { connected: true, instant: e.detail === 0 });
  };

  // Preference changes and unmounts must not leave a hidden moving leaf behind.
  useEffect(() => {
    if (!reduce) return;
    if (s.turn) {
      const k = destination();
      finishNow();
      settle(k);
    }
    s.rbAnim?.stop();
    s.rbAnim = null;
    s.rb = 0;
    s.drag = null;
    bookRef.current?.classList.remove('is-dragging');
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  useEffect(() => () => {
    s.anim?.stop();
    s.rbAnim?.stop();
  }, [s]);

  /* ---------- which faces exist right now ---------- */

  const faces = [];
  const add = (idx, side, role) => {
    const sp = spreads[idx];
    const content = sp && renderFace(sp[side], lang, units);
    // Repaginating recipes must not remount the fixed opening pages mid-entry.
    const key = sp?.kind === 'recipe' ? `${layoutKey}-${idx}-${side}` : `${wide}-${sp?.kind}-${side}`;
    if (content) faces.push({ key, idx, side, role, content });
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
  }
  // Stable DOM order (index, then side) so React never moves a node and loses its scroll.
  faces.sort((a, b) => a.idx - b.idx || (a.side < b.side ? -1 : 1));

  const t = ui[lang];
  const atRest = !turn;
  const activeIndex = turn ? (turn.target === 1 ? turn.hi : turn.lo) : index;

  return (
    <div
      className={`stage ${wide ? 'stage--wide' : 'stage--narrow'}`}
      onClickCapture={(e) => {
        if (e.target.closest?.('a[href^="#/"]')) s.keyboardNavigation = e.detail === 0;
      }}
    >
      <div
        className={`book ${wide ? 'book--wide' : 'book--narrow'}`}
        ref={bookRef}
        aria-label={t.bookLabel}
        role="region"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        {faces.map((f) => {
          const live = f.role === 'rest' && atRest;
          return (
            <div
              key={f.key}
              ref={(el) => {
                if (el) faceEls.current.set(f.key, el);
                else faceEls.current.delete(f.key);
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
                {f.content}
              </div>
              <div className="shade" aria-hidden="true" />
            </div>
          );
        })}
      </div>
      {wide && (
        // Off-screen copy of every recipe for the paginator to measure against.
        <div className="book book--wide measure" ref={measureRef} aria-hidden="true" inert>
          <div className="measure-src" hidden>
            {recipes.map((r) => (
              <RecipeMeasure key={r.slug} recipe={r} lang={lang} units={units} />
            ))}
          </div>
        </div>
      )}
      <Controls
        lang={lang}
        setLang={setLang}
        units={units}
        setUnits={setUnits}
        index={activeIndex}
        last={spreads.length - 1}
        wide={wide}
        away={!wide && barAway}
        onShow={() => setBarAway(false)}
        onPrev={(instant = false) => navigate(destination() - 1, { instant })}
        onNext={(instant = false) => navigate(destination() + 1, { instant })}
      />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
