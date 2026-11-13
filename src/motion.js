import { flushSync } from 'react-dom';
import { makeSpring } from './spring.js';

let activeTransition;

const CUPCAKE_SPIN_SPRING = makeSpring({ response: 0.36, damping: 0.66 });
const CUPCAKE_SQUASH_SPRING = makeSpring({ response: 0.33, damping: 0.62 });

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// One springy 360° cupcake spin with subtle squash-and-stretch on tap.
// Retargets from live angle/velocity on rapid taps; instant no-op under reduced motion.
export function spinCupcake(el, stateRef) {
  const prev = stateRef?.current;
  if (prev?.raf) cancelAnimationFrame(prev.raf);
  if (!el || reducedMotion()) {
    if (el) el.style.transform = '';
    if (stateRef) stateRef.current = null;
    return null;
  }

  let rx = prev ? prev.rx : 0;
  let rv = prev ? prev.rv : 0;
  const target = (prev ? prev.target : 0) + 360;
  let qx = prev ? prev.qx : -0.045;
  let qv = prev ? Math.min(prev.qv + 1.8, 3.0) : 1.9;
  let last = performance.now();
  let stopped = false;
  const STEP = 1 / 240;

  const state = {
    rx,
    rv,
    target,
    qx,
    qv,
    raf: 0,
    stop() {
      stopped = true;
      cancelAnimationFrame(state.raf);
      el.style.transform = '';
      if (stateRef?.current === state) stateRef.current = null;
    },
  };
  if (stateRef) stateRef.current = state;

  const paint = () => {
    const sx = (1 - qx).toFixed(4);
    const sy = (1 + qx).toFixed(4);
    el.style.transform = `rotate(${rx.toFixed(2)}deg) scale(${sx}, ${sy})`;
  };

  const frame = (now) => {
    if (stopped) return;
    let dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    while (dt > 0) {
      const h = Math.min(STEP, dt);
      const ra = -CUPCAKE_SPIN_SPRING.k * (rx - target) - CUPCAKE_SPIN_SPRING.c * rv;
      rv += ra * h;
      rx += rv * h;
      const qa = -CUPCAKE_SQUASH_SPRING.k * qx - CUPCAKE_SQUASH_SPRING.c * qv;
      qv += qa * h;
      qx += qv * h;
      dt -= h;
    }
    state.rx = rx;
    state.rv = rv;
    state.qx = qx;
    state.qv = qv;

    if (
      Math.abs(rx - target) < 0.5 &&
      Math.abs(rv) < 5 &&
      Math.abs(qx) < 0.002 &&
      Math.abs(qv) < 0.02
    ) {
      el.style.transform = '';
      if (stateRef?.current === state) stateRef.current = null;
      return;
    }
    paint();
    if (!stopped) state.raf = requestAnimationFrame(frame);
  };

  paint();
  state.raf = requestAnimationFrame(frame);
  return state;
}

// Glide a segmented/scaler pill indicator using only compositor-friendly transform.
// Reads the live visual rect before updating width so rapid reversals mid-flight
// retarget seamlessly without animating layout width.
export function slidePill(group, indicator, active, { animate = false, animRef } = {}) {
  if (!group || !indicator) return;
  const wasReady = group.dataset.ready === 'true';
  const wasHidden = indicator.dataset.hidden === 'true';

  if (!active) {
    animRef?.current?.cancel();
    if (animRef) animRef.current = null;
    indicator.dataset.hidden = 'true';
    return;
  }

  let prevX = 0;
  let prevW = 0;
  if (animate && wasReady && !wasHidden && !reducedMotion() && indicator.animate) {
    const groupRect = group.getBoundingClientRect();
    const indRect = indicator.getBoundingClientRect();
    prevX = indRect.left - groupRect.left - group.clientLeft;
    prevW = indRect.width;
  }

  animRef?.current?.cancel();
  if (animRef) animRef.current = null;
  delete indicator.dataset.hidden;

  const nextX = active.offsetLeft;
  const nextW = active.offsetWidth;
  indicator.style.width = `${nextW}px`;
  indicator.style.transform = `translateX(${nextX}px)`;
  group.dataset.ready = 'true';

  if (animate && wasReady && !reducedMotion() && indicator.animate) {
    let anim = null;
    if (!wasHidden && prevW > 0 && nextW > 0 && (Math.abs(prevX - nextX) > 0.5 || Math.abs(prevW - nextW) > 0.5)) {
      const scaleX = prevW / nextW;
      anim = indicator.animate(
        [
          { transform: `translateX(${prevX}px) scaleX(${scaleX})` },
          { transform: `translateX(${nextX}px) scaleX(1)` },
        ],
        {
          duration: 210,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        },
      );
    } else if (wasHidden && nextW > 0) {
      // Returning from custom mode: fade cleanly into place.
      anim = indicator.animate(
        [
          { opacity: 0, transform: `translateX(${nextX}px)` },
          { opacity: 1, transform: `translateX(${nextX}px)` },
        ],
        {
          duration: 150,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        },
      );
    }
    if (anim && animRef) {
      animRef.current = anim;
      anim.finished.catch(() => {}).finally(() => {
        if (animRef.current === anim) animRef.current = null;
      });
    }
  }
}

// Springy press-down squash on pointerdown for bottom bar toggle buttons.
// Holds the squashed pose until releaseControl or cancellation; no-op under reduced motion.
export function pressControl(button, { animRef } = {}) {
  animRef?.current?.cancel();
  if (animRef) animRef.current = null;
  if (!button || reducedMotion() || !button.animate) return null;

  const anim = button.animate(
    [
      { transform: 'translateY(0) scale(1, 1)', offset: 0, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      { transform: 'translateY(2.5px) scale(1.06, 0.85)', offset: 0.58, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
      { transform: 'translateY(2px) scale(1.04, 0.89)', offset: 1 },
    ],
    { duration: 120, fill: 'forwards' },
  );

  if (animRef) {
    // Keep reference until releaseControl/cancel removes the forwards fill.
    animRef.current = anim;
  }
  return anim;
}

// Bouncy release with slight overshoot back to rest (~320ms, transform-only).
export function releaseControl(button, { animRef } = {}) {
  animRef?.current?.cancel();
  if (animRef) animRef.current = null;
  if (!button || reducedMotion() || !button.animate) return null;

  const anim = button.animate(
    [
      { transform: 'translateY(2px) scale(1.05, 0.89)', offset: 0, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      { transform: 'translateY(-2px) scale(0.95, 1.07)', offset: 0.36, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
      { transform: 'translateY(0.75px) scale(1.02, 0.98)', offset: 0.68, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
      { transform: 'translateY(-0.25px) scale(0.995, 1.008)', offset: 0.86, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
      { transform: 'translateY(0) scale(1, 1)', offset: 1 },
    ],
    { duration: 320 },
  );

  if (animRef) {
    animRef.current = anim;
    anim.finished?.catch(() => {}).finally(() => {
      if (animRef.current === anim) animRef.current = null;
    });
  }
  return anim;
}

// Shared pointer/keyboard handlers so pointerdown squashes immediately and release
// bounces consistently across bottom-bar toggles without delaying click activation.
export function createTapHandlers({ btnRef, pressRef, releasedAtRef, downRef }) {
  return {
    onPointerDown(e) {
      if (e?.pointerType === 'mouse' && e.button !== 0) return;
      downRef.current = true;
      releasedAtRef.current = -1;
      pressControl(btnRef.current, { animRef: pressRef });
    },
    onPointerUp() {
      if (!downRef.current) return;
      downRef.current = false;
      releasedAtRef.current = performance.now();
      releaseControl(btnRef.current, { animRef: pressRef });
    },
    onPointerCancel() {
      if (!downRef.current) return;
      downRef.current = false;
      releasedAtRef.current = -1;
      releaseControl(btnRef.current, { animRef: pressRef });
    },
    onPointerLeave() {
      if (!downRef.current) return;
      downRef.current = false;
      releasedAtRef.current = -1;
      releaseControl(btnRef.current, { animRef: pressRef });
    },
    onKeyDown(e) {
      if (e?.key === 'Enter' || e?.key === ' ') {
        releasedAtRef.current = -1;
      }
    },
  };
}

// Roll and flip a compact toggle's label on tap with a springy little squash.
// Cancels any in-flight flip on rapid taps and stays static under reduced motion.
export function flipLabel(el, {
  button,
  outgoing,
  outgoingText,
  preserveOutgoing = false,
  animRef,
  buttonAnimRef,
} = {}) {
  animRef?.current?.cancel();
  if (animRef) animRef.current = null;

  const hideOutgoing = () => {
    if (!outgoing) return;
    outgoing.hidden = true;
    if (!preserveOutgoing) outgoing.textContent = '';
  };

  if (!el || reducedMotion() || !el.animate) {
    if (button) {
      buttonAnimRef?.current?.cancel();
      if (buttonAnimRef) buttonAnimRef.current = null;
    }
    hideOutgoing();
    return null;
  }

  const duration = 320;
  const animations = [];
  let cancelled = false;

  const inAnim = el.animate(
    [
      {
        opacity: 0,
        transform: 'perspective(180px) translateY(95%) rotateX(-70deg) scale(0.88, 0.72)',
        offset: 0,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      {
        opacity: 1,
        transform: 'perspective(180px) translateY(-14%) rotateX(12deg) scale(0.94, 1.1)',
        offset: 0.48,
        easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
      },
      {
        opacity: 1,
        transform: 'perspective(180px) translateY(5%) rotateX(-4deg) scale(1.06, 0.93)',
        offset: 0.76,
        easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
      },
      {
        opacity: 1,
        transform: 'perspective(180px) translateY(0) rotateX(0deg) scale(1, 1)',
        offset: 1,
      },
    ],
    { duration },
  );
  animations.push(inAnim);

  if (outgoing && outgoing.animate && (preserveOutgoing || (outgoingText != null && outgoingText !== ''))) {
    if (!preserveOutgoing) outgoing.textContent = outgoingText;
    outgoing.hidden = false;
    const outAnim = outgoing.animate(
      [
        {
          opacity: 1,
          transform: 'perspective(180px) translateY(0) rotateX(0deg) scale(1, 1)',
          offset: 0,
          easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
        },
        {
          opacity: 0,
          transform: 'perspective(180px) translateY(-100%) rotateX(68deg) scale(0.88, 0.72)',
          offset: 1,
        },
      ],
      { duration: 135, fill: 'forwards' },
    );
    animations.push(outAnim);
    outAnim.finished.catch(() => {}).finally(() => {
      if (!cancelled) hideOutgoing();
    });
  } else {
    hideOutgoing();
  }

  let btnAnim = null;
  if (button?.animate) {
    buttonAnimRef?.current?.cancel();
    if (buttonAnimRef) buttonAnimRef.current = null;
    btnAnim = button.animate(
      [
        { transform: 'translateY(0) scale(1, 1)', offset: 0, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
        { transform: 'translateY(2px) scale(1.06, 0.9)', offset: 0.2, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        { transform: 'translateY(-2px) scale(0.95, 1.07)', offset: 0.5, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
        { transform: 'translateY(0.5px) scale(1.018, 0.982)', offset: 0.78, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
        { transform: 'translateY(0) scale(1, 1)', offset: 1 },
      ],
      { duration },
    );
    animations.push(btnAnim);
    if (buttonAnimRef) {
      buttonAnimRef.current = btnAnim;
      btnAnim.finished?.catch(() => {}).finally(() => {
        if (buttonAnimRef.current === btnAnim) buttonAnimRef.current = null;
      });
    }
  }

  const controller = {
    animations,
    duration,
    cancel() {
      if (cancelled) return;
      cancelled = true;
      animations.forEach((anim) => anim.cancel());
      hideOutgoing();
      if (animRef?.current === controller) animRef.current = null;
      if (btnAnim && buttonAnimRef?.current === btnAnim) buttonAnimRef.current = null;
    },
  };

  if (animRef) {
    animRef.current = controller;
    Promise.allSettled(animations.map((anim) => anim.finished)).then(() => {
      if (!cancelled && animRef.current === controller) animRef.current = null;
    });
  }

  return controller;
}

// Called only for a page's first live entry, after any parent page turn.
// Animate wrappers so press transforms and the cupcake's printed tilt stay free.
export function enterPage(root, kind) {
  if (!root || reducedMotion()) return () => {};
  const ease = getComputedStyle(root).getPropertyValue('--ease-out').trim();
  const beats = kind === 'cover'
    ? [
        ['.cover-title', 0, 260, 8],
        ['.cover-cupcake', 65, 220, 0],
        ['.cover-open', 115, 180, 4],
      ]
    : [...root.querySelectorAll('.toc > li')].map((el, i) =>
        [el, [0, 50, 95, 135, 170][Math.min(i, 4)], 120, 4]);
  const animations = [];
  for (const [selector, delay, duration, distance] of beats) {
    const el = typeof selector === 'string' ? root.querySelector(selector) : selector;
    if (!el?.animate) continue;
    const frames = [{ opacity: 0 }, { opacity: 1 }];
    if (distance) {
      frames[0].transform = `translateY(${distance}px)`;
      frames[1].transform = 'translateY(0)';
    }
    animations.push(el.animate(frames, { delay, duration, easing: ease, fill: 'backwards' }));
  }
  // Interaction always wins over the entrance; cancel restores the visible CSS
  // end state immediately. Nothing queues, blocks focus or delays navigation.
  const finish = () => {
    animations.forEach((animation) => animation.cancel());
    root.removeEventListener('pointerdown', finish, true);
    root.removeEventListener('focusin', finish, true);
  };
  root.addEventListener('pointerdown', finish, true);
  root.addEventListener('focusin', finish, true);
  Promise.allSettled(animations.map((animation) => animation.finished)).then(finish);
  return finish;
}

// Staggered soft roll/crossfade for in-place content swaps (EN<->DE, cups<->g).
// Transform + opacity only, zero layout shift, ~210-340ms total settle, and
// reduced-motion safe. Rapid taps cancel any in-flight swap immediately.
const LANG_ROLL_SELECTOR = [
  '.cover-title',
  '.cover-open',
  '.contents-title',
  '.toc-text',
  '.running-title',
  '.hero .eyebrow',
  '.recipe-title',
  '.fallback-note',
  '.stats',
  '.intro',
  '.menu-title',
  '.scaler-unit',
  '.scale-note',
  '.ing-group-title',
  '.ing-what',
  '.ing-how-live',
  '.ticket-title',
  '.equipment',
  '.step-body',
  '.tip-title',
  '.tip > p',
  '.macros-head',
  '.macros-cell',
  '.credits .source',
  '.credits .small-credit',
  '.photo-credit',
].join(', ');

const LANG_FADE_SELECTOR = '.tagline, .scaler-chip--custom, .credits .btn';

export function swapContent(faces, kind, animRef) {
  animRef?.current?.cancel();
  if (animRef) animRef.current = null;
  if (!faces?.length || reducedMotion()) return null;

  const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const DURATION = 210;
  const STEP = 16;
  const MAX_STAGGER_STEPS = 7; // max delay 112ms -> 112 + 210 = 322ms (200-350ms)
  const animations = [];
  let cancelled = false;
  let maxEnd = 0;

  const isVisible = (el, viewRect) => {
    if (!viewRect || typeof el.getBoundingClientRect !== 'function') return true;
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.bottom >= viewRect.top - 40 && r.top <= viewRect.bottom + 40;
  };

  for (const face of faces) {
    if (!face?.querySelectorAll) continue;
    const scroller = face.querySelector?.('.face-scroll') || face;
    const viewRect = typeof scroller.getBoundingClientRect === 'function' ? scroller.getBoundingClientRect() : null;
    const hasView = viewRect && viewRect.height > 0;

    if (kind === 'units') {
      const items = [...face.querySelectorAll('[data-swappable="true"]')].filter((el) =>
        isVisible(el, hasView ? viewRect : null),
      );
      items.forEach((item, i) => {
        const delay = Math.min(i, MAX_STAGGER_STEPS) * STEP;
        const amt = item.querySelector?.('.ing-amount');
        const met = item.querySelector?.('.ing-metric');
        if (amt?.animate) {
          animations.push(
            amt.animate(
              [
                { opacity: 0, transform: 'perspective(180px) translateY(5px) rotateX(-26deg)' },
                { opacity: 1, transform: 'perspective(180px) translateY(0) rotateX(0deg)' },
              ],
              { duration: DURATION, delay, easing: EASE, fill: 'backwards' },
            ),
          );
          maxEnd = Math.max(maxEnd, delay + DURATION);
        }
        if (met?.animate) {
          const metDelay = delay + 16;
          animations.push(
            met.animate(
              [
                { opacity: 0, transform: 'perspective(180px) translateY(-4px) rotateX(22deg)' },
                { opacity: 1, transform: 'perspective(180px) translateY(0) rotateX(0deg)' },
              ],
              { duration: DURATION, delay: metDelay, easing: EASE, fill: 'backwards' },
            ),
          );
          maxEnd = Math.max(maxEnd, metDelay + DURATION);
        }
      });
    } else if (kind === 'lang') {
      const rolls = new Set(face.querySelectorAll(LANG_ROLL_SELECTOR));
      const fades = new Set(face.querySelectorAll(LANG_FADE_SELECTOR));
      const all = [...face.querySelectorAll(`${LANG_ROLL_SELECTOR}, ${LANG_FADE_SELECTOR}`)].filter((el) =>
        isVisible(el, hasView ? viewRect : null),
      );
      all.forEach((el, i) => {
        if (!el?.animate) return;
        const delay = Math.min(i, MAX_STAGGER_STEPS) * STEP;
        const frames = fades.has(el) && !rolls.has(el)
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: 'translateY(5px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ];
        animations.push(el.animate(frames, { duration: DURATION, delay, easing: EASE, fill: 'backwards' }));
        maxEnd = Math.max(maxEnd, delay + DURATION);
      });
    }
  }

  if (!animations.length) return null;

  const controller = {
    animations,
    duration: maxEnd,
    cancel() {
      if (cancelled) return;
      cancelled = true;
      animations.forEach((anim) => anim.cancel());
      if (animRef?.current === controller) animRef.current = null;
    },
  };

  if (animRef) {
    animRef.current = controller;
    Promise.allSettled(animations.map((anim) => anim.finished)).then(() => {
      if (!cancelled && animRef.current === controller) animRef.current = null;
    });
  }

  return controller;
}

// Commit immediately, even when a previous snapshot is still being captured.
// A skipped transition's deferred callback must never replay an older choice.
export function transition(update) {
  const previous = activeTransition;
  if (previous) {
    previous.commit();
    previous.view.skipTransition();
    activeTransition = undefined;
  }
  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    flushSync(update);
  };
  if (typeof document === 'undefined' || !document.startViewTransition || reducedMotion()) {
    commit();
    return;
  }
  const record = { commit, view: null };
  try {
    record.view = document.startViewTransition(commit);
  } catch {
    commit();
    return;
  }
  activeTransition = record;
  // ready rejects when capture is skipped (including rapid repeated toggles).
  record.view.ready.catch(() => {});
  record.view.finished.catch(() => {}).finally(() => {
    if (activeTransition === record) activeTransition = undefined;
  });
  return record.view;
}
