import { flushSync } from 'react-dom';

let activeTransition;

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  if (
    animate &&
    wasReady &&
    !wasHidden &&
    !reducedMotion() &&
    indicator.animate &&
    prevW > 0 &&
    nextW > 0 &&
    (Math.abs(prevX - nextX) > 0.5 || Math.abs(prevW - nextW) > 0.5)
  ) {
    const scaleX = prevW / nextW;
    const anim = indicator.animate(
      [
        { transform: `translateX(${prevX}px) scaleX(${scaleX})` },
        { transform: `translateX(${nextX}px) scaleX(1)` },
      ],
      {
        duration: 230,
        easing: 'cubic-bezier(0.32, 1.26, 0.56, 1)',
      },
    );
    if (animRef) {
      animRef.current = anim;
      anim.finished.catch(() => {}).finally(() => {
        if (animRef.current === anim) animRef.current = null;
      });
    }
  }
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
