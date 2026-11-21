import { Suspense, lazy, useRef, useState } from 'react';
import { noteText } from '../fav-i18n.js';
import { authEnabled } from './config.js';

// The sheet (and its copy and CSS) only loads when an entry is pressed or
// focused; Firestore only loads when the sheet sends.
const loadSheet = () => import('./FeedbackSheet.jsx');
const FeedbackSheet = lazy(loadSheet);
const warm = () => loadSheet().catch(() => {});

// The entries live on Contents, but feedback is usually about the recipe the
// visitor just left. The book moves with pushState (no hashchange), so note the
// hash on every press or key before it changes.
let lastRecipe = '';
if (authEnabled && typeof document !== 'undefined') {
  const note = () => {
    if (location.hash.startsWith('#/r/')) lastRecipe = location.hash;
  };
  document.addEventListener('pointerdown', note, { capture: true, passive: true });
  document.addEventListener('keydown', note, { capture: true, passive: true });
}

function pageHint() {
  const hash = location.hash.startsWith('#/r/') ? location.hash : lastRecipe || location.hash;
  try {
    return decodeURIComponent(hash.replace(/^#\/?/, '')) || 'cover';
  } catch {
    return hash;
  }
}

// Two quiet text buttons under the sync entry. Hidden without a Firebase config.
export function FeedbackEntry({ lang, className = '' }) {
  const [open, setOpen] = useState(null); // null | { kind, route }
  const from = useRef(null);
  if (!authEnabled) return null;
  const t = noteText[lang] || noteText.en;

  const show = (kind) => (e) => {
    from.current = e.currentTarget;
    setOpen({ kind, route: pageHint() });
  };
  const close = () => {
    setOpen(null);
    from.current?.focus();
  };
  const entry = (kind, label) => (
    <button
      type="button"
      className="sync-btn"
      aria-haspopup="dialog"
      onClick={show(kind)}
      onPointerDown={warm}
      onFocus={warm}
    >
      {label}
    </button>
  );

  return (
    <div className={`sync-entry fb-entry ${className}`}>
      {entry('feedback', t.feedback)}
      {entry('suggestion', t.suggest)}
      {open && (
        <Suspense fallback={null}>
          <FeedbackSheet kind={open.kind} route={open.route} lang={lang} onClose={close} />
        </Suspense>
      )}
    </div>
  );
}
