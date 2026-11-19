import { useCallback, useEffect, useRef, useState } from 'react';
import { recipes, textFor } from './content.js';
import { routeOfHash } from './layout.js';
import { reducedMotion } from './motion.js';
import {
  buildShuffleFrames,
  dieFaceForRecipe,
  getLastRandomSlug,
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

const SHUFFLE_STEP_MS = 85;
const LAND_HOLD_MS = 215;

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

export default function CoverRandom({ lang }) {
  const copy = randomCopyFor(lang);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'rolling' | 'landed'
  const [face, setFace] = useState(5);
  const [peek, setPeek] = useState(null); // { title, textLang } | null
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
    setPeek(null);
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
    if (!recipe?.route) return;
    if (routeOfHash(window.location.hash) !== '') return;
    window.location.hash = `#/${recipe.route}`;
  };

  const handleSurprise = () => {
    if (phase !== 'idle') return;
    const winner = pickRandomRecipe(recipes, getLastRandomSlug());
    if (!winner) return;
    setLastRandomSlug(winner.slug);

    const activeLang = langRef.current;
    const winnerCopy = textFor(winner, activeLang);
    const winnerFace = dieFaceForRecipe(winner);
    setAnnounced(copy.opening(winnerCopy.text.title));
    try {
      globalThis.navigator?.vibrate?.(12);
    } catch {
      /* optional haptics */
    }

    if (reducedMotion()) {
      setFace(winnerFace);
      openRecipe(winner);
      return;
    }

    const frames = buildShuffleFrames(recipes, winner, 3);
    clearTimers();
    setPhase('rolling');
    setRollId((n) => n + 1);

    const showFrame = (frame) => {
      const shown = textFor(frame.recipe, langRef.current);
      setFace(frame.face);
      setPeek({ title: shown.text.title, textLang: shown.lang });
    };

    if (frames.length > 0) {
      showFrame(frames[0]);
      for (let i = 1; i < frames.length; i++) {
        timersRef.current.push(setTimeout(() => showFrame(frames[i]), i * SHUFFLE_STEP_MS));
      }
    }

    const landAt = frames.length * SHUFFLE_STEP_MS;
    timersRef.current.push(
      setTimeout(() => {
        const landed = textFor(winner, langRef.current);
        setFace(winnerFace);
        setPeek({ title: landed.text.title, textLang: landed.lang });
        setPhase('landed');
      }, landAt),
    );

    timersRef.current.push(
      setTimeout(() => {
        clearTimers();
        setPhase('idle');
        setPeek(null);
        openRecipe(winner);
      }, landAt + LAND_HOLD_MS),
    );
  };

  const dieClass =
    phase === 'rolling'
      ? 'cover-random-die cover-random-die--rolling'
      : phase === 'landed'
        ? 'cover-random-die cover-random-die--landed'
        : 'cover-random-die';

  const btnClass =
    phase === 'idle' ? 'cover-random-btn' : `cover-random-btn cover-random-btn--${phase}`;

  return (
    <div className="cover-random">
      <button
        type="button"
        className={btnClass}
        aria-label={copy.ariaLabel}
        aria-busy={phase !== 'idle' || undefined}
        onClick={handleSurprise}
      >
        <span key={rollId} className={dieClass}>
          <DieIcon face={face} className="cover-random-die-svg" />
        </span>
        <span className="cover-random-label">{copy.label}</span>
      </button>
      {peek && (
        <span
          className={phase === 'landed' ? 'cover-random-peek cover-random-peek--landed' : 'cover-random-peek'}
          lang={peek.textLang}
          aria-hidden="true"
        >
          {peek.title}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {announced}
      </span>
    </div>
  );
}
