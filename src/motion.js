import { flushSync } from 'react-dom';

let activeTransition;

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
