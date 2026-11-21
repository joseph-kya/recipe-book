import { useEffect, useMemo, useRef, useState } from 'react';
import { recipes } from './content.js';
import { ui } from './i18n.js';
import { Bell, Checkers, CloseIcon } from './ornaments.jsx';
import { primeAudio } from './timer.js';
import { ring as ringDing } from './audio.js';
import { themeText } from './theme-i18n.js';
import { cx, StepProgress } from './recipeUI.jsx';
import { getDoneStepCount, subscribeSteps } from './Method.jsx';
import { contentsText, filterRecipes } from './contents-find.js';
import { isFavorite, sortFavoritesFirst, subscribeFav } from './fav.js';
import { favCopyFor } from './fav-i18n.js';
import { FavMark } from './RecipeFav.jsx';
import { SyncEntry } from './auth/SyncEntry.jsx';
import { recipeHash } from './share.js';
import './cover-contents.css';

function SearchIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M15.5 15.5 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// A service bell by the contents heading: tap to ding, hold to keep ringing.
function ServiceBell({ lang }) {
  const copy = themeText[lang] || themeText.en;
  const [ring, setRing] = useState(''); // '' | 'ding' | 'held'
  const [announced, setAnnounced] = useState('');
  const [tick, setTick] = useState(0);
  const holdRef = useRef(0);
  const heldRef = useRef(false);

  useEffect(() => () => clearTimeout(holdRef.current), []);

  const ding = () => {
    void ringDing();
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    setRing('ding');
    setTick((n) => n + 1);
    setAnnounced(copy.ding);
  };
  const holdStart = (e) => {
    if (e.button !== 0) return;
    primeAudio();
    heldRef.current = false;
    clearTimeout(holdRef.current);
    holdRef.current = setTimeout(() => {
      heldRef.current = true;
      setRing('held');
      setAnnounced(copy.ringing);
    }, 450);
  };
  const holdEnd = () => {
    clearTimeout(holdRef.current);
    if (heldRef.current) setRing('');
  };

  return (
    <>
      <button
        type="button"
        className="service-bell-btn"
        aria-label={copy.ringBell}
        onClick={ding}
        onPointerDown={holdStart}
        onPointerUp={holdEnd}
        onPointerCancel={holdEnd}
        onPointerLeave={holdEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Bell key={ring === 'ding' ? tick : ring} className={cx('service-bell', ring && `service-bell--${ring}`)} />
      </button>
      <span className="sr-only" aria-live="polite">
        {announced}
      </span>
    </>
  );
}

// Wide: clean editorial title page for the contents spread.
export function ContentsLeft({ lang }) {
  const t = ui[lang];
  const copy = contentsText[lang] || contentsText.en;
  return (
    <div className="page-body contents-left">
      <Checkers tone="choc" edge="top" />
      <div className="contents-left-inner">
        <h1 className="contents-title">{t.contents}</h1>
        <p className="contents-count">{copy.recipeCount(recipes.length)}</p>
        <ServiceBell lang={lang} />
        <SyncEntry lang={lang} />
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

export function ContentsList({ lang, withTitle = false }) {
  const t = ui[lang];
  const copy = contentsText[lang] || contentsText.en;
  const favCopy = favCopyFor(lang);
  const [query, setQuery] = useState('');
  const [, setStepTick] = useState(0);
  const [favTick, setFavTick] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => subscribeSteps(() => setStepTick((n) => n + 1)), []);
  useEffect(() => subscribeFav(() => setFavTick((n) => n + 1)), []);

  const matches = useMemo(
    () => sortFavoritesFirst(filterRecipes(recipes, lang, query)),
    [lang, query, favTick],
  );
  const trimmed = query.trim();

  const clearQuery = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const onSearchKeyDown = (e) => {
    if (e.key === 'Escape' && query) {
      e.preventDefault();
      setQuery('');
    } else if (e.key === 'Enter' && matches.length > 0) {
      e.preventDefault();
      listRef.current?.querySelector('.toc-link')?.click();
    }
  };

  return (
    <div className="page-body contents">
      <Checkers tone="choc" edge="top" />
      <div className="page-pad">
        {withTitle && (
          <div className="contents-head">
            <h1 className="contents-title">{t.contents}</h1>
            <ServiceBell lang={lang} />
          </div>
        )}
        <div className="toc-find" role="search" aria-label={copy.findLabel}>
          <SearchIcon className="toc-find-icon" />
          <input
            ref={inputRef}
            type="search"
            className="toc-find-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={copy.findPlaceholder}
            aria-label={copy.findLabel}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          {query && (
            <button type="button" className="toc-find-clear" aria-label={copy.clearFind} onClick={clearQuery}>
              <CloseIcon className="toc-find-clear-icon" />
            </button>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {trimmed ? copy.matchCount(matches.length, recipes.length) : ''}
        </p>
        {matches.length > 0 ? (
          <ol ref={listRef} className="toc" aria-label={withTitle ? undefined : t.contents}>
            {matches.map(({ recipe: r, text, textLang, matchCue }) => {
              const totalSteps = text.steps.length;
              const doneCount = getDoneStepCount(r.slug);
              const fav = isFavorite(r.slug);
              return (
                <li key={r.slug}>
                  <a href={recipeHash(r)} className="toc-link">
                    <span className="toc-no" aria-hidden="true">
                      {r.no}
                    </span>
                    <span className="toc-text">
                      <span className="sr-only">
                        {t.recipeNo} {r.no}:{' '}
                      </span>
                      <span className="toc-title" lang={textLang}>
                        {text.title}
                      </span>
                      {fav && (
                        <span className="sr-only">
                          {', '}
                          {favCopy.favoriteBadge}
                        </span>
                      )}
                      {matchCue && (
                        <span className="toc-match" lang={textLang}>
                          {matchCue}
                        </span>
                      )}
                    </span>
                    {(doneCount > 0 || fav) && (
                      <span className="toc-trail">
                        <StepProgress className="toc-progress" doneCount={doneCount} totalSteps={totalSteps} />
                        {fav && <FavMark />}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="toc-empty">
            <p className="toc-empty-text">{copy.empty(trimmed)}</p>
            <button type="button" className="toc-empty-btn" onClick={clearQuery}>
              {copy.reset}
            </button>
          </div>
        )}
        {withTitle && <SyncEntry lang={lang} className="sync-entry--list" />}
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}
