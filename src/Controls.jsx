import { useEffect, useLayoutEffect, useRef } from 'react';
import { ui } from './i18n.js';
import { flipLabel } from './motion.js';
import { Arrow } from './ornaments.jsx';
import { AwakeToggle } from './Awake.jsx';

function TapToggle({ value, text, label, className, onToggle }) {
  const labelRef = useRef(null);
  const animRef = useRef(null);
  const prevValue = useRef(value);

  useEffect(() => () => animRef.current?.cancel(), []);

  useLayoutEffect(() => {
    if (prevValue.current === value) return;
    prevValue.current = value;
    flipLabel(labelRef.current, { animRef });
  }, [value]);

  return (
    <button
      type="button"
      className={`ctl ctl--toggle ${className}`}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      <span ref={labelRef} className="ctl-flip">
        {text}
      </span>
    </button>
  );
}

export default function Controls({ lang, setLang, units, setUnits, index, last, wide, away, onShow, onPrev, onNext }) {
  const t = ui[lang];
  return (
    <nav
      className={`controls ${wide ? 'controls--wide' : 'controls--narrow'}${away ? ' controls--away' : ''}`}
      aria-label={t.bookTitleFlat}
      // Tabbing into the bar always brings it back on screen.
      onFocus={onShow}
    >
      <button
        type="button"
        className="ctl ctl--turn ctl--prev"
        onClick={(e) => onPrev(e.detail === 0)}
        disabled={index === 0}
        aria-label={t.prev}
      >
        <Arrow dir="left" />
      </button>

      <div className="ctl-middle">
        <a className="ctl ctl--contents" href="#/contents" aria-current={index === 1 ? 'page' : undefined}>
          {/* phones show the list icon; the word stays the link's name */}
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="ctl-icon">
            <path
              d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
          <span className="ctl-label">{t.toContents}</span>
        </a>
        <span className="ctl-count" aria-hidden="true">
          {index + 1}/{last + 1}
        </span>
        <TapToggle
          value={lang}
          text={lang.toUpperCase()}
          label={t.switchLang}
          className="lang-btn"
          onToggle={() => setLang(lang === 'en' ? 'de' : 'en')}
        />
        <TapToggle
          value={units}
          text={units === 'cups' ? t.unitCups : t.unitMetric}
          label={units === 'cups' ? t.switchToMetric : t.switchToCups}
          className="unit-btn"
          onToggle={() => setUnits(units === 'cups' ? 'metric' : 'cups')}
        />
        <AwakeToggle label={t.keepAwake} />
      </div>

      <button
        type="button"
        className="ctl ctl--turn ctl--next"
        onClick={(e) => onNext(e.detail === 0)}
        disabled={index === last}
        aria-label={t.next}
      >
        <Arrow dir="right" />
      </button>
    </nav>
  );
}
