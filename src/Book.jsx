import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { hashFor, indexForHash, pages, textFor } from './content.js';
import { ui } from './i18n.js';
import { renderPage } from './pages.jsx';
import { animateSpring, makeSpring, project, rubberband } from './spring.js';
import Controls from './Controls.jsx';

const WIDE_QUERY = '(min-width: 960px) and (min-height: 560px)';
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';
const LAST = pages.length - 1;
// response 0.42 s, critically damped: a full turn settles in about 450 ms.
const TURN_SPRING = makeSpring({ response: 0.42, damping: 1 });
const EDGE_SPRING = makeSpring({ response: 0.3, damping: 1 });
const NARROW_MAX_DEG = 115; // past ~95° a phone page is already off-screen

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

export default function Book({ lang, setLang }) {
  const wide = useMedia(WIDE_QUERY);
  const reduce = useMedia(REDUCE_QUERY);
  const [index, setIndex] = useState(() => indexForHash(location.hash));
  const [turn, setTurn] = useState(null); // { lo, hi } while a leaf is moving
  const [fade, setFade] = useState(null); // { from } during a reduced-motion crossfade
  const [announce, setAnnounce] = useState('');
  const bookRef = useRef(null);
  const faceEls = useRef(new Map());

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
    wide,
    reduce,
    lang,
  }).current;
  s.wide = wide;
  s.reduce = reduce;
  s.lang = lang;

  /* ---------- painting: transform + opacity only, straight onto the faces ---------- */

  const paint = useCallback(() => {
    const book = bookRef.current;
    if (!book) return;
    const p = s.p;
    const maxDeg = s.wide ? 180 : NARROW_MAX_DEG;
    for (const el of faceEls.current.values()) {
      const role = el.dataset.role;
      const shade = el.lastElementChild;
      if (role === 'front') {
        el.style.transform = `rotateY(${-maxDeg * p}deg)`;
        shade.style.opacity = String(0.5 * p);
      } else if (role === 'back') {
        el.style.transform = `rotateY(${180 - 180 * p}deg)`;
        shade.style.opacity = String(0.5 * (1 - p));
      } else if (role === 'under-r') {
        el.style.transform = '';
        shade.style.opacity = String(0.4 * (1 - p));
      } else if (role === 'under-l') {
        el.style.transform = '';
        shade.style.opacity = String(0.4 * p);
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

  const syncHash = useCallback((k) => {
    if (indexForHash(location.hash) !== k) history.pushState(null, '', hashFor(k));
  }, []);

  const announceFor = useCallback(
    (k) => {
      const t = ui[s.lang];
      const page = pages[k];
      const name =
        page.kind === 'cover' ? t.cover : page.kind === 'contents' ? t.contents : textFor(page.recipe, s.lang).text.title;
      setAnnounce(`${t.pageOf(k + 1, pages.length)}: ${name}`);
    },
    [s],
  );

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
    if (!s.turn) return;
    if (s.anim) s.anim.stop();
    s.anim = null;
    s.index = s.target === 1 ? s.turn.hi : s.turn.lo;
    s.turn = null;
    s.p = 0;
  }, [s]);

  const navigate = useCallback(
    (to) => {
      const t = clamp(to, 0, LAST);
      if (s.drag?.decided) return;

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
      setTurn({ ...s.turn });
    },
    [s, finishNow, runSpring, syncHash, announceFor],
  );

  // Faces changed: re-collect them, repaint at the current progress, start any pending turn.
  useLayoutEffect(() => {
    paint();
    if (s.pendingTarget !== null && s.turn) {
      const target = s.pendingTarget;
      s.pendingTarget = null;
      runSpring(target, 0);
    }
  }, [turn, index, wide, fade, paint, runSpring, s]);

  // Back / forward buttons and plain #/ links.
  useEffect(() => {
    const onHash = () => navigate(indexForHash(location.hash));
    addEventListener('hashchange', onHash);
    addEventListener('popstate', onHash);
    return () => {
      removeEventListener('hashchange', onHash);
      removeEventListener('popstate', onHash);
    };
  }, [navigate]);

  // Switching between phone and spread layout mid-turn: land the leaf where it was heading.
  useEffect(() => {
    if (!s.turn) return;
    const k = destination();
    if (s.anim) s.anim.stop();
    settle(k, { push: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wide]);

  // ← / → turn pages, unless someone is typing.
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigate(destination() + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigate(destination() - 1);
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
  const progressFor = (pStart, dx) => {
    const W = pageWidth();
    const A = s.wide ? Math.PI : (NARROW_MAX_DEG * Math.PI) / 180;
    const e0 = Math.cos(A * pStart);
    const e = clamp(e0 + dx / W, Math.cos(A), 1);
    return Math.acos(e) / A;
  };

  const onPointerDown = (e) => {
    if (!e.isPrimary || e.button !== 0 || s.drag) return;
    s.didDrag = false;
    s.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, decided: false, samples: [] };
  };

  const beginDrag = (dir) => {
    const d = s.drag;
    if (s.reduce) {
      d.mode = 'fade';
      d.dir = dir;
      return;
    }
    if (s.rbAnim) {
      s.rbAnim.stop();
      s.rbAnim = null;
    }
    if (s.turn) {
      // Grab the leaf mid-flight.
      if (s.anim) s.anim.stop();
      s.anim = null;
      d.mode = 'turn';
      d.pStart = s.p;
      return;
    }
    const k = s.index;
    if ((dir < 0 && k < LAST) || (dir > 0 && k > 0)) {
      s.turn = dir < 0 ? { lo: k, hi: k + 1 } : { lo: k - 1, hi: k };
      s.p = dir < 0 ? 0 : 1;
      s.target = s.p;
      d.mode = 'turn';
      d.pStart = s.p;
      setFade(null);
      setTurn({ ...s.turn });
    } else {
      d.mode = 'edge';
      d.rb0 = s.rb;
    }
  };

  const onPointerMove = (e) => {
    const d = s.drag;
    if (!d || e.pointerId !== d.id) return;
    const dxRaw = e.clientX - d.x0;
    const dyRaw = e.clientY - d.y0;
    if (!d.decided) {
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
      s.p = progressFor(d.pStart, dx);
      paint();
    } else if (d.mode === 'edge') {
      s.rb = rubberband(d.rb0 + dx, pageWidth());
      paint();
    }
  };

  const onPointerUp = (e) => {
    const d = s.drag;
    if (!d || e.pointerId !== d.id) return;
    s.drag = null;
    bookRef.current.classList.remove('is-dragging');
    if (!d.decided) return;
    const sm = d.samples;
    const dt = sm.length > 1 ? (sm[sm.length - 1].t - sm[0].t) / 1000 : 0;
    const v = e.type === 'pointercancel' || dt === 0 ? 0 : (sm[sm.length - 1].x - sm[0].x) / dt;
    const dx = (sm.length ? sm[sm.length - 1].x : d.x0) - d.x0;

    if (d.mode === 'fade') {
      if (Math.abs(dx) > 50 || Math.abs(v) > 300) navigate(s.index - d.dir);
      return;
    }
    if (d.mode === 'edge') {
      s.rbAnim = animateSpring({
        from: s.rb,
        to: 0,
        velocity: 0,
        spring: EDGE_SPRING,
        onUpdate: (x) => {
          s.rb = x;
          paint();
        },
        onDone: () => {
          s.rbAnim = null;
        },
      });
      return;
    }
    // Throw: project where the finger was heading, and let a fast flick decide on its own.
    const pProjected = progressFor(d.pStart, dx + project(v));
    let target = pProjected > 0.5 ? 1 : 0;
    if (Math.abs(v) > 250) target = v < 0 ? 1 : 0;
    const dpdx = progressFor(d.pStart, dx + 1) - progressFor(d.pStart, dx);
    runSpring(target, clamp(dpdx * v, -10, 10));
  };

  // A drag must never also count as a tap on a link underneath.
  const onClickCapture = (e) => {
    if (s.didDrag) {
      e.preventDefault();
      e.stopPropagation();
      s.didDrag = false;
    }
  };

  /* ---------- which faces exist right now ---------- */

  const faces = [];
  const add = (idx, side, role) => {
    const content = renderPage(idx, side, wide, lang);
    if (content) faces.push({ key: `${wide ? 'w' : 'n'}-${idx}-${side}`, idx, side, role, content });
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

  return (
    <div className={`stage ${wide ? 'stage--wide' : 'stage--narrow'}`}>
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
              <div className="face-scroll">{f.content}</div>
              <div className="shade" aria-hidden="true" />
            </div>
          );
        })}
      </div>
      <Controls
        lang={lang}
        setLang={setLang}
        index={index}
        last={LAST}
        wide={wide}
        onPrev={() => navigate(destination() - 1)}
        onNext={() => navigate(destination() + 1)}
      />
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
