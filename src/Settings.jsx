// Lazily loaded Settings sheet. Bottom sheet on phones, centred card on wide
// screens; mirrors FeedbackSheet so the app has one sheet language.
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './ornaments.jsx';
import { SettingsSections } from './SettingsSections.jsx';
import { settingsCopyFor } from './settings-i18n.js';
import './settings.css';

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

export default function SettingsSheet({ lang, setLang, units, setUnits, onClose }) {
  const copy = settingsCopyFor(lang);
  const titleId = useId();
  const sheetRef = useRef(null);
  const closeRef = useRef(null);
  const [closing, setClosing] = useState(false);

  const close = () => {
    if (closing) return;
    setClosing(true);
  };

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Exit plays in CSS; the timer covers reduced motion and missed events.
  useEffect(() => {
    if (!closing) return undefined;
    const t = setTimeout(onClose, 240);
    return () => clearTimeout(t);
  }, [closing, onClose]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      // A nested portal (FeedbackSheet) handles its own Escape and marks it prevented.
      if (e.defaultPrevented) return;
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    // Ignore Tab events bubbling from a nested portal outside this dialog.
    if (e.defaultPrevented || !sheetRef.current?.contains(e.target)) return;
    const items = [...sheetRef.current.querySelectorAll(FOCUSABLE)].filter(
      (el) => !el.disabled && el.tabIndex >= 0 && !el.closest('[hidden], [inert]'),
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === sheetRef.current || !sheetRef.current.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="settings-layer"
      data-closing={closing || undefined}
      onPointerDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        ref={sheetRef}
        className="settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        lang={lang}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className="checkers checkers--cherry" aria-hidden="true" />
        <div className="settings-body">
          <div className="settings-head">
            <h2 id={titleId} className="settings-title">
              {copy.title}
            </h2>
            <button
              ref={closeRef}
              type="button"
              className="settings-close"
              aria-label={copy.close}
              onClick={close}
            >
              <CloseIcon className="settings-close-icon" />
            </button>
          </div>
          <SettingsSections lang={lang} setLang={setLang} units={units} setUnits={setUnits} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
