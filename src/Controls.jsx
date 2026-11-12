import { ui } from './i18n.js';
import { Arrow } from './ornaments.jsx';

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
        onClick={onPrev}
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
        <div className="seg" role="group" aria-label={t.language}>
          {['en', 'de'].map((l) => (
            <button
              key={l}
              type="button"
              className="seg-btn lang-btn"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              lang={l}
            >
              {l.toUpperCase()}
              <span className="sr-only">{l === 'en' ? ' – English' : ' – Deutsch'}</span>
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label={t.units}>
          {[
            ['cups', t.unitCups, t.unitCupsLong],
            ['metric', t.unitMetric, t.unitMetricLong],
          ].map(([value, short, long]) => (
            <button
              key={value}
              type="button"
              className="seg-btn unit-btn"
              aria-pressed={units === value}
              onClick={() => setUnits(value)}
            >
              {short}
              <span className="sr-only"> – {long}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="ctl ctl--turn ctl--next"
        onClick={onNext}
        disabled={index === last}
        aria-label={t.next}
      >
        <Arrow dir="right" />
      </button>
    </nav>
  );
}
