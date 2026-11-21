import { Suspense, lazy, useId, useRef, useState, useSyncExternalStore } from 'react';
import { getProfileView, subscribeFav } from './fav.js';
import { whoText } from './fav-i18n.js';

// Add / rename / delete only load when the switcher opens (warmed on press or
// focus), so the always-loaded part stays one line of markup.
const loadPanel = () => import('./ProfilePanel.jsx');
const ProfilePanel = lazy(loadPanel);
const warm = () => loadPanel().catch(() => {});

export function Chip({ name, color }) {
  return (
    <span className={`who-chip who-chip--${color}`} aria-hidden="true">
      {Array.from(name)[0].toUpperCase()}
    </span>
  );
}

// Quiet "who's baking?" switcher: each profile has its own hearts and baked
// counts. Collapsed it is one line (chip + name); tapping opens the profile
// chips plus add / rename / delete inline, with no popover to position.
export function ProfileSwitch({ lang, className = '' }) {
  const { profiles, active } = useSyncExternalStore(subscribeFav, getProfileView, getProfileView);
  const who = whoText[lang] || whoText.en;
  const [open, setOpen] = useState(false);
  const [said, setSaid] = useState('');
  const toggleRef = useRef(null);
  const panelId = useId();
  const cur = profiles.find((p) => p.id === active) || profiles[0];
  const curName = cur.name || who.me;

  const close = (message = '') => {
    setOpen(false);
    setSaid(message);
    toggleRef.current?.focus();
  };

  return (
    <div
      className={`who ${className}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.preventDefault();
          close();
        }
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        className="sync-btn who-toggle"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        onPointerDown={warm}
        onFocus={warm}
      >
        <span className="who-ask">{who.ask}</span>
        <Chip name={curName} color={cur.color} />
        <span className="who-name">{curName}</span>
      </button>
      {open && (
        <div id={panelId} className="who-panel" role="group" aria-label={who.ask}>
          <Suspense fallback={null}>
            <ProfilePanel lang={lang} me={who.me} profiles={profiles} cur={cur} close={close} />
          </Suspense>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
    </div>
  );
}
