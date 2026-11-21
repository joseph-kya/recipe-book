// Lazily loaded body of the "who's baking?" switcher (src/ProfileSwitch.jsx):
// pick a profile, add one, rename or delete the active one (with a confirm).
import { useState } from 'react';
import { MAX_PROFILES, addProfile, deleteProfile, renameProfile, switchProfile } from './fav.js';
import { profileCopyFor } from './profile-i18n.js';
import { Chip } from './ProfileSwitch.jsx';

export default function ProfilePanel({ lang, me, profiles, cur, close }) {
  const copy = profileCopyFor(lang);
  const [mode, setMode] = useState(''); // '' | 'add' | 'rename' | 'delete'
  const [draft, setDraft] = useState('');
  const nameOf = (p) => p.name || me;
  const curName = nameOf(cur);

  const act = (label, onClick, extra) => (
    <button type="button" className="sync-btn who-act" onClick={onClick} {...extra}>
      {label}
    </button>
  );

  const edit = (m) => {
    setDraft(m === 'rename' ? cur.name : '');
    setMode(m);
  };

  const submit = (e) => {
    e.preventDefault();
    const name = draft.trim();
    if (mode === 'add' ? addProfile(name) : renameProfile(cur.id, name)) close(copy.now(name));
  };

  if (mode === 'add' || mode === 'rename') {
    return (
      <form className="who-row" onSubmit={submit}>
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
        <button type="submit" className="sync-btn who-act who-act--go" aria-disabled={!draft.trim() || undefined}>
          {copy.save}
        </button>
        {act(copy.cancel, () => close())}
      </form>
    );
  }

  if (mode === 'delete') {
    return (
      <div className="who-row">
        <p className="who-confirm">{copy.confirm(curName)}</p>
        {act(copy.remove, () => deleteProfile(cur.id) && close(copy.removed(curName)), {
          className: 'sync-btn who-act who-act--go',
        })}
        {act(copy.keep, () => close(), { autoFocus: true })}
      </div>
    );
  }

  return (
    <>
      <div className="who-row">
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            className="sync-btn who-pick"
            aria-pressed={p.id === cur.id}
            onClick={() => {
              switchProfile(p.id);
              close(p.id === cur.id ? '' : copy.now(nameOf(p)));
            }}
          >
            <Chip name={nameOf(p)} color={p.color} />
            {nameOf(p)}
          </button>
        ))}
      </div>
      <div className="who-row">
        {profiles.length < MAX_PROFILES && act(copy.add, () => edit('add'))}
        {act(copy.rename, () => edit('rename'))}
        {profiles.length > 1 && act(copy.remove, () => setMode('delete'))}
      </div>
    </>
  );
}
