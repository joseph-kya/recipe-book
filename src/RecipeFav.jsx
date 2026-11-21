import { useEffect, useRef, useState } from 'react';
import {
  decrementBaked,
  getBakedCount,
  incrementBaked,
  isFavorite,
  resetBaked,
  setBakedCount,
  subscribeFav,
  toggleFavorite,
} from './fav.js';
import { favCopyFor } from './fav-i18n.js';
import { cx } from './recipeUI.jsx';
import './idea-fav.css';

const HEART_PATH =
  'M12 20.4c-.3 0-.6-.1-.8-.3C7.1 16.5 3.5 13.3 3.5 9.2 3.5 6.4 5.7 4.2 8.4 4.2c1.5 0 2.9.7 3.6 1.9.7-1.2 2.1-1.9 3.6-1.9 2.7 0 4.9 2.2 4.9 5 0 4.1-3.6 7.3-7.7 10.9-.2.2-.5.3-.8.3Z';

function HeartIcon({ filled, className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        d={HEART_PATH}
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const UNDO_MS = 5000;

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="hero-reset-icon">
      <path
        d="M5.2 12a6.8 6.8 0 1 0 2-4.8M5 4.6v3.8h3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Tiny filled heart marker for favorited Contents rows.
export function FavMark() {
  return <HeartIcon filled className="toc-fav" />;
}

function useRecipeFav(slug) {
  const [, setTick] = useState(0);
  useEffect(
    () =>
      subscribeFav((changedSlug) => {
        if (!changedSlug || changedSlug === slug) setTick((n) => n + 1);
      }),
    [slug],
  );
  return {
    fav: isFavorite(slug),
    baked: getBakedCount(slug),
  };
}

// Subtle header controls: "baked it" tap counter + favorite heart.
export function RecipeFav({ recipe, lang, title, measure = false }) {
  const { fav, baked } = useRecipeFav(recipe.slug);
  const copy = favCopyFor(lang);
  const [pop, setPop] = useState(false);
  const [bump, setBump] = useState(0);
  const [announced, setAnnounced] = useState('');
  const [undoFrom, setUndoFrom] = useState(0);
  const holdRef = useRef(0);
  const heldRef = useRef(false);
  const undoTimerRef = useRef(0);
  const resetRef = useRef(null);
  const bakedRef = useRef(null);
  const copyRef = useRef(copy);
  copyRef.current = copy;

  useEffect(
    () => () => {
      clearTimeout(holdRef.current);
      clearTimeout(undoTimerRef.current);
    },
    [],
  );
  useEffect(() => {
    setPop(false);
    setBump(0);
    setAnnounced('');
    setUndoFrom(0);
    clearTimeout(undoTimerRef.current);
  }, [recipe.slug]);

  // The undo chip vanishes after a few seconds; keep keyboard focus on the
  // counter instead of dropping it to the page.
  const endUndo = () => {
    clearTimeout(undoTimerRef.current);
    if (resetRef.current && document.activeElement === resetRef.current) bakedRef.current?.focus();
    setUndoFrom(0);
  };

  const onReset = () => {
    if (undoFrom > 0) {
      const next = setBakedCount(recipe.slug, undoFrom);
      endUndo();
      setBump((n) => n + 1);
      setAnnounced(copy.bakedAnnounce(next));
      return;
    }
    const prev = resetBaked(recipe.slug);
    if (prev <= 0) return;
    setUndoFrom(prev);
    setAnnounced(copy.resetDone(prev));
    clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(endUndo, UNDO_MS);
  };

  const onToggleFav = () => {
    const next = toggleFavorite(recipe.slug);
    setPop(next);
    setAnnounced(next ? copy.favorited : copy.unfavorited);
  };

  const onBakedClick = (e) => {
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    if (undoFrom > 0) endUndo();
    if (e.shiftKey && baked > 0) {
      const next = decrementBaked(recipe.slug);
      setBump((n) => n + 1);
      setAnnounced(copy.bakedAnnounce(next));
      return;
    }
    const next = incrementBaked(recipe.slug);
    setBump((n) => n + 1);
    setAnnounced(copy.bakedAnnounce(next));
  };

  const onBakedPointerDown = (e) => {
    if (e.button !== 0 || baked <= 0) return;
    heldRef.current = false;
    clearTimeout(holdRef.current);
    holdRef.current = setTimeout(() => {
      heldRef.current = true;
      const next = decrementBaked(recipe.slug);
      setBump((n) => n + 1);
      setAnnounced(copyRef.current.bakedAnnounce(next));
    }, 520);
  };

  const clearHold = () => clearTimeout(holdRef.current);

  const countToken = `${baked}\u00d7`;
  const countText = baked > 0 ? copy.bakedCount(baked) : '';
  const splitIdx = baked > 0 ? countText.indexOf(countToken) : -1;

  return (
    <div className="hero-fav">
      {(baked > 0 || undoFrom > 0) && (
        <button
          ref={resetRef}
          type="button"
          className={cx('hero-reset-btn', undoFrom > 0 && 'hero-reset-btn--undo')}
          aria-label={undoFrom > 0 ? copy.undoLabel(undoFrom) : copy.resetLabel(title)}
          onClick={onReset}
        >
          {undoFrom > 0 ? <span aria-hidden="true">{copy.undo}</span> : <ResetIcon />}
        </button>
      )}
      <button
        ref={bakedRef}
        type="button"
        className={cx('hero-baked-btn', baked > 0 && 'hero-baked-btn--done')}
        aria-label={copy.bakedLabel(title, baked)}
        onClick={onBakedClick}
        onPointerDown={onBakedPointerDown}
        onPointerUp={clearHold}
        onPointerCancel={clearHold}
        onPointerLeave={clearHold}
        onContextMenu={(e) => {
          if (baked > 0) e.preventDefault();
        }}
      >
        <span className="hero-baked-pill" aria-hidden="true">
          <span className="hero-baked-text">
            {baked === 0 ? (
              copy.bakedIdle
            ) : splitIdx >= 0 ? (
              <>
                {countText.slice(0, splitIdx)}
                <span key={bump} className={cx('hero-baked-num', bump > 0 && 'hero-baked-num--bump')}>
                  {countToken}
                </span>
                {countText.slice(splitIdx + countToken.length)}
              </>
            ) : (
              countText
            )}
          </span>
        </span>
      </button>
      <button
        type="button"
        className="hero-fav-btn"
        aria-pressed={fav}
        aria-label={fav ? copy.unfavorite(title) : copy.favorite(title)}
        onClick={onToggleFav}
      >
        <HeartIcon
          filled={fav}
          className={cx('hero-fav-icon', pop && fav && 'hero-fav-icon--pop')}
        />
      </button>
      {!measure && (
        <span className="sr-only" aria-live="polite">
          {announced}
        </span>
      )}
    </div>
  );
}
