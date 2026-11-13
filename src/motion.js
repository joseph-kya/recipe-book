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

// Flip a compact toggle's text on tap like a diner menu flap.
// Cancels any in-flight flip on rapid taps and stays static under reduced motion.
export function flipLabel(el, { animRef } = {}) {
  animRef?.current?.cancel();
  if (animRef) animRef.current = null;
  if (!el || reducedMotion() || !el.animate) return null;

  const anim = el.animate(
    [
      { opacity: 0.25, transform: 'perspective(160px) rotateX(-78deg) translateY(-2px)' },
      { opacity: 1, transform: 'perspective(160px) rotateX(10deg) translateY(0)', offset: 0.72 },
      { opacity: 1, transform: 'perspective(160px) rotateX(0deg) translateY(0)' },
    ],
    {
      duration: 240,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
    },
  );
  if (animRef) {
    animRef.current = anim;
    anim.finished.catch(() => {}).finally(() => {
      if (animRef.current === anim) animRef.current = null;
    });
  }
  return anim;
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
