import { useId, useState, useSyncExternalStore } from 'react';
import { syncCopyFor } from '../fav-i18n.js';
import { authEnabled } from './config.js';
import { getSession, prefetchSync, signIn, signOut, subscribeSession } from './session.js';

function Avatar({ profile }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="sync-avatar" aria-hidden="true">
      {profile?.photo && !broken ? (
        <img src={profile.photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        profile?.initial
      )}
    </span>
  );
}

// Quiet Contents-page entry: "Sign in to sync", or avatar + sync status + sign
// out. Renders nothing (and Firebase is compiled out) without a Firebase config.
export function SyncEntry({ lang, className = '' }) {
  const { status, profile, sync, note } = useSyncExternalStore(subscribeSession, getSession, getSession);
  const hintId = useId();
  if (!authEnabled) return null;
  const copy = syncCopyFor(lang);
  const signedIn = status === 'in';
  const problem = signedIn ? { offline: copy.offline, error: copy.syncError }[sync] : note && copy[note];
  // Nothing claims "synced" until a sync has actually finished this visit.
  const statusText = signedIn
    ? problem || (sync === 'syncing' ? copy.syncing : sync === 'synced' && copy.synced)
    : note === 'signInError' && problem;

  return (
    <div className={`sync-entry ${className}`}>
      {signedIn && <Avatar profile={profile} />}
      {(signedIn || statusText) && (
        <span className="sync-status">
          {signedIn && <span className="sr-only">{copy.signedInAs(profile?.name)}. </span>}
          {statusText}
        </span>
      )}
      {signedIn ? (
        <button type="button" className="sync-btn" onClick={signOut}>
          {copy.signOut}
        </button>
      ) : (
        <button
          type="button"
          className="sync-btn"
          aria-describedby={hintId}
          aria-disabled={status === 'busy' || undefined}
          onClick={signIn}
          onPointerDown={prefetchSync}
          onFocus={prefetchSync}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="sync-icon">
            <path
              d="M7.2 18.5h9.9a3.9 3.9 0 0 0 .5-7.8 5.6 5.6 0 0 0-10.8 1.5 3.2 3.2 0 0 0 .4 6.3Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinejoin="round"
            />
          </svg>
          {status === 'busy' ? copy.signingIn : copy.signIn}
          <span id={hintId} hidden>
            {copy.signInHint}
          </span>
        </button>
      )}
      <span className="sr-only" aria-live="polite">
        {problem || ''}
      </span>
    </div>
  );
}
