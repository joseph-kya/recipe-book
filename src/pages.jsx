import { Fragment } from 'react';
import { amountsCreditFor, hashFor, pad, pages, recipes, textFor } from './content.js';
import { ui } from './i18n.js';
import { Burst, Checkers, Cupcake } from './ornaments.jsx';

/* ---------- Cover ---------- */

export function Cover({ lang }) {
  const t = ui[lang];
  return (
    <div className="page-body cover">
      <Checkers tone="choc" edge="top" />
      <div className="cover-inner">
        <p className="eyebrow cover-eyebrow">★ {t.coverEyebrow(recipes.length)} ★</p>
        <h1 className="cover-title" data-enter>
          <span>{t.bookTitle[0]}</span>
          <span>{t.bookTitle[1]}</span>
        </h1>
        <Cupcake className="cover-cupcake" />
        <Burst lines={t.coverSticker} className="cover-burst" />
        <p className="cover-note">{t.coverNote}</p>
        <a className="btn btn--cream" href={hashFor(1)}>
          {t.open}
        </a>
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

/* ---------- Contents ---------- */

function HowItWorks({ lang, compact }) {
  const t = ui[lang];
  return (
    <section className={`how ${compact ? 'how--compact' : ''}`} aria-label={t.howTitle}>
      {!compact && <h2 className="how-title">{t.howTitle}</h2>}
      <p className="how-cups">
        <span className="how-demo" aria-hidden="true">
          <span className="how-demo-cups">{t.demoCup}</span>
          <span className="how-demo-metric">240 ml</span>
        </span>
        {t.howCups}
      </p>
      {!compact && <p>{t.howTurn}</p>}
      {!compact && <p>{t.howPdf}</p>}
    </section>
  );
}

export function ContentsLeft({ lang }) {
  return (
    <div className="page-body contents-left">
      <Checkers tone="choc" edge="top" />
      <div className="page-pad">
        <Cupcake className="how-cupcake" />
        <HowItWorks lang={lang} />
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

export function ContentsList({ lang, withHow = false }) {
  const t = ui[lang];
  return (
    <div className="page-body contents">
      <Checkers tone="choc" edge="top" />
      <div className="page-pad">
        <p className="eyebrow">★ {t.bookTitleFlat} ★</p>
        <h1 className="contents-title">{t.contents}</h1>
        <ol className="toc">
          {recipes.map((r) => {
            const { text, lang: textLang } = textFor(r, lang);
            const i = pages.findIndex((p) => p.recipe === r);
            return (
              <li key={r.slug}>
                <a href={hashFor(i)} className="toc-link">
                  <span className="toc-no" aria-hidden="true">
                    {pad(r.number)}
                  </span>
                  <span className="toc-text">
                    <span className="sr-only">
                      {t.recipeNo} {pad(r.number)}:{' '}
                    </span>
                    <span className="toc-title" lang={textLang}>
                      {text.title}
                    </span>
                    <span className="toc-tag" lang={textLang}>
                      {text.tagline}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
        {withHow && <HowItWorks lang={lang} compact />}
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

/* ---------- Recipe parts ---------- */

function useRecipeText(recipe, lang) {
  const { text, lang: textLang, fallback } = textFor(recipe, lang);
  return { r: text, textLang, fallback, t: ui[lang] };
}

function FallbackNote({ fallback, t }) {
  if (!fallback || !t.englishOnly) return null;
  return <p className="fallback-note">{t.englishOnly}</p>;
}

function RecipeHero({ recipe, lang }) {
  const { r, textLang, fallback, t } = useRecipeText(recipe, lang);
  return (
    <header className="hero">
      {r.sticker && (
        <div lang={textLang} className="hero-burst-wrap">
          <Burst lines={r.sticker} className="hero-burst" />
        </div>
      )}
      <p className="eyebrow">
        ★ {t.recipeNo} {pad(recipe.number)} ★
      </p>
      <h1 className="recipe-title" lang={textLang}>
        {r.title_lines.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </h1>
      <p className="tagline" lang={textLang}>
        {r.tagline}
      </p>
      <FallbackNote fallback={fallback} t={t} />
      <ul className="stats" lang={textLang}>
        {r.stats.map((s, i) => (
          <li key={i}>
            <b>{s.value}</b> {s.label}
          </li>
        ))}
      </ul>
      {r.intro && (
        <p className="intro" lang={textLang}>
          {r.intro}
        </p>
      )}
    </header>
  );
}

// Same text, but long amounts only break at their " + " joins.
function Amount({ text }) {
  const parts = text.split(' + ');
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && ' '}
      <span className="amt-part">
        {i > 0 && '+ '}
        {part}
      </span>
    </Fragment>
  ));
}

function Ingredients({ recipe, lang }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  return (
    <section className="menu" aria-label={t.ingredients}>
      <h2 className="menu-title" lang={textLang}>
        {r.ingredients_headline}
      </h2>
      <p className="menu-sub">{t.cupsMetric}</p>
      {r.groups.map((g, gi) => (
        <div className="ing-group" key={gi}>
          {g.title && (
            <h3 className="ing-group-title" lang={textLang}>
              {g.title}
            </h3>
          )}
          <ul className="ing-list" lang={textLang}>
            {g.items.map((it, ii) => {
              const showMetric = it.metric && it.metric !== it.amount;
              return (
                <li className="ing" key={ii}>
                  <span className="ing-what">
                    <span className="ing-name">{it.name}</span>
                    {it.note && <span className="ing-note">{it.note}</span>}
                  </span>
                  <span className="ing-how">
                    <span className="ing-amount">
                      <Amount text={it.amount} />
                    </span>
                    {showMetric && <span className="ing-metric">{it.metric}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Method({ recipe, lang }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  return (
    <section className="ticket" aria-label={t.method}>
      <h2 className="ticket-title" lang={textLang}>
        {r.method_headline}
      </h2>
      <p className="equipment">
        <b>{t.equipment}:</b> <span lang={textLang}>{r.equipment}</span>
      </p>
      <ol className="steps" lang={textLang}>
        {r.steps.map((s, i) => (
          <li className="step" key={i}>
            <span className="step-dot" aria-hidden="true">
              {i + 1}
            </span>
            <div className="step-body">
              <h3 className="step-title">{s.title}</h3>
              <p>{s.text}</p>
              {s.cue && (
                <p className="cue">
                  <span aria-hidden="true">→ </span>
                  {s.cue}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Tips({ recipe, lang }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  if (!r.tips?.length) return null;
  return (
    <section className="tips" aria-label={t.tips} lang={textLang}>
      {r.tips.map((tip, i) => (
        <div className="tip" key={i}>
          <h3 className="tip-title">{tip.title}</h3>
          <p>{tip.text}</p>
        </div>
      ))}
    </section>
  );
}

function Credits({ recipe, lang }) {
  const { r, t } = useRecipeText(recipe, lang);
  const credit = amountsCreditFor(recipe, lang);
  const s = recipe.source;
  return (
    <footer className="credits">
      {recipe.pdf && (
        <a
          className="btn btn--cherry"
          href={recipe.pdf}
          download={`${recipe.slug}.pdf`}
          aria-label={t.pdfLabel(r.title)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="btn-icon">
            <path
              d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t.downloadPdf}
        </a>
      )}
      <p className="source">
        {t.source}: {s.author} / {s.site}.{' '}
        <a href={s.url} target="_blank" rel="noopener noreferrer">
          {t.viewSource}
          <span className="sr-only"> ({s.site})</span>
        </a>
      </p>
      {credit && (
        <p className="small-credit" lang={credit.lang}>
          {credit.label}: {credit.src}
        </p>
      )}
      {recipe.conversions && (
        <p className="small-credit">
          {t.conversions}: <span lang="en">{recipe.conversions}</span>
        </p>
      )}
    </footer>
  );
}

/* ---------- Recipe pages ---------- */

export function RecipeLeft({ recipe, lang }) {
  return (
    <div className="page-body recipe">
      <Checkers tone="choc" edge="top" />
      <div className="page-pad">
        <RecipeHero recipe={recipe} lang={lang} />
        <Ingredients recipe={recipe} lang={lang} />
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

export function RecipeRight({ recipe, lang }) {
  return (
    <div className="page-body recipe">
      <Checkers tone="choc" edge="top" />
      <div className="page-pad">
        <Method recipe={recipe} lang={lang} />
        <Tips recipe={recipe} lang={lang} />
        <Credits recipe={recipe} lang={lang} />
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

export function RecipeFull({ recipe, lang }) {
  return (
    <div className="page-body recipe">
      <Checkers tone="choc" edge="top" />
      <div className="page-pad">
        <RecipeHero recipe={recipe} lang={lang} />
        <Ingredients recipe={recipe} lang={lang} />
        <Method recipe={recipe} lang={lang} />
        <Tips recipe={recipe} lang={lang} />
        <Credits recipe={recipe} lang={lang} />
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

/* ---------- Page lookup by book index and side ---------- */

// Wide: every index is a spread (left + right). Narrow: one page per index.
export function renderPage(index, side, wide, lang) {
  const p = pages[index];
  if (!p) return null;
  if (p.kind === 'cover') return side === 'R' ? <Cover lang={lang} /> : null;
  if (p.kind === 'contents') {
    if (!wide) return <ContentsList lang={lang} withHow />;
    return side === 'L' ? <ContentsLeft lang={lang} /> : <ContentsList lang={lang} />;
  }
  if (!wide) return <RecipeFull recipe={p.recipe} lang={lang} />;
  return side === 'L' ? (
    <RecipeLeft recipe={p.recipe} lang={lang} />
  ) : (
    <RecipeRight recipe={p.recipe} lang={lang} />
  );
}
