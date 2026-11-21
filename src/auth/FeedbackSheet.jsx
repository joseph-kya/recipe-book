// Lazily loaded sheet for "send feedback" and "suggest a recipe". Bottom
// sheet on phones, a centred card on wide screens. Sends one create-only doc
// through the lazy sync chunk; the suggested link is stored, never fetched.
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '../ornaments.jsx';
import { COLLECTIONS, LIMITS, checkFeedback, checkSuggestion } from './feedback.js';
import { sheetCopyFor } from './feedback-i18n.js';
import { getSession, loadSync } from './session.js';
import './feedback.css';

const FOCUSABLE = 'button, input, textarea, [tabindex]:not([tabindex="-1"])';
const NEAR_LIMIT = 200;

function Field({ id, label, error, errorText, children, extra }) {
  return (
    <div className="fb-field">
      <label className="fb-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {(error || extra) && (
        <div className="fb-under">
          {error && (
            <p id={`${id}-err`} className="fb-error">
              {errorText}
            </p>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}

export default function FeedbackSheet({ kind, route, lang, onClose }) {
  const copy = sheetCopyFor(lang);
  const mode = copy[kind];
  const isFeedback = kind === 'feedback';
  const ids = useId();
  const sheetRef = useRef(null);
  const sentRef = useRef(null);
  const [values, setValues] = useState({ text: '', url: '', note: '', route });
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState('edit'); // edit | sending | sent | failed
  const [closing, setClosing] = useState(false);

  const check = () => (isFeedback ? checkFeedback : checkSuggestion)({ ...values, lang });
  const errors = tried ? check().errors : {};
  const signedIn = getSession().status === 'in';

  const close = () => {
    if (closing) return;
    setClosing(true);
  };

  // Exit plays in CSS; the timer covers reduced motion and missed events.
  useEffect(() => {
    if (!closing) return undefined;
    const t = setTimeout(onClose, 240);
    return () => clearTimeout(t);
  }, [closing, onClose]);

  useEffect(() => {
    if (status === 'sent') sentRef.current?.focus();
  }, [status]);

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (status === 'failed') setStatus('edit');
  };

  const submit = (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    setTried(true);
    const { errors: errs, doc } = check();
    if (!doc) {
      const first = Object.keys(errs)[0];
      document.getElementById(`${ids}-${first}`)?.focus();
      return;
    }
    setStatus('sending');
    loadSync()
      .then((m) => m.submit(COLLECTIONS[kind], doc))
      .then(
        () => setStatus('sent'),
        () => setStatus('failed'),
      );
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...sheetRef.current.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === sheetRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const field = (key) => `${ids}-${key}`;
  const describe = (key, more) => [errors[key] && `${field(key)}-err`, more].filter(Boolean).join(' ') || undefined;
  const left = LIMITS.text - values.text.length;
  const titleId = `${ids}-title`;

  return createPortal(
    <div
      className="fb-layer"
      data-closing={closing || undefined}
      onPointerDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        ref={sheetRef}
        className="fb-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        lang={lang}
        onKeyDown={onKeyDown}
      >
        <div className="checkers checkers--cherry" aria-hidden="true" />
        <div className="fb-body">
          <div className="fb-head">
            <h2 id={titleId} className="fb-title">
              {status === 'sent' ? copy.sentTitle : mode.title}
            </h2>
            <button type="button" className="fb-close" aria-label={copy.close} onClick={close}>
              <CloseIcon className="fb-close-icon" />
            </button>
          </div>

          {status === 'sent' ? (
            <div className="fb-sent">
              <p ref={sentRef} className="fb-intro" tabIndex={-1}>
                {mode.sent}
              </p>
              <button type="button" className="fb-send" onClick={close}>
                {copy.done}
              </button>
            </div>
          ) : (
            <form className="fb-form" onSubmit={submit} noValidate>
              <p className="fb-intro">{mode.intro}</p>
              {isFeedback ? (
                <>
                  <Field
                    id={field('text')}
                    label={copy.textLabel}
                    error={errors.text}
                    errorText={copy[errors.text]}
                    extra={
                      left <= NEAR_LIMIT && (
                        <p id={`${field('text')}-left`} className="fb-count" aria-live="polite">
                          {copy.left(Math.max(0, left))}
                        </p>
                      )
                    }
                  >
                    <textarea
                      id={field('text')}
                      className="fb-input fb-input--area"
                      rows={5}
                      maxLength={LIMITS.text}
                      value={values.text}
                      onChange={set('text')}
                      aria-invalid={errors.text ? true : undefined}
                      aria-describedby={describe('text', left <= NEAR_LIMIT && `${field('text')}-left`)}
                      autoFocus
                    />
                  </Field>
                  <Field id={field('route')} label={copy.pageLabel}>
                    <input
                      id={field('route')}
                      className="fb-input"
                      value={values.route}
                      onChange={set('route')}
                      maxLength={LIMITS.route}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field id={field('url')} label={copy.urlLabel} error={errors.url} errorText={copy[errors.url]}>
                    <input
                      id={field('url')}
                      className="fb-input"
                      type="url"
                      inputMode="url"
                      placeholder="https://"
                      value={values.url}
                      onChange={set('url')}
                      maxLength={LIMITS.url}
                      autoComplete="url"
                      autoCapitalize="off"
                      spellCheck={false}
                      aria-invalid={errors.url ? true : undefined}
                      aria-describedby={describe('url')}
                      autoFocus
                    />
                  </Field>
                  <Field id={field('note')} label={copy.noteLabel} error={errors.note} errorText={copy[errors.note]}>
                    <textarea
                      id={field('note')}
                      className="fb-input fb-input--area"
                      rows={3}
                      maxLength={LIMITS.note}
                      placeholder={copy.notePlaceholder}
                      value={values.note}
                      onChange={set('note')}
                      aria-invalid={errors.note ? true : undefined}
                      aria-describedby={describe('note')}
                    />
                  </Field>
                </>
              )}
              <p className="fb-fine">{signedIn ? copy.withId : copy.anon}</p>
              <p className="fb-error fb-error--send" role="alert">
                {status === 'failed' ? copy.failed : ''}
              </p>
              <button type="submit" className="fb-send" aria-disabled={status === 'sending' || undefined}>
                {status === 'sending' ? copy.sending : mode.send}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
