import { ui } from './i18n.js';
import { Arrow } from './ornaments.jsx';

export default function Controls({ lang, setLang, index, last, wide, onPrev, onNext }) {
  const t = ui[lang];
  return (
    <nav className={`controls ${wide ? 'controls--wide' : 'controls--narrow'}`} aria-label={t.bookTitleFlat}>
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
          {t.toContents}
        </a>
        <span className="ctl-count" aria-hidden="true">
          {index + 1}/{last + 1}
        </span>
        <div className="lang" role="group" aria-label={t.language}>
          {['en', 'de'].map((l) => (
            <button
              key={l}
              type="button"
              className="lang-btn"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              lang={l}
            >
              {l.toUpperCase()}
              <span className="sr-only">{l === 'en' ? ' – English' : ' – Deutsch'}</span>
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
