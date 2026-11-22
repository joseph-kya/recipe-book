import { useEffect, useId, useRef, useState } from 'react';
import { canWake, useAwake } from './Awake.jsx';
import { FeedbackEntry } from './auth/FeedbackEntry.jsx';
import { SyncEntry } from './auth/SyncEntry.jsx';
import { authEnabled } from './auth/config.js';
import { clearDeviceData } from './clear-data.js';
import { settingsCopyFor } from './settings-i18n.js';
import { THEMES, THEME_IDS, useTheme } from './theme.js';
import { themeText } from './theme-i18n.js';
import './settings-sections.css';

// Endonyms in every language, paired with their BCP 47 lang tag.
const LANG_OPTIONS = [
  { value: 'en', label: 'English', lang: 'en' },
  { value: 'de', label: 'Deutsch', lang: 'de' },
  { value: 'fr', label: 'Français', lang: 'fr' },
];

const CLEAR_IDLE_MS = 6000;

function nextRadioIndex(key, index, length) {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % length;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + length) % length;
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  return -1;
}

function Segmented({ labelledBy, options, value, onChange }) {
  const btnRefs = useRef([]);
  const activeIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );

  const onKeyDown = (index) => (e) => {
    const next = nextRadioIndex(e.key, index, options.length);
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    btnRefs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="st-seg"
      style={{ '--st-seg-count': options.length, '--st-seg-index': activeIndex }}
    >
      <span className="st-seg-thumb" aria-hidden="true" />
      {options.map((opt, index) => {
        const checked = index === activeIndex;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              btnRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            lang={opt.lang}
            className="st-seg-btn"
            onClick={() => onChange(opt.value)}
            onKeyDown={onKeyDown(index)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SwatchPicker({ labelledBy, theme, onSelect, names, copy }) {
  const btnRefs = useRef([]);
  const [announced, setAnnounced] = useState(null);
  const activeIndex = Math.max(0, THEME_IDS.indexOf(theme));

  const choose = (id) => {
    onSelect(id);
    setAnnounced(id);
  };

  const onKeyDown = (index) => (e) => {
    const next = nextRadioIndex(e.key, index, THEME_IDS.length);
    if (next < 0) return;
    e.preventDefault();
    const id = THEME_IDS[next];
    choose(id);
    btnRefs.current[next]?.focus();
  };

  return (
    <div className="st-colours">
      <div role="radiogroup" aria-labelledby={labelledBy} className="st-swatches">
        {THEME_IDS.map((id, index) => {
          const checked = index === activeIndex;
          const name = names[id] || id;
          const swatchClass = `st-swatch${id === 'paper' ? ' st-swatch--paper' : ''}${id === 'ink' ? ' st-swatch--ink' : ''}`;
          return (
            <button
              key={id}
              ref={(el) => {
                btnRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={name}
              title={name}
              tabIndex={checked ? 0 : -1}
              className={swatchClass}
              onClick={() => choose(id)}
              onKeyDown={onKeyDown(index)}
            >
              <span
                className="st-swatch-fill"
                style={{ backgroundColor: THEMES[id].cover, color: THEMES[id].coverInk }}
              >
                {checked && (
                  <svg viewBox="0 0 20 20" className="st-swatch-check" aria-hidden="true" focusable="false">
                    <path
                      d="M4.5 10.5 8.3 14.3 15.8 6.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="st-theme-name">{names[theme] || theme}</p>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announced ? copy.themeNow(names[announced] || announced) : ''}
      </span>
    </div>
  );
}

function AwakeSection({ copy }) {
  const [awake, setAwake] = useAwake();
  const headingId = useId();
  const hintId = useId();

  return (
    <section className="st-section st-section--switch" aria-labelledby={headingId}>
      <h3 id={headingId} className="sr-only">
        {copy.awake}
      </h3>
      <button
        type="button"
        role="switch"
        aria-checked={awake}
        aria-labelledby={headingId}
        aria-describedby={hintId}
        className="st-switch-row"
        onClick={() => setAwake((v) => !v)}
      >
        <span className="st-switch-copy">
          <span className="st-heading st-switch-label" aria-hidden="true">
            {copy.awake}
          </span>
          <span id={hintId} className="st-hint">
            {copy.awakeHint}
          </span>
        </span>
        <span className="st-switch" aria-hidden="true">
          <span className="st-switch-knob" />
        </span>
      </button>
    </section>
  );
}

function DeviceSection({ copy }) {
  const [armed, setArmed] = useState(false);
  const headingId = useId();
  const hintId = useId();
  const clearBtnRef = useRef(null);

  useEffect(() => {
    if (!armed) return undefined;
    const timer = setTimeout(() => setArmed(false), CLEAR_IDLE_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  const onClearClick = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    clearDeviceData();
  };

  const onCancel = () => {
    setArmed(false);
    clearBtnRef.current?.focus();
  };

  return (
    <section className="st-section" aria-labelledby={headingId}>
      <h3 id={headingId} className="st-heading">
        {copy.device}
      </h3>
      <div className="st-clear-row">
        <button
          ref={clearBtnRef}
          type="button"
          className={`st-clear-btn${armed ? ' st-clear-btn--armed' : ''}`}
          aria-describedby={armed ? hintId : undefined}
          onClick={onClearClick}
        >
          {armed ? copy.clearConfirm : copy.clear}
        </button>
        {armed && (
          <button type="button" className="st-clear-cancel" onClick={onCancel}>
            {copy.clearCancel}
          </button>
        )}
      </div>
      <p id={hintId} className="st-hint st-clear-hint" aria-live="polite">
        {armed ? copy.clearHint : ''}
      </p>
    </section>
  );
}

export function SettingsSections({ lang, setLang, units, setUnits }) {
  const [theme, setTheme] = useTheme();
  const copy = settingsCopyFor(lang);
  const themeNames = (themeText[lang] || themeText.en).names;

  const langId = useId();
  const unitsId = useId();
  const coloursId = useId();
  const syncId = useId();
  const feedbackId = useId();

  const unitOptions = [
    { value: 'cups', label: copy.cups },
    { value: 'metric', label: copy.grams },
  ];

  return (
    <div className="st-sections">
      <section className="st-section" aria-labelledby={langId}>
        <h3 id={langId} className="st-heading">
          {copy.language}
        </h3>
        <Segmented labelledBy={langId} options={LANG_OPTIONS} value={lang} onChange={setLang} />
      </section>

      <section className="st-section" aria-labelledby={unitsId}>
        <h3 id={unitsId} className="st-heading">
          {copy.amounts}
        </h3>
        <Segmented labelledBy={unitsId} options={unitOptions} value={units} onChange={setUnits} />
      </section>

      <section className="st-section" aria-labelledby={coloursId}>
        <h3 id={coloursId} className="st-heading">
          {copy.colours}
        </h3>
        <SwatchPicker
          labelledBy={coloursId}
          theme={theme}
          onSelect={setTheme}
          names={themeNames}
          copy={copy}
        />
      </section>

      {canWake && <AwakeSection copy={copy} />}

      {authEnabled && (
        <section className="st-section" aria-labelledby={syncId}>
          <h3 id={syncId} className="st-heading">
            {copy.sync}
          </h3>
          <SyncEntry lang={lang} className="sync-entry--settings" />
          <p className="st-hint">{copy.syncHint}</p>
        </section>
      )}

      {authEnabled && (
        <section className="st-section" aria-labelledby={feedbackId}>
          <h3 id={feedbackId} className="st-heading">
            {copy.feedback}
          </h3>
          <FeedbackEntry lang={lang} className="fb-entry--settings" />
        </section>
      )}

      <DeviceSection copy={copy} />
    </div>
  );
}
