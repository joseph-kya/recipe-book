import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, PlayIcon, ResetIcon, TimerIcon } from './ornaments.jsx';
import { ContMark, cx, StepProgress, useRecipeText } from './recipeUI.jsx';
import { readingCopyFor } from './recipe-reading-i18n.js';
import { cookPrepCopyFor } from './more-cook-i18n.js';
import { scaleAmount } from './scale.js';
import { amountsFor } from './units.js';
import { useScale } from './useScale.js';
import {
  matchRecipeSteps,
  resetAutoStepLink,
  resolveLinkedStep,
  toggleStepLink,
  useActiveStep,
  usePrepItems,
  useSyncedUnits,
} from './more-cook.js';
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
import './more-cook.css';

export const STEPS_KEY = 'recipe-book:steps:v1';
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
  const nextDone = !doneStepsBySlug.get(slug)?.has(stepIndex);
  setStepDone(slug, stepIndex, nextDone);
  if (nextDone) resetAutoStepLink(slug);
}

export function clearDoneSteps(slug) {
  if (!doneStepsBySlug.get(slug)?.size) return;
  doneStepsBySlug.delete(slug);
  persistDoneSteps();
  resetAutoStepLink(slug);
  for (const sync of stepListeners) sync(slug);
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

// Small 3-row ingredient list icon (no chevrons).
function StepLinkIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <circle cx="3" cy="4" r="1.35" fill="currentColor" />
      <circle cx="3" cy="8" r="1.35" fill="currentColor" />
      <circle cx="3" cy="12" r="1.35" fill="currentColor" />
      <path d="M6.5 4h7M6.5 8h7M6.5 12h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
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

// A step that names a time gets a countdown: tap to start, pause or resume.
// Timers keep running across page turns and ring when they hit zero.
// −/+ move it a minute at a time, before or while it runs.
export function StepTimer({ timerKey, duration, t, measure = false }) {
  const { state, remaining, seconds, total } = useTimer(measure ? null : timerKey, duration.seconds);
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
          onPointerDown={prime}
          onClick={() => nudge(-STEP_SECONDS)}
        >
          <span aria-hidden="true">−</span>
        </button>
      )}
      <button
        type="button"
        className="step-timer-main"
        aria-label={label}
        aria-live={state === 'done' ? 'assertive' : 'off'}
        onPointerDown={prime}
        onClick={toggle}
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
          onPointerDown={prime}
          onClick={() => nudge(STEP_SECONDS)}
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

export function StepBody({
  recipe,
  step,
  stepIndex,
  t,
  measure = false,
  headingLevel = 3,
  showTitle = true,
  linkedIngredients = null,
  linkedLabel = '',
  textLang = undefined,
  onBodyClick = undefined,
}) {
  const duration = parseDuration(step.text, step.cue);
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const handleClick = onBodyClick
    ? (e) => {
        if (e.target.closest?.('button, a, input, select, textarea')) return;
        if (globalThis.getSelection?.()?.toString()) return;
        onBodyClick();
      }
    : undefined;
  return (
    <div className="step-body" onClick={handleClick}>
      {showTitle && <Heading className="step-title">{step.title}</Heading>}
      <p>{step.text}</p>
      {step.cue && (
        <p className="cue">
          {showTitle && <span aria-hidden="true">→ </span>}
          {step.cue}
        </p>
      )}
      {!measure && linkedIngredients && linkedIngredients.length > 0 && (
        <div className="step-ings" role="region" aria-label={linkedLabel}>
          <ul className="step-ings-list" lang={textLang}>
            {linkedIngredients.map((item) => (
              <li
                key={item.id}
                className={cx('step-ing-chip', item.prepped && 'step-ing-chip--prepped')}
              >
                {item.amount && <strong className="step-ing-amt">{item.amount}</strong>}
                <span className="step-ing-name">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {duration && (
        <StepTimer timerKey={`${recipe.slug}:${stepIndex}`} duration={duration} t={t} measure={measure} />
      )}
    </div>
  );
}

export default function Method({ recipe, lang, steps, cont = false, measure = false, onStartCooking }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  const rt = readingCopyFor(lang);
  const mc = cookPrepCopyFor(lang);
  const doneSteps = useDoneSteps(recipe.slug, measure);
  const activeStep = useActiveStep(recipe.slug, measure);
  const prepItems = usePrepItems(recipe.slug, measure);
  const { factor, custom } = useScale(recipe);
  const units = useSyncedUnits(measure);

  const shown = steps || r.steps.map((_, i) => i);
  const doneCount = doneSteps.size;
  const totalSteps = r.steps.length;
  const currentStepIndex =
    !measure && doneCount > 0 && doneCount < totalSteps
      ? r.steps.findIndex((_, idx) => !doneSteps.has(idx))
      : -1;

  const matchesByStep = useMemo(
    () => matchRecipeSteps(r.groups, r.steps, textLang),
    [r.groups, r.steps, textLang],
  );
  const linkedStepIndex = measure ? null : resolveLinkedStep(activeStep, currentStepIndex, matchesByStep);

  const itemsById = useMemo(() => {
    const map = new Map();
    r.groups.forEach((g, gi) => {
      g.items.forEach((raw, ii) => {
        const scaled =
          factor === 1
            ? raw
            : {
                ...raw,
                amount: scaleAmount(raw.amount, factor, textLang, custom),
                metric: scaleAmount(raw.metric, factor, textLang, custom),
              };
        const { primary } = amountsFor(scaled, units);
        map.set(`${gi}:${ii}`, { id: `${gi}:${ii}`, name: scaled.name, amount: primary });
      });
    });
    return map;
  }, [r.groups, factor, textLang, custom, units]);

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
          const isCurrent = i === currentStepIndex;
          const matchedIds = matchesByStep[i] || [];
          const hasIngs = matchedIds.length > 0;
          const isLinked = !measure && hasIngs && linkedStepIndex === i;
          const linkedList = isLinked
            ? matchedIds
                .map((id) => {
                  const info = itemsById.get(id);
                  return info ? { ...info, prepped: prepItems.has(id) } : null;
                })
                .filter(Boolean)
            : null;
          const onToggleLink =
            !measure && hasIngs
              ? () => toggleStepLink(recipe.slug, i, linkedStepIndex)
              : undefined;
          return (
            <li
              className={cx(
                'step',
                isDone && 'step--done',
                isCurrent && 'step--current',
                hasIngs && 'step--has-ings',
                isLinked && 'step--linked',
              )}
              key={i}
              data-step={i}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="step-head-row">
                <h3 className="step-head">
                  <button
                    type="button"
                    className="step-head-btn"
                    aria-pressed={isDone}
                    onClick={() => !measure && toggleStepDone(recipe.slug, i)}
                  >
                    <span className="step-dot" aria-hidden="true">
                      <span className="step-num">{i + 1}</span>
                      <CheckIcon className="step-check" />
                    </span>
                    <span className="sr-only">
                      {i + 1}. {isCurrent ? `${rt.currentStep}: ` : ''}
                    </span>
                    <span className="step-title">{s.title}</span>
                  </button>
                </h3>
                {hasIngs && (
                  <button
                    type="button"
                    className="step-link-btn"
                    aria-pressed={isLinked}
                    aria-label={mc.stepLinkLabel(i + 1, matchedIds.length, isLinked)}
                    title={mc.stepLinkLabel(i + 1, matchedIds.length, isLinked)}
                    onClick={onToggleLink}
                  >
                    <span className="step-link-pill" aria-hidden="true">
                      <StepLinkIcon className="step-link-icon" />
                      <span>{matchedIds.length}</span>
                    </span>
                  </button>
                )}
              </div>
              <StepBody
                recipe={recipe}
                step={s}
                stepIndex={i}
                t={t}
                measure={measure}
                showTitle={false}
                linkedIngredients={linkedList}
                linkedLabel={mc.stepIngredients(i + 1)}
                textLang={textLang}
                onBodyClick={onToggleLink}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
