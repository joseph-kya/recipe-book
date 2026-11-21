// Lazily loaded open state of the "who's baking?" switcher (src/ProfileSwitch.jsx):
// inline row of profile chips (tap active chip again to rename/delete) plus "+" to add.
import { useEffect, useRef, useState } from 'react';
import { MAX_PROFILES, addProfile, deleteProfile, renameProfile, switchProfile } from './fav.js';
import { profileCopyFor } from './profile-i18n.js';
import { ProfilePill } from './ProfileSwitch.jsx';

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="who-svg">
      <path d="M8 3.25v9.5M3.25 8h9.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function CloseMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="who-svg">
      <path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="who-svg">
      <path
        d="M3.2 4.5h9.6M6.2 4.5V3.1a.9.9 0 0 1 .9-.9h1.8a.9.9 0 0 1 .9.9v1.4M4.8 4.5l.6 8.3a1 1 0 0 0 1 .9h3.2a1 1 0 0 0 1-.9l.6-8.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProfilePanel({ lang, me, profiles, cur, close, focusActive }) {
  const copy = profileCopyFor(lang);
  const [mode, setMode] = useState(''); // '' | 'add' | 'rename' | 'delete'
  const [draft, setDraft] = useState('');
  const activeRef = useRef(null);
  const nameOf = (p) => p.name || me;
  const curName = nameOf(cur);
  const canDelete = profiles.length > 1;

  useEffect(() => {
    if (focusActive && mode === '') activeRef.current?.focus({ preventScroll: true });
  }, [focusActive, mode]);

  const edit = (m) => {
    setDraft(m === 'rename' ? cur.name : '');
    setMode(m);
  };

  const submit = (e) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    if (mode === 'add' ? addProfile(name) : renameProfile(cur.id, name)) close(copy.now(name));
  };

  if (mode === 'add' || mode === 'rename') {
    const initial = (Array.from(draft.trim() || curName)[0] || '?').toUpperCase();
    return (
      <form className="who-form" onSubmit={submit}>
        {mode === 'rename' && (
          <span className={`who-dot who-dot--solo who-tone--${cur.color}`} aria-hidden="true">
            {initial}
          </span>
        )}
        <input
          className="who-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={copy.nameLabel}
          placeholder={copy.nameLabel}
          maxLength={24}
          autoComplete="off"
          enterKeyHint="done"
          autoFocus
        />
        <button type="submit" className="who-pill-btn who-pill-btn--primary" aria-disabled={!draft.trim() || undefined}>
          <span className="who-btn-pill">{copy.save}</span>
        </button>
        {mode === 'rename' && canDelete && (
          <button
            type="button"
            className="who-icon-btn who-icon-btn--danger"
            aria-label={copy.remove}
            title={copy.remove}
            onClick={() => setMode('delete')}
          >
            <span className="who-icon-circle" aria-hidden="true">
              <TrashIcon />
            </span>
          </button>
        )}
        <button
          type="button"
          className="who-icon-btn"
          aria-label={copy.cancel}
          title={copy.cancel}
          onClick={() => close()}
        >
          <span className="who-icon-circle" aria-hidden="true">
            <CloseMark />
          </span>
        </button>
      </form>
    );
  }

  if (mode === 'delete') {
    return (
      <div className="who-confirm-box">
        <p className="who-confirm">{copy.confirm(curName)}</p>
        <div className="who-confirm-actions">
          <button
            type="button"
            className="who-pill-btn who-pill-btn--primary"
            onClick={() => deleteProfile(cur.id) && close(copy.removed(curName))}
          >
            <span className="who-btn-pill">{copy.remove}</span>
          </button>
          <button type="button" className="who-pill-btn" autoFocus onClick={() => close()}>
            <span className="who-btn-pill who-btn-pill--soft">{copy.keep}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="who-row">
      {profiles.map((p, idx) => {
        const name = nameOf(p);
        const isActive = p.id === cur.id;
        return (
          <button
            key={p.id}
            ref={isActive ? activeRef : undefined}
            type="button"
            className="who-chip-btn"
            style={{ '--who-i': idx }}
            aria-pressed={isActive}
            aria-label={isActive ? copy.editChip(name, canDelete) : undefined}
            title={isActive ? copy.editChip(name, canDelete) : undefined}
            onClick={() => {
              if (isActive) {
                edit('rename');
              } else {
                switchProfile(p.id);
                close(copy.now(name));
              }
            }}
          >
            <ProfilePill name={name} color={p.color} active={isActive} editable={isActive} />
          </button>
        );
      })}
      {profiles.length < MAX_PROFILES && (
        <button
          type="button"
          className="who-add-btn"
          style={{ '--who-i': profiles.length }}
          aria-label={copy.add}
          title={copy.add}
          onClick={() => edit('add')}
        >
          <span className="who-add-circle" aria-hidden="true">
            <PlusIcon />
          </span>
        </button>
      )}
    </div>
  );
}
