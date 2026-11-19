import { useEffect, useRef, useState } from 'react';
import { amountsCreditFor } from './content.js';
import { CheckIcon } from './ornaments.jsx';
import { cx, useRecipeText } from './recipeUI.jsx';
import { scaleAmount, scaleStat } from './scale.js';
import { formatScaleBadge, recipeShareUrl, shareRecipe } from './share.js';
import { shareCopyFor } from './share-i18n.js';
import { amountsFor } from './units.js';
import { useScale } from './useScale.js';
import './idea-share.css';

function ShareIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M12 15V4m0 0-4 4m4-4 4 4M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Compact icon-only share button sitting beside the recipe number in RecipeHero.
// Uses navigator.share when available and falls back to clipboard copy.
export function ShareButton({ recipe, lang, measure = false }) {
  const { r } = useRecipeText(recipe, lang);
  const copy = shareCopyFor(lang);
  const [status, setStatus] = useState(''); // '' | 'shared' | 'copied' | 'failed'
  const timerRef = useRef(0);

  useEffect(() => {
    setStatus('');
    clearTimeout(timerRef.current);
  }, [recipe.slug]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const done = status === 'shared' || status === 'copied';
  const statusAnnouncement =
    status === 'shared'
      ? copy.shared
      : status === 'copied'
        ? copy.copied
        : status === 'failed'
          ? copy.copyFailed
          : '';

  const onShare = async () => {
    if (measure) return;
    const url = recipeShareUrl(recipe);
    const result = await shareRecipe({ title: r.title, url });
    if (result === 'shared' || result === 'copied' || result === 'failed') {
      setStatus(result);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setStatus(''), 1800);
    }
  };

  return (
    <>
      <button
        type="button"
        className={cx('share-btn', done && 'is-done')}
        aria-label={copy.shareTitle(r.title)}
        title={done ? statusAnnouncement : copy.share}
        onClick={onShare}
      >
        <span className="share-btn-face">
          <span className="share-btn-glyph" aria-hidden="true">
            <ShareIcon className="share-btn-icon" />
          </span>
          <span className="share-btn-done" aria-hidden="true">
            <CheckIcon className="share-btn-icon" strokeWidth={3} />
          </span>
        </span>
      </button>
      {!measure && (
        <span className="sr-only" aria-live="polite">
          {statusAnnouncement}
        </span>
      )}
    </>
  );
}

const scaleIngredient = (raw, factor, textLang, custom) =>
  factor === 1
    ? raw
    : {
        ...raw,
        amount: scaleAmount(raw.amount, factor, textLang, custom),
        metric: scaleAmount(raw.metric, factor, textLang, custom),
      };

// Hidden on screen, revealed only in @media print so printing from any spread
// (mobile or multi-spread desktop) produces one clean, ink-friendly A4 page
// in the active language, units, and portion scale.
export function PrintRecipe({ recipe, lang, units }) {
  const { r, textLang, fallback, t } = useRecipeText(recipe, lang);
  const { factor, custom } = useScale(recipe);
  const copy = shareCopyFor(lang);
  const credit = amountsCreditFor(recipe, lang);
  const s = recipe.source;

  const totalItems = r.groups.reduce((sum, g) => sum + g.items.length, 0);
  const totalStepChars = r.steps.reduce(
    (sum, step) => sum + step.text.length + (step.cue ? step.cue.length : 0),
    0,
  );
  const dense = totalItems > 14 || r.steps.length > 7 || totalStepChars > 1350;

  const nutrition = recipe.nutrition;
  const numFmt = new Intl.NumberFormat(lang, { maximumFractionDigits: 1, useGrouping: false });
  const macroNoun = nutrition?.serving_basis?.match(/^\d+\s+(squares|rolls|slices)\b/)?.[1];
  const macroBasis = nutrition ? t.macroBasis[macroNoun] || t.macroPerServing : '';
  const macroCells = nutrition
    ? [
        ['kcal', 'kcal'],
        ['protein', t.macroProtein],
        ['carbs', t.macroCarbs],
        ['fat', t.macroFat],
      ]
    : [];

  return (
    <article className={cx('print-sheet', dense && 'print-sheet--dense')} lang={lang}>
      <header className="print-head">
        <div className="print-kicker">
          <span>
            {t.bookTitleFlat} · {t.recipeNo} {recipe.no}
          </span>
          <span className="print-meta-badges">
            <span className="print-meta-pill">
              {units === 'metric' ? copy.printUnitsMetric : copy.printUnitsCups}
            </span>
            {factor !== 1 && (
              <span className="print-meta-pill">
                {copy.printScale(formatScaleBadge(factor, custom, lang))}
              </span>
            )}
          </span>
        </div>

        <div className="print-title-row">
          <h1 className="print-title" lang={textLang}>
            {r.title}
          </h1>
          {r.tagline && (
            <p className="print-tagline" lang={textLang}>
              {r.tagline}
            </p>
          )}
        </div>

        {r.stats?.length > 0 && (
          <ul className="print-stats" lang={textLang}>
            {r.stats.map((st, i) => (
              <li key={i}>
                <b>{scaleStat(st.value, factor, custom, textLang)}</b> {st.label}
              </li>
            ))}
          </ul>
        )}

        {r.intro && (
          <p className="print-intro" lang={textLang}>
            {r.intro}
          </p>
        )}

        {fallback && t.englishOnly && <p className="print-fallback">{t.englishOnly}</p>}
      </header>

      <div className="print-grid">
        <aside className="print-side">
          <section className="print-ing-card">
            <h2 className="print-section-title" lang={textLang}>
              {r.ingredients_headline}
            </h2>
            {factor !== 1 && <p className="print-scale-note">{t.scaleNote}</p>}
            {r.groups.map((g, gi) => (
              <div className="print-ing-group" key={gi}>
                {g.title && (
                  <h3 className="print-ing-group-title" lang={textLang}>
                    {g.title}
                  </h3>
                )}
                <ul className="print-ing-list" lang={textLang}>
                  {g.items.map((raw, ii) => {
                    const it = scaleIngredient(raw, factor, textLang, custom);
                    const { primary, secondary } = amountsFor(it, units);
                    return (
                      <li className="print-ing-row" key={ii}>
                        <span className="print-ing-what">
                          <span className="print-ing-name">{it.name}</span>
                          {it.note && <span className="print-ing-note">{it.note}</span>}
                        </span>
                        <span className="print-ing-how">
                          {primary && <span className="print-ing-primary">{primary}</span>}
                          {secondary && <span className="print-ing-secondary">{secondary}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          {r.equipment && (
            <p className="print-equip">
              <b>{t.equipment}:</b> <span lang={textLang}>{r.equipment}</span>
            </p>
          )}

          {nutrition && (
            <section className="print-macros">
              <div className="print-macros-head">
                <h2 className="print-macros-title">{t.macros}</h2>
                <p className="print-macros-basis">
                  {macroBasis}
                  {nutrition.servings > 1 && nutrition.total?.kcal != null && (
                    <>
                      {' · '}
                      {t.macroTotal} {numFmt.format(nutrition.total.kcal)} kcal
                    </>
                  )}
                  {' · '}
                  {t.macroNote}
                </p>
              </div>
              <dl className="print-macros-grid">
                {macroCells.map(([key, label]) => (
                  <div className="print-macros-cell" key={key}>
                    <dt>{label}</dt>
                    <dd>
                      {numFmt.format(nutrition.per_serving[key])}
                      {key !== 'kcal' && ' g'}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </aside>

        <section className="print-main">
          <div>
            <h2 className="print-section-title" lang={textLang}>
              {r.method_headline}
            </h2>
            <ol className="print-steps" lang={textLang}>
              {r.steps.map((step, i) => (
                <li className="print-step" key={i}>
                  <span className="print-step-num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="print-step-body">
                    <h3 className="print-step-title">{step.title}</h3>
                    <p>{step.text}</p>
                    {step.cue && (
                      <p className="print-step-cue">
                        → {step.cue}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {r.tips?.length > 0 && (
            <section className="print-tips" lang={textLang}>
              <h2 className="print-section-title">{t.tips}</h2>
              <div className="print-tips-grid">
                {r.tips.map((tip, i) => (
                  <div className="print-tip" key={i}>
                    <h3 className="print-tip-title">{tip.title}</h3>
                    <p>{tip.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>

      <footer className="print-foot">
        {(s?.author || s?.site) && (
          <p>
            {t.source}: {s.author}
            {s.author && s.site ? ', ' : ''}
            {s.site}
          </p>
        )}
        {credit ? (
          <p lang={credit.lang}>
            {credit.label}: {credit.src}
          </p>
        ) : recipe.conversions ? (
          <p>
            {t.conversions}:{' '}
            <span lang={r.conversions ? lang : 'en'}>{r.conversions || recipe.conversions}</span>
          </p>
        ) : null}
      </footer>
    </article>
  );
}
