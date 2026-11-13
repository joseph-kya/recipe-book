import { useLayoutEffect, useRef } from 'react';
import { ui } from './i18n.js';
import { Arrow } from './ornaments.jsx';

function Segments({ label, options, value, onChange }) {
  const ref = useRef(null);
  const labels = options.map((option) => option.short).join('|');

  useLayoutEffect(() => {
    const group = ref.current;
    const buttons = [...group.querySelectorAll('button')];
    const indicator = group.querySelector('.seg-indicator');
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const active = group.querySelector('[aria-pressed="true"]');
      // Layout dimensions ignore the button's press transform. The absolute
      // indicator uses the group's padding box as its coordinate system.
      // Animate width on this tiny absolute element: the isolated layout cost
      // is acceptable to keep the pill's caps circular at every width.
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.transform = `translateX(${active.offsetLeft}px)`;
      group.dataset.ready = 'true';
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    buttons.forEach((button) => observer.observe(button));
    // Observe intrinsic label widths as well as the responsive group width.
    document.fonts.ready.then(measure);
    document.fonts.addEventListener('loadingdone', measure);
    return () => {
      disposed = true;
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', measure);
    };
  }, [value, labels]);

  return (
    <div ref={ref} className="seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`seg-btn ${option.className}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          lang={option.lang}
        >
          {option.short}
          <span className="seg-label-active" aria-hidden="true">{option.short}</span>
          <span className="sr-only"> – {option.long}</span>
        </button>
      ))}
      {/* Keep text unscaled; its active-colour copy crossfades over the pill. */}
      <span className="seg-indicator" aria-hidden="true" />
    </div>
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
        <Segments label={t.language} value={lang} onChange={setLang} options={[
          { value: 'en', short: 'EN', long: t.languageEnglish, lang: 'en', className: 'lang-btn' },
          { value: 'de', short: 'DE', long: t.languageGerman, lang: 'de', className: 'lang-btn' },
        ]} />
        <Segments label={t.units} value={units} onChange={setUnits} options={[
          { value: 'cups', short: t.unitCups, long: t.unitCupsLong, className: 'unit-btn' },
          { value: 'metric', short: t.unitMetric, long: t.unitMetricLong, className: 'unit-btn' },
        ]} />
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
