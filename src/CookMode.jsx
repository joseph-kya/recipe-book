import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useHoldWakeLock } from './Awake.jsx';
import { reducedMotion } from './motion.js';
import { Arrow, Checkers, Cupcake } from './ornaments.jsx';
import { StepBody, setStepDone, toggleStepDone, useDoneSteps, useRecipeText } from './pages.jsx';
import { animateSpring, makeSpring, rubberband } from './spring.js';

const REBOUND_SPRING = makeSpring({ response: 0.28, damping: 0.88 });
const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function CookMode({ recipe, lang, initialStep = 0, onClose }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  const totalSteps = r.steps.length;
  const [stepIndex, setStepIndex] = useState(() => Math.min(Math.max(0, initialStep), totalSteps));
  const doneSteps = useDoneSteps(recipe.slug);

  const dialogRef = useRef(null);
  const stageRef = useRef(null);
  const cardRef = useRef(null);
  const doneHeadingRef = useRef(null);
  const dirRef = useRef(0);
  const mountedRef = useRef(false);
  const springRef = useRef(null);
  const stepAnimRef = useRef(null);
  const dragRef = useRef(null);

  // Hold a screen wake lock for as long as Cook mode is open; release on close.
  useHoldWakeLock(true);

  const isDoneScreen = stepIndex >= totalSteps;
  const currentStep = !isDoneScreen ? r.steps[stepIndex] : null;
  const isCurrentDone = !isDoneScreen && doneSteps.has(stepIndex);

  const stopMotion = useCallback(() => {
    springRef.current?.stop();
    springRef.current = null;
    stepAnimRef.current?.cancel();
    stepAnimRef.current = null;
    if (cardRef.current) cardRef.current.style.transform = '';
  }, []);

  const goNext = useCallback(() => {
    setStepIndex((cur) => {
      if (cur >= totalSteps) return cur;
      setStepDone(recipe.slug, cur, true);
      dirRef.current = 1;
      return cur + 1;
    });
  }, [recipe.slug, totalSteps]);

  const goPrev = useCallback(() => {
    setStepIndex((cur) => {
      if (cur <= 0) return cur;
      dirRef.current = -1;
      return cur - 1;
    });
  }, []);

  // Move focus into the dialog on open.
  useEffect(() => {
    dialogRef.current?.focus();
    return () => {
      springRef.current?.stop();
      stepAnimRef.current?.cancel();
    };
  }, []);

  // Animate step transitions (transform + opacity only) and keep focus valid on the Done screen.
  useLayoutEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (!reducedMotion() && dialogRef.current?.animate) {
        const anim = dialogRef.current.animate(
          [
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
        );
        return () => anim.cancel();
      }
      return;
    }

    stopMotion();
    const dir = dirRef.current;
    dirRef.current = 0;
    if (isDoneScreen) {
      doneHeadingRef.current?.focus();
    }
    if (dir && !reducedMotion() && cardRef.current?.animate) {
      const anim = cardRef.current.animate(
        [
          { opacity: 0.35, transform: `translateX(${dir * 26}px)` },
          { opacity: 1, transform: 'translateX(0)' },
        ],
        { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      );
      stepAnimRef.current = anim;
      anim.finished.catch(() => {}).finally(() => {
        if (stepAnimRef.current === anim) stepAnimRef.current = null;
      });
    }
  }, [stepIndex, isDoneScreen, stopMotion]);

  // Modal keyboard handling: trap Tab, Escape closes, ArrowLeft/ArrowRight turn steps.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = [...root.querySelectorAll(FOCUSABLE)].filter(
          (el) => el.offsetParent !== null || el.getClientRects().length > 0,
        );
        if (!focusables.length) {
          e.preventDefault();
          root.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables.at(-1);
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || active === root || !root.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last || !root.contains(active)) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        goPrev();
      }
    };

    addEventListener('keydown', onKeyDown, true);
    return () => removeEventListener('keydown', onKeyDown, true);
  }, [goNext, goPrev, onClose]);

  // Prevent vertical browser scroll once a horizontal swipe is underway.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onTouchMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const horizontal = d.decided || (Math.abs(d.dx) > 3 && Math.abs(d.dx) > Math.abs(d.dy));
      if (horizontal && e.cancelable) e.preventDefault();
    };
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => stage.removeEventListener('touchmove', onTouchMove);
  }, []);

  const reboundCard = (fromX, velocity = 0) => {
    if (reducedMotion() || !cardRef.current) {
      if (cardRef.current) cardRef.current.style.transform = '';
      return;
    }
    springRef.current?.stop();
    springRef.current = animateSpring({
      from: fromX,
      to: 0,
      velocity,
      spring: REBOUND_SPRING,
      restDelta: 0.4,
      restSpeed: 4,
      onUpdate: (x) => {
        if (cardRef.current) cardRef.current.style.transform = `translateX(${x}px)`;
      },
      onDone: () => {
        springRef.current = null;
        if (cardRef.current) cardRef.current.style.transform = '';
      },
    });
  };

  const onPointerDown = (e) => {
    if (!e.isPrimary || e.button !== 0 || dragRef.current) return;
    if (e.target.closest?.('button, a, input, select, textarea, [contenteditable]')) return;
    stopMotion();
    const width = stageRef.current?.getBoundingClientRect().width || innerWidth;
    dragRef.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      dx: 0,
      dy: 0,
      offset: 0,
      width,
      decided: false,
      samples: [{ x: e.clientX, t: performance.now() }],
    };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    const dxRaw = e.clientX - d.x0;
    const dyRaw = e.clientY - d.y0;
    d.dx = dxRaw;
    d.dy = dyRaw;

    if (!d.decided) {
      if (Math.abs(dxRaw) < 10 && Math.abs(dyRaw) < 10) return;
      if (Math.abs(dyRaw) >= Math.abs(dxRaw)) {
        dragRef.current = null;
        return;
      }
      d.decided = true;
      d.x0 = e.clientX;
      stageRef.current?.setPointerCapture?.(e.pointerId);
    }

    const now = performance.now();
    d.samples.push({ x: e.clientX, t: now });
    while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift();

    const dx = e.clientX - d.x0;
    d.dx = dx;
    if (!reducedMotion() && cardRef.current) {
      const canMove = (dx < 0 && !isDoneScreen) || (dx > 0 && stepIndex > 0);
      d.offset = canMove ? dx * 0.85 : rubberband(dx, d.width);
      cardRef.current.style.transform = `translateX(${d.offset}px)`;
    }
  };

  const onPointerUp = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    dragRef.current = null;
    if (!d.decided) return;
    if (stageRef.current?.hasPointerCapture?.(e.pointerId)) {
      stageRef.current.releasePointerCapture(e.pointerId);
    }

    const cancelled = e.type === 'pointercancel';
    const sm = d.samples;
    const now = performance.now();
    const stale = !sm.length || now - sm[sm.length - 1].t > 80;
    if (!cancelled && !stale) sm.push({ x: e.clientX, t: now });
    while (sm.length > 2 && now - sm[0].t > 100) sm.shift();
    const elapsed = sm.length > 1 ? (sm.at(-1).t - sm[0].t) / 1000 : 0;
    const v = cancelled || stale || elapsed === 0 ? 0 : (sm.at(-1).x - sm[0].x) / elapsed;
    const dx = (cancelled ? (sm.at(-1)?.x ?? d.x0) : e.clientX) - d.x0;

    if (!cancelled) {
      const threshold = Math.min(96, d.width * 0.2);
      const wantNext = (dx < -threshold && v <= 150) || (v < -320 && dx <= 0);
      const wantPrev = (dx > threshold && v >= -150) || (v > 320 && dx >= 0);
      if (wantNext && !isDoneScreen) {
        goNext();
        return;
      }
      if (wantPrev && stepIndex > 0) {
        goPrev();
        return;
      }
    }

    reboundCard(d.offset, v);
  };

  const progressRatio = totalSteps > 0 ? Math.min(1, (isDoneScreen ? totalSteps : stepIndex + 1) / totalSteps) : 1;
  const announcement = isDoneScreen
    ? t.cookDoneTitle
    : `${t.cookStepOf(stepIndex + 1, totalSteps)}: ${currentStep.title}`;

  return (
    <div
      ref={dialogRef}
      className="cook-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t.cookDialogLabel(r.title)}
      tabIndex={-1}
    >
      <Checkers tone="choc" edge="top" />

      <header className="cook-header">
        <div className="cook-header-text">
          <h1 className="cook-recipe-title" lang={textLang}>
            {r.title}
          </h1>
          {!isDoneScreen && (
            <span className="cook-progress">
              {t.cookStepOf(stepIndex + 1, totalSteps)}
            </span>
          )}
        </div>
        <button
          type="button"
          className="cook-close"
          aria-label={t.cookClose}
          title={t.cookClose}
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="cook-close-icon">
            <path
              d="M6 6l12 12M18 6 6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <div className="cook-bar" aria-hidden="true">
        <div className="cook-bar-fill" style={{ transform: `scaleX(${progressRatio})` }} />
      </div>

      <div
        ref={stageRef}
        className="cook-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {isDoneScreen ? (
          <div ref={cardRef} className="cook-card cook-card--done">
            <Cupcake className="cook-done-cupcake" />
            <h2 ref={doneHeadingRef} tabIndex={-1} className="cook-done-title">
              {t.cookDoneTitle}
            </h2>
            <p className="cook-done-body">{t.cookDoneBody}</p>
          </div>
        ) : (
          <div ref={cardRef} className={`cook-card${isCurrentDone ? ' cook-card--step-done' : ''}`} lang={textLang}>
            <div className="cook-card-top">
              <button
                type="button"
                className="step-dot"
                aria-pressed={isCurrentDone}
                aria-label={t.cookToggleDone(stepIndex + 1, isCurrentDone)}
                onClick={() => toggleStepDone(recipe.slug, stepIndex)}
              >
                <span className="step-num" aria-hidden="true">
                  {stepIndex + 1}
                </span>
                <svg className="step-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M5 12.5 9.5 17 19 7.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="cook-card-count" aria-hidden="true">
                {t.cookStepOf(stepIndex + 1, totalSteps)}
              </span>
            </div>
            <StepBody recipe={recipe} step={currentStep} stepIndex={stepIndex} t={t} headingLevel={2} />
          </div>
        )}
      </div>

      <footer className="cook-footer">
        <button
          type="button"
          className="btn btn--cream cook-nav-btn"
          disabled={stepIndex === 0}
          onClick={goPrev}
        >
          <Arrow dir="left" />
          <span>{t.cookPrev}</span>
        </button>

        {isDoneScreen ? (
          <button
            type="button"
            className="btn btn--cherry cook-nav-btn"
            onClick={onClose}
          >
            <span>{t.cookBackToRecipe}</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--cherry cook-nav-btn"
            onClick={goNext}
          >
            <span>{t.cookNext}</span>
            <Arrow dir="right" />
          </button>
        )}
      </footer>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}
