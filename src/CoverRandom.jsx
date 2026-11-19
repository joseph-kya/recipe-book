import { useCallback, useEffect, useRef, useState } from 'react';
import { recipes, textFor } from './content.js';
import { routeOfHash } from './layout.js';
import { recipeHash } from './share.js';
import { reducedMotion } from './motion.js';
import {
  SHUFFLE_STEP_MS,
  buildShuffleFrames,
  dieFaceForRecipe,
  formatRecipeNumber,
  getLastRandomSlug,
  holdDurationMs,
  pickRandomRecipe,
  randomCopyFor,
  setLastRandomSlug,
} from './random-recipe.js';
import './idea-random.css';

const PIPS = {
  1: [[12, 12]],
  2: [[8, 8], [16, 16]],
  3: [[8, 8], [12, 12], [16, 16]],
  4: [[8, 8], [16, 8], [8, 16], [16, 16]],
  5: [[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]],
  6: [[8, 7.5], [16, 7.5], [8, 12], [16, 12], [8, 16.5], [16, 16.5]],
};

function DieIcon({ face = 5, className = '' }) {
  const pips = PIPS[face] || PIPS[5];
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
      {pips.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.65" fill="currentColor" />
      ))}
    </svg>
  );
}

function OpenArrowIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3.5 8h9m0 0-3.25-3.25M12.5 8l-3.25 3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CoverRandom({ lang }) {
  const copy = randomCopyFor(lang);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'rolling' | 'landed'
  const [face, setFace] = useState(5);
  const [peekRecipe, setPeekRecipe] = useState(null);
  const [announced, setAnnounced] = useState('');
  const [rollId, setRollId] = useState(0);
  const timersRef = useRef([]);
  const langRef = useRef(lang);
  langRef.current = lang;

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  }, []);

  const resetShuffle = useCallback(() => {
    clearTimers();
    setPhase('idle');
    setPeekRecipe(null);
  }, [clearTimers]);

  useEffect(() => {
    const onHashChange = () => {
      if (routeOfHash(window.location.hash) !== '') resetShuffle();
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      clearTimers();
    };
  }, [clearTimers, resetShuffle]);

  if (!recipes.length) return null;

  const openRecipe = (recipe) => {
    if (!recipe?.slug) return;
    if (routeOfHash(window.location.hash) !== '') return;
    window.location.hash = recipeHash(recipe);
  };

  const handleOpenPicked = () => {
    if (phase !== 'landed' || !peekRecipe) return;
    const target = peekRecipe;
    clearTimers();
    setPhase('idle');
    setPeekRecipe(null);
    openRecipe(target);
  };

  const handleSurprise = () => {
    const winner = pickRandomRecipe(recipes, getLastRandomSlug());
    if (!winner) return;
    setLastRandomSlug(winner.slug);

    const winnerFace = dieFaceForRecipe(winner);
    const isReduced = reducedMotion();

    try {
      globalThis.navigator?.vibrate?.(12);
    } catch {
      /* optional haptics */
    }

    clearTimers();
    setRollId((n) => n + 1);

    const revealWinner = (holdMs) => {
      const activeLang = langRef.current;
      const landed = textFor(winner, activeLang);
      const noTag = formatRecipeNumber(winner, activeLang);
      const spoken = noTag ? `${noTag} ${landed.text.title}` : landed.text.title;
      setFace(winnerFace);
      setPeekRecipe(winner);
      setPhase('landed');
      setAnnounced(randomCopyFor(activeLang).opening(spoken));

      timersRef.current.push(
        setTimeout(() => {
          clearTimers();
          setPhase('idle');
          setPeekRecipe(null);
          openRecipe(winner);
        }, holdMs),
      );
    };

    if (isReduced) {
      revealWinner(holdDurationMs(true));
      return;
    }

    const frames = buildShuffleFrames(recipes, winner, 3);
    setPhase('rolling');

    const showFrame = (frame) => {
      setFace(frame.face);
      setPeekRecipe(frame.recipe);
    };

    if (frames.length > 0) {
      showFrame(frames[0]);
      for (let i = 1; i < frames.length; i++) {
        timersRef.current.push(setTimeout(() => showFrame(frames[i]), i * SHUFFLE_STEP_MS));
      }
    }

    const landAt = frames.length * SHUFFLE_STEP_MS;
    timersRef.current.push(setTimeout(() => revealWinner(holdDurationMs(false)), landAt));
  };

  const dieClass =
    phase === 'rolling'
      ? 'cover-random-die cover-random-die--rolling'
      : phase === 'landed'
        ? 'cover-random-die cover-random-die--landed'
        : 'cover-random-die';

  const btnClass =
    phase === 'idle' ? 'cover-random-btn' : `cover-random-btn cover-random-btn--${phase}`;

  const shown = peekRecipe ? textFor(peekRecipe, lang) : null;
  const noTag = peekRecipe ? formatRecipeNumber(peekRecipe, lang) : '';

  return (
    <div className="cover-random">
      <button
        type="button"
        className={btnClass}
        aria-label={phase === 'landed' ? copy.rerollAriaLabel : copy.ariaLabel}
        aria-busy={phase === 'rolling' || undefined}
        onClick={handleSurprise}
      >
        <span key={rollId} className={dieClass}>
          <DieIcon face={face} className="cover-random-die-svg" />
        </span>
        <span className="cover-random-label">{copy.label}</span>
      </button>
      {phase === 'rolling' && shown && (
        <div className="cover-random-slot" aria-hidden="true">
          <span className="cover-random-peek">
            {noTag && <span className="cover-random-peek-no">{noTag}</span>}
            <span className="cover-random-peek-title" lang={shown.lang}>
              {shown.text.title}
            </span>
          </span>
        </div>
      )}
      {phase === 'landed' && shown && (
        <div className="cover-random-slot">
          <button
            key={rollId}
            type="button"
            className="cover-random-pick"
            onClick={handleOpenPicked}
          >
            {noTag && <span className="cover-random-pick-no">{noTag}</span>}
            <span className="cover-random-pick-title" lang={shown.lang}>
              {shown.text.title}
            </span>
            <span className="sr-only"> — {copy.openNow}</span>
            <OpenArrowIcon className="cover-random-pick-arrow" />
          </button>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {announced}
      </span>
    </div>
  );
}
