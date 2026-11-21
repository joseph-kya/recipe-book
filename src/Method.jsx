import { memo, useMemo, useSyncExternalStore } from 'react';
import { CheckIcon, PlayIcon, ResetIcon, TimerIcon } from './ornaments.jsx';
import { ContMark, cx, StepProgress, useRecipeText } from './recipeUI.jsx';
import { readingCopyFor } from './recipe-reading-i18n.js';
import {
  MIN_SECONDS,
  STEP_SECONDS,
  adjustTimer,
  formatMinutes,
  formatRemaining,
  parseDuration,
  pauseTimer,
  primeAudio,
  resumeTimer,
  startTimer,
  stopTimer,
} from './timer.js';
import { useTimer } from './useTimer.js';
import './recipe-reading.css';
import './cook.css';

export const STEPS_KEY = 'recipe-book:steps:v1';
const EMPTY_STEPS = new Set();
const noopSubscribe = () => () => {};
const doneStepsBySlug = new Map();
const stepListeners = new Set();

function persistDoneSteps() {
  try {
    const entries = [...doneStepsBySlug]
      .filter(([, set]) => set.size > 0)
      .map(([slug, set]) => [slug, [...set].sort((a, b) => a - b)]);
    localStorage.setItem(STEPS_KEY, JSON.stringify(entries));
  } catch {
    /* Storage can be unavailable; step progress still works this visit. */
  }
}

function restoreDoneSteps() {
  try {
    const saved = JSON.parse(localStorage.getItem(STEPS_KEY));
    if (!Array.isArray(saved)) return;
    for (const row of saved) {
      if (!Array.isArray(row) || typeof row[0] !== 'string' || !Array.isArray(row[1])) continue;
      const valid = row[1].filter((n) => Number.isInteger(n) && n >= 0);
      if (valid.length) doneStepsBySlug.set(row[0], new Set(valid));
    }
  } catch {
    /* Ignore malformed or inaccessible storage. */
  }
}

restoreDoneSteps();

export function subscribeSteps(fn) {
  stepListeners.add(fn);
  return () => stepListeners.delete(fn);
}

export function getDoneStepCount(slug) {
  return doneStepsBySlug.get(slug)?.size ?? 0;
}

export function getDoneSteps(slug) {
  return new Set(doneStepsBySlug.get(slug));
}

export function setStepDone(slug, stepIndex, done = true) {
  const next = new Set(doneStepsBySlug.get(slug));
  if (done) next.add(stepIndex);
  else next.delete(stepIndex);
  if (next.size) doneStepsBySlug.set(slug, next);
  else doneStepsBySlug.delete(slug);
  persistDoneSteps();
  for (const sync of stepListeners) sync(slug);
}

export function toggleStepDone(slug, stepIndex) {
  setStepDone(slug, stepIndex, !doneStepsBySlug.get(slug)?.has(stepIndex));
}

export function clearDoneSteps(slug) {
  if (!doneStepsBySlug.get(slug)?.size) return;
  doneStepsBySlug.delete(slug);
  persistDoneSteps();
  for (const sync of stepListeners) sync(slug);
}

export function useDoneSteps(slug, disabled = false) {
  return useSyncExternalStore(
    disabled ? noopSubscribe : subscribeSteps,
    () => (disabled ? EMPTY_STEPS : doneStepsBySlug.get(slug) || EMPTY_STEPS),
  );
}

export const StepDot = memo(function StepDot({ stepIndex, done, label, onToggle }) {
  return (
    <button
      type="button"
      className="step-dot"
      aria-pressed={done}
      aria-label={label}
      onClick={onToggle}
    >
      <span className="step-num" aria-hidden="true">
        {stepIndex + 1}
      </span>
      <CheckIcon className="step-check" />
    </button>
  );
});

function TimerStateGlyph({ paused }) {
  return (
    <svg className="step-timer-state-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {paused ? (
        <path d="M4.5 2.5v11l8.5-5.5-8.5-5.5Z" fill="currentColor" />
      ) : (
        <path d="M4 2.5h3v11H4zm5 0h3v11H9z" fill="currentColor" />
      )}
    </svg>
  );
}

function StepTimerView({ timerKey, duration, t, state, remaining, seconds, total, measure = false }) {
  const prime = () => {
    if (!measure) primeAudio();
  };
  const toggle = () => {
    if (measure) return;
    if (state === 'running') pauseTimer(timerKey);
    else if (state === 'paused') {
      primeAudio();
      resumeTimer(timerKey);
    } else if (state === 'done') stopTimer(timerKey);
    else {
      primeAudio();
      startTimer(timerKey, seconds);
    }
  };
  const nudge = (delta) => {
    if (measure) return;
    if (state === 'idle') primeAudio();
    adjustTimer(timerKey, delta, duration.seconds);
  };
  const isActive = state === 'running' || state === 'paused';
  const left = isActive ? formatRemaining(remaining) : '';
  const idleText = seconds === duration.seconds ? duration.label : formatMinutes(seconds);
  const text = isActive ? left : state === 'done' ? t.timerDone : idleText;
  const label =
    state === 'running'
      ? t.timerPause(left)
      : state === 'paused'
        ? t.timerResume(left)
        : state === 'done'
          ? t.timerReset
          : t.timerStart(idleText);
  const canLess = (isActive ? remaining : seconds) > MIN_SECONDS;
  const progress = isActive && total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;
  return (
    <div className={`step-timer step-timer--${state}`} role="group" aria-label={t.timer}>
      {state !== 'done' && (
        <button
          type="button"
          className="step-timer-adj"
          aria-label={t.timerLess}
          disabled={!canLess}
          onPointerDown={measure ? undefined : prime}
          onClick={measure ? undefined : () => nudge(-STEP_SECONDS)}
        >
          <span aria-hidden="true">−</span>
        </button>
      )}
      <button
        type="button"
        className="step-timer-main"
        aria-label={label}
        aria-live={state === 'done' ? 'assertive' : 'off'}
        onPointerDown={measure ? undefined : prime}
        onClick={measure ? undefined : toggle}
      >
        <TimerIcon className="step-timer-icon" />
        <span className="step-timer-text">{text}</span>
        {isActive && <TimerStateGlyph paused={state === 'paused'} />}
        {isActive && (
          <span className="step-timer-bar" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />
        )}
      </button>
      {state !== 'done' && (
        <button
          type="button"
          className="step-timer-adj"
          aria-label={t.timerMore}
          onPointerDown={measure ? undefined : prime}
          onClick={measure ? undefined : () => nudge(STEP_SECONDS)}
        >
          <span aria-hidden="true">+</span>
        </button>
      )}
      {state === 'paused' && (
        <button
          type="button"
          className="step-timer-adj"
          aria-label={t.timerClear}
          onClick={() => stopTimer(timerKey)}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}

function StepTimerLive({ timerKey, duration, t }) {
  const { state, remaining, seconds, total } = useTimer(timerKey, duration.seconds);
  return (
    <StepTimerView
      timerKey={timerKey}
      duration={duration}
      t={t}
      state={state}
      remaining={remaining}
      seconds={seconds}
      total={total}
    />
  );
}

// A step that names a time gets a countdown: tap to start, pause or resume.
// Timers keep running across page turns and ring when they hit zero.
// −/+ move it a minute at a time, before or while it runs.
export const StepTimer = memo(function StepTimer({ timerKey, duration, t, measure = false }) {
  if (measure) {
    return (
      <StepTimerView
        timerKey={timerKey}
        duration={duration}
        t={t}
        state="idle"
        remaining={0}
        seconds={duration.seconds}
        total={duration.seconds}
        measure
      />
    );
  }
  return <StepTimerLive timerKey={timerKey} duration={duration} t={t} />;
});

const durationCache = new WeakMap();
function cachedDuration(step) {
  if (!step || typeof step !== 'object') return parseDuration(step?.text, step?.cue);
  if (durationCache.has(step)) return durationCache.get(step);
  const parsed = parseDuration(step.text, step.cue);
  durationCache.set(step, parsed);
  return parsed;
}

export const StepBody = memo(function StepBody({
  recipe,
  step,
  stepIndex,
  t,
  measure = false,
  headingLevel = 3,
  showTitle = true,
}) {
  const duration = cachedDuration(step);
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="step-body">
      {showTitle && <Heading className="step-title">{step.title}</Heading>}
      <p>{step.text}</p>
      {step.cue && (
        <p className="cue">
          {showTitle && <span aria-hidden="true">→ </span>}
          {step.cue}
        </p>
      )}
      {duration && (
        <StepTimer timerKey={`${recipe.slug}:${stepIndex}`} duration={duration} t={t} measure={measure} />
      )}
    </div>
  );
});

const StepRow = memo(function StepRow({ recipe, step, stepIndex, isDone, isCurrent, currentStepLabel, t, measure }) {
  return (
    <li
      className={cx('step', isDone && 'step--done', isCurrent && 'step--current')}
      data-step={stepIndex}
      aria-current={isCurrent ? 'step' : undefined}
    >
      <h3 className="step-head">
        <button
          type="button"
          className="step-head-btn"
          aria-pressed={isDone}
          onClick={measure ? undefined : () => toggleStepDone(recipe.slug, stepIndex)}
        >
          <span className="step-dot" aria-hidden="true">
            <span className="step-num">{stepIndex + 1}</span>
            <CheckIcon className="step-check" />
          </span>
          <span className="sr-only">
            {stepIndex + 1}. {isCurrent ? `${currentStepLabel}: ` : ''}
          </span>
          <span className="step-title">{step.title}</span>
        </button>
      </h3>
      <StepBody recipe={recipe} step={step} stepIndex={stepIndex} t={t} measure={measure} showTitle={false} />
    </li>
  );
});

const allStepsCache = new WeakMap();
function allStepIndices(steps) {
  let indices = allStepsCache.get(steps);
  if (!indices) {
    indices = steps.map((_, i) => i);
    allStepsCache.set(steps, indices);
  }
  return indices;
}

export default memo(function Method({ recipe, lang, steps, cont = false, measure = false, onStartCooking }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  const rt = readingCopyFor(lang);
  const doneSteps = useDoneSteps(recipe.slug, measure);

  const shown = useMemo(() => steps || allStepIndices(r.steps), [steps, r.steps]);
  const doneCount = doneSteps.size;
  const totalSteps = r.steps.length;
  const currentStepIndex =
    !measure && doneCount > 0 && doneCount < totalSteps
      ? r.steps.findIndex((_, idx) => !doneSteps.has(idx))
      : -1;
  const normalHead = (measure || !cont) && (
    <>
      <div className="ticket-head" data-head="normal">
        <h2 className="ticket-title" lang={textLang}>
          {r.method_headline}
        </h2>
        <StepProgress className="ticket-progress" doneCount={doneCount} totalSteps={totalSteps} />
      </div>
      <p className="equipment" data-head="normal">
        <b>{t.equipment}:</b> <span lang={textLang}>{r.equipment}</span>
      </p>
      <div className="ticket-cook" data-head="normal">
        <button
          type="button"
          className="btn btn--cherry cook-start-btn"
          onClick={measure ? undefined : (e) => onStartCooking?.(recipe, e.currentTarget)}
        >
          <PlayIcon className="btn-icon" />
          {t.startCooking}
        </button>
        <button
          type="button"
          className="cook-reset-btn"
          aria-label={t.resetSteps}
          title={t.resetSteps}
          disabled={measure || doneCount === 0}
          onClick={measure ? undefined : () => clearDoneSteps(recipe.slug)}
        >
          <ResetIcon className="btn-icon" />
        </button>
      </div>
    </>
  );
  const contHead = (measure || cont) && (
    <div className="ticket-head ticket-head--cont" data-head="cont">
      <h2 className="ticket-title ticket-title--cont" lang={textLang}>
        {r.method_headline}
        <ContMark t={t} lang={lang} />
      </h2>
      <StepProgress className="ticket-progress" doneCount={doneCount} totalSteps={totalSteps} />
    </div>
  );
  return (
    <section className="ticket" aria-label={cont ? `${t.method} ${t.cont}` : t.method} data-card="ticket">
      {measure ? (
        <>
          {normalHead}
          {contHead}
        </>
      ) : cont ? (
        contHead
      ) : (
        normalHead
      )}
      <ol className="steps" lang={textLang} start={shown[0] + 1}>
        {shown.map((i) => (
          <StepRow
            key={i}
            recipe={recipe}
            step={r.steps[i]}
            stepIndex={i}
            isDone={!measure && doneSteps.has(i)}
            isCurrent={i === currentStepIndex}
            currentStepLabel={rt.currentStep}
            t={t}
            measure={measure}
          />
        ))}
      </ol>
    </section>
  );
});
