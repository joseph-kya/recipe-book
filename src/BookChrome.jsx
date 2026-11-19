import { useSyncExternalStore } from 'react';
import { textFor } from './content.js';
import { computeStackDepths, getBookmark, subscribeBookmark } from './bookmark.js';
import { moreBookCopyFor } from './more-book-i18n.js';

export function useBookmark() {
  return useSyncExternalStore(subscribeBookmark, getBookmark, () => null);
}

function RibbonSvg({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 18 24" aria-hidden="true" focusable="false">
      <path
        d="M3 1.5h12v20.2l-6-4.5-6 4.5Z"
        className="book-ribbon-fill"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path
        d="M9 5.5v7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.32"
      />
    </svg>
  );
}

// Wide open-book physical chrome: hardcover cloth boards, stepped flat paper
// fore-edges that shift with reading progress, center spine fold, and the
// cloth ribbon tail tucked beneath the binding.
export function BookEdges({ wide, index, last, turn, hasBookmark }) {
  if (!wide) return null;
  const isOpeningCover = Boolean(turn && turn.lo === 0);
  const isClosed = index === 0 && !turn;
  const isOpen = !isClosed && !isOpeningCover;
  const depths = computeStackDepths(index, last);

  return (
    <div className="book-edges" aria-hidden="true">
      {isClosed && (
        <div className="book-closed-edge">
          <div className="book-closed-pages" />
        </div>
      )}
      {isOpen && (
        <>
          <div className="book-board" />
          <div className="book-stack book-stack--L" data-depth={depths.left} />
          <div className="book-stack book-stack--R" data-depth={depths.right} />
          {!turn && <div className="book-spine-seam" />}
          {hasBookmark && (
            <div className="book-ribbon-tail">
              <RibbonSvg className="book-ribbon-tail-svg" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Per-face flat paper details (cover cloth hinge, mobile spine binding strip,
// and crisp right-hand fore-edge pages). Purely decorative, never interactive.
export function FacePaperChrome({ wide, descType, hasMorePages }) {
  if (descType === 'cover') {
    return (
      <>
        <div className="book-cover-hinge" aria-hidden="true" />
        {!wide && <div className="book-fore-edge book-fore-edge--cover" aria-hidden="true" />}
      </>
    );
  }
  if (wide) return null;
  return (
    <>
      <div className="book-spine-strip" aria-hidden="true" />
      {hasMorePages && <div className="book-fore-edge" aria-hidden="true" />}
    </>
  );
}

// Printed cookbook folio (page number). Screen readers already receive the live
// page announcement on navigation, so the printed numeral stays decorative.
export function PageFolio({ folio, side }) {
  if (!folio) return null;
  return (
    <span className={`page-folio page-folio--${side}`} aria-hidden="true">
      <span className="page-folio-num">{folio}</span>
    </span>
  );
}

// Subtle cloth-ribbon bookmark hanging from the top edge on Cover & Contents,
// offering one-tap return to where the reader left off.
export function BookRibbon({ recipe, lang, surface, onResume }) {
  if (!recipe) return null;
  const copy = moreBookCopyFor(lang);
  const { text, lang: textLang } = textFor(recipe, lang);
  return (
    <div className={`book-ribbon book-ribbon--${surface}`}>
      <button
        type="button"
        className="book-ribbon-btn"
        title={copy.bookmarkTitle(text.title)}
        onClick={(e) => onResume(e.detail === 0)}
      >
        <RibbonSvg className="book-ribbon-icon" />
        <span className="book-ribbon-kicker">{copy.continueLabel}</span>
        <span className="book-ribbon-dot" aria-hidden="true">
          &middot;
        </span>
        <span className="book-ribbon-title" lang={textLang}>
          {text.title}
        </span>
        <span className="sr-only"> ({copy.leftOff})</span>
      </button>
    </div>
  );
}
