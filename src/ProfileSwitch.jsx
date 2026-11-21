import { Suspense, lazy, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { getProfileView, subscribeFav } from './fav.js';
import { whoText } from './fav-i18n.js';

// Add / rename / delete only load when the switcher opens (warmed on press or
// focus), so the always-loaded part stays one compact line of markup.
const loadPanel = () => import('./ProfilePanel.jsx');
const ProfilePanel = lazy(loadPanel);
const warm = () => loadPanel().catch(() => {});

function EditPencil() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="who-edit-icon">
      <path
        d="M11.3 2.3a1.2 1.2 0 0 1 1.7 1.7l-7.2 7.2-2.6.7.7-2.6 7.4-7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProfilePill({ name, color, active = false, editable = false }) {
  const initial = (Array.from(name)[0] || '?').toUpperCase();
  return (
    <span className={`who-pill who-tone--${color}${active ? ' who-pill--active' : ''}`}>
      <span className="who-dot" aria-hidden="true">
        {initial}
      </span>
      <span className="who-name">{name}</span>
      {editable && <EditPencil />}
    </span>
  );
}

// One compact "who's baking?" switcher: closed it is a single handwritten cue
// plus the active diner chip ("baking as [M Me]"). Tapping replaces it in place
// with the inline row of profile chips and "+", so nothing duplicates or jumps.
export function ProfileSwitch({ lang, className = '' }) {
  const { profiles, active } = useSyncExternalStore(subscribeFav, getProfileView, getProfileView);
  const who = whoText[lang] || whoText.en;
  const [open, setOpen] = useState(false);
  const [openedByKey, setOpenedByKey] = useState(false);
  const [said, setSaid] = useState('');
  const rootRef = useRef(null);
  const toggleRef = useRef(null);
  const restoreFocusRef = useRef(false);
  const panelId = useId();
  const cur = profiles.find((p) => p.id === active) || profiles[0];
  const curName = cur.name || who.me;

  const close = useCallback((message = '', { restoreFocus = true } = {}) => {
    restoreFocusRef.current = restoreFocus;
    setOpen(false);
    setOpenedByKey(false);
    if (message) setSaid(message);
  }, []);

  useEffect(() => {
    if (!open) {
      if (restoreFocusRef.current) {
        restoreFocusRef.current = false;
        toggleRef.current?.focus({ preventScroll: true });
      }
      return;
    }
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) close('', { restoreFocus: false });
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close('', { restoreFocus: true });
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const trigger = (
    <button
      ref={toggleRef}
      type="button"
      className="who-trigger"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      onClick={(e) => {
        setOpenedByKey(e.detail === 0);
        setOpen(true);
      }}
      onPointerDown={warm}
      onFocus={warm}
    >
      <span className="who-lead">{who.lead}</span>
      <ProfilePill name={curName} color={cur.color} active />
    </button>
  );

  return (
    <div ref={rootRef} className={`who ${className}${open ? ' who--open' : ''}`}>
      {open ? (
        <div id={panelId} className="who-panel" role="group" aria-label={who.ask}>
          <Suspense fallback={trigger}>
            <ProfilePanel
              lang={lang}
              me={who.me}
              profiles={profiles}
              cur={cur}
              close={close}
              focusActive={openedByKey}
            />
          </Suspense>
        </div>
      ) : (
        trigger
      )}
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
    </div>
  );
}
