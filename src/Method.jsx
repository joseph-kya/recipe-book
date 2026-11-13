import { useEffect, useState } from 'react';
import { CheckIcon, PlayIcon, TimerIcon } from './ornaments.jsx';
import { ContMark, cx, StepProgress, useRecipeText } from './recipeUI.jsx';
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

const doneStepsBySlug = new Map();
const stepListeners = new Set();

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
  doneStepsBySlug.set(slug, next);
  for (const sync of stepListeners) sync(slug);
}

export function toggleStepDone(slug, stepIndex) {
  setStepDone(slug, stepIndex, !doneStepsBySlug.get(slug)?.has(stepIndex));
}

export function useDoneSteps(slug, disabled = false) {
  const [doneSteps, setDoneSteps] = useState(() => getDoneSteps(slug));

  useEffect(() => {
    setDoneSteps(getDoneSteps(slug));
    if (disabled) return;
    const sync = (changedSlug) => {
      if (changedSlug === slug) setDoneSteps(getDoneSteps(slug));
    };
    return subscribeSteps(sync);
  }, [slug, disabled]);

  return doneSteps;
}

export function StepDot({ stepIndex, done, label, onToggle }) {
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
}

// A step that names a time gets a countdown: tap to start, pause or resume.
// Timers keep running across page turns and ring when they hit zero.
// −/+ move it a minute at a time, before or while it runs.
export function StepTimer({ timerKey, duration, t, measure = false }) {
  const { state, remaining, seconds } = useTimer(measure ? null : timerKey, duration.seconds);
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
  return (
    <div className={`step-timer step-timer--${state}`} role="group" aria-label={t.timer}>
      {state !== 'done' && (
        <button type="button" className="step-timer-adj" aria-label={t.timerLess} disabled={!canLess} onClick={() => nudge(-STEP_SECONDS)}>
          <span aria-hidden="true">−</span>
        </button>
      )}
      <button
        type="button"
        className="step-timer-main"
        aria-label={label}
        aria-live={state === 'done' ? 'assertive' : 'off'}
        onClick={toggle}
      >
        <TimerIcon className="step-timer-icon" />
        <span className="step-timer-text">{text}</span>
        {isActive && <span aria-hidden="true">{state === 'paused' ? '▶' : 'Ⅱ'}</span>}
      </button>
      {state !== 'done' && (
        <button type="button" className="step-timer-adj" aria-label={t.timerMore} onClick={() => nudge(STEP_SECONDS)}>
          <span aria-hidden="true">+</span>
        </button>
      )}
      {state === 'paused' && (
        <button type="button" className="step-timer-adj" aria-label={t.timerClear} onClick={() => stopTimer(timerKey)}>
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}

export function StepBody({ recipe, step, stepIndex, t, measure = false, headingLevel = 3 }) {
  const duration = parseDuration(step.text, step.cue);
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="step-body">
      <Heading className="step-title">{step.title}</Heading>
      <p>{step.text}</p>
      {step.cue && (
        <p className="cue">
          <span aria-hidden="true">→ </span>
          {step.cue}
        </p>
      )}
      {duration && (
        <StepTimer timerKey={`${recipe.slug}:${stepIndex}`} duration={duration} t={t} measure={measure} />
      )}
    </div>
  );
}

export default function Method({ recipe, lang, steps, cont = false, measure = false, onStartCooking }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  const doneSteps = useDoneSteps(recipe.slug, measure);

  const shown = steps || r.steps.map((_, i) => i);
  const doneCount = doneSteps.size;
  const totalSteps = r.steps.length;
  const normalHead = (
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
      </div>
    </>
  );
  const contHead = (
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
        {shown.map((i) => {
          const s = r.steps[i];
          const isDone = doneSteps.has(i);
          return (
            <li className={cx('step', isDone && 'step--done')} key={i} data-step={i}>
              <StepDot
                stepIndex={i}
                done={isDone}
                label={`${i + 1}. ${s.title}`}
                onToggle={() => !measure && toggleStepDone(recipe.slug, i)}
              />
              <StepBody recipe={recipe} step={s} stepIndex={i} t={t} measure={measure} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
