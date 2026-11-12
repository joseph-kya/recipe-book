import { Fragment } from 'react';
import { amountsCreditFor, recipes, textFor } from './content.js';
import { ui } from './i18n.js';
import { Burst, Checkers, Cupcake } from './ornaments.jsx';
import { isClosing } from './paginate.js';

/* ---------- Cover ---------- */

export function Cover({ lang }) {
  const t = ui[lang];
  return (
    <div className="page-body cover">
      <Checkers tone="choc" edge="top" />
      <div className="cover-inner">
        <p className="eyebrow cover-eyebrow">★ {t.coverEyebrow(recipes.length)} ★</p>
        <h1 className="cover-title" data-enter>
          {t.bookTitle.map((line, i) => (
            <span key={i}>
              {line.split(' ').map((word, j) => (
                <Fragment key={j}>
                  {j > 0 && ' '}
                  <span className="w">{word}</span>
                </Fragment>
              ))}
            </span>
          ))}
        </h1>
        <Cupcake className="cover-cupcake" />
        <Burst lines={t.coverSticker} className="cover-burst" />
        <p className="cover-note">{t.coverNote}</p>
        <a className="btn btn--cream" href="#/contents">
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

function ContentsLeft({ lang }) {
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

function ContentsList({ lang, withHow = false }) {
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
            return (
              <li key={r.slug}>
                <a href={`#/${r.route}`} className="toc-link">
                  <span className="toc-no" aria-hidden="true">
                    {r.no}
                  </span>
                  <span className="toc-text">
                    <span className="sr-only">
                      {t.recipeNo} {r.no}:{' '}
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

/* ---------- Recipe parts ----------
   Each part can render a slice (some ingredient rows, some steps), so a recipe
   can run across several printed-book pages. `measure` renders every head
   variant for the paginator to clone from. */

function useRecipeText(recipe, lang) {
  const { text, lang: textLang, fallback } = textFor(recipe, lang);
  return { r: text, textLang, fallback, t: ui[lang] };
}

function FallbackNote({ fallback, t }) {
  if (!fallback || !t.englishOnly) return null;
  return <p className="fallback-note">{t.englishOnly}</p>;
}

function ContMark({ t, lang }) {
  return (
    <span className="cont-mark" lang={lang}>
      {' '}
      {t.cont}
    </span>
  );
}

// Book pages after a recipe's first carry its name, like the printed sheet's page two.
function RunningHead({ recipe, lang }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  return (
    <p className="running-head" data-unit="running">
      <span className="running-title" lang={textLang}>
        {r.title}
      </span>
      <span className="eyebrow">
        ★ {t.recipeNo} {recipe.no} ★
      </span>
    </p>
  );
}

function RecipeHero({ recipe, lang }) {
  const { r, textLang, fallback, t } = useRecipeText(recipe, lang);
  return (
    <header className="hero" data-unit="hero">
      <p className="eyebrow">
        ★ {t.recipeNo} {recipe.no} ★
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

const allItems = (r) => r.groups.flatMap((g, gi) => g.items.map((_, ii) => [gi, ii]));

function Ingredients({ recipe, lang, items, cont = false, measure = false }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  const shown = items || allItems(r);
  const byGroup = new Map();
  for (const [gi, ii] of shown) {
    if (!byGroup.has(gi)) byGroup.set(gi, []);
    byGroup.get(gi).push(ii);
  }
  const normalHead = (
    <>
      <h2 className="menu-title" lang={textLang} data-head="normal">
        {r.ingredients_headline}
      </h2>
      <p className="menu-sub" data-head="normal">
        {t.cupsMetric}
      </p>
    </>
  );
  const contHead = (
    <h2 className="menu-title" lang={textLang} data-head="cont">
      {r.ingredients_headline}
      <ContMark t={t} lang={lang} />
    </h2>
  );
  return (
    <section className="menu" aria-label={cont ? `${t.ingredients} ${t.cont}` : t.ingredients} data-card="menu">
      {measure ? (
        <>
          {normalHead}
          {contHead}
        </>
      ) : cont ? (
        contHead
      ) : (
        normalHead
      )}
      {[...byGroup].map(([gi, iis]) => {
        const g = r.groups[gi];
        return (
          <div className="ing-group" key={gi} data-group={gi}>
            {g.title && iis[0] === 0 && (
              <h3 className="ing-group-title" lang={textLang}>
                {g.title}
              </h3>
            )}
            <ul className="ing-list" lang={textLang}>
              {iis.map((ii) => {
                const it = g.items[ii];
                const showMetric = it.metric && it.metric !== it.amount;
                return (
                  <li className="ing" key={ii} data-item={`${gi}:${ii}`}>
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
        );
      })}
    </section>
  );
}

function Method({ recipe, lang, steps, cont = false, measure = false }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  const shown = steps || r.steps.map((_, i) => i);
  const normalHead = (
    <>
      <h2 className="ticket-title" lang={textLang} data-head="normal">
        {r.method_headline}
      </h2>
      <p className="equipment" data-head="normal">
        <b>{t.equipment}:</b> <span lang={textLang}>{r.equipment}</span>
      </p>
    </>
  );
  const contHead = (
    <h2 className="ticket-title ticket-title--cont" lang={textLang} data-head="cont">
      {r.method_headline}
      <ContMark t={t} lang={lang} />
    </h2>
  );
  return (
    <section className="ticket" aria-label={cont ? `${t.method} ${t.cont}` : t.method} data-card="ticket">
      {measure ? (
        <>
          {normalHead}
          {contHead}
        </>
      ) : cont ? (
        contHead
      ) : (
        normalHead
      )}
      <ol className="steps" lang={textLang} start={shown[0] + 1}>
        {shown.map((i) => {
          const s = r.steps[i];
          return (
            <li className="step" key={i} data-step={i}>
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
          );
        })}
      </ol>
    </section>
  );
}

function Tips({ recipe, lang, items }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  if (!r.tips?.length) return null;
  const shown = items || r.tips.map((_, i) => i);
  return (
    <section className="tips" aria-label={items && items[0] > 0 ? `${t.tips} ${t.cont}` : t.tips} lang={textLang} data-card="tips">
      {shown.map((i) => (
        <div className="tip" key={i} data-tip={i}>
          <h3 className="tip-title">{r.tips[i].title}</h3>
          <p>{r.tips[i].text}</p>
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
    <footer className="credits" data-unit="credits">
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

// Phone: the whole recipe on one scrolling page.
function RecipeFull({ recipe, lang }) {
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

// Wide: one fixed-height book page holding the segments the paginator gave it.
function RecipePage({ recipe, lang, segs, first }) {
  const closing = !first && isClosing(segs);
  return (
    <div className={`page-body recipe${closing ? ' page-body--closing' : ''}`}>
      <Checkers tone="choc" edge="top" />
      <div className={`page-pad${closing ? ' page-pad--closing' : ''}`}>
        {!first && <RunningHead recipe={recipe} lang={lang} />}
        {segs.map((seg, i) => {
          const props = { key: i, recipe, lang };
          if (seg.kind === 'hero') return <RecipeHero {...props} />;
          if (seg.kind === 'menu') return <Ingredients {...props} items={seg.items} cont={seg.cont} />;
          if (seg.kind === 'ticket') return <Method {...props} steps={seg.items} cont={seg.cont} />;
          if (seg.kind === 'tips') return <Tips {...props} items={seg.items} />;
          if (seg.kind === 'ornament') return <Cupcake key={i} className="closing-cupcake" />;
          return <Credits {...props} />;
        })}
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

// The quiet right-hand page when a recipe ends on a left page.
function BlankPage() {
  return (
    <div className="page-body blank-page">
      <Checkers tone="choc" edge="top" />
      <Cupcake className="blank-cupcake" />
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

// Hidden source for the paginator: every block of one recipe, in book order.
export function RecipeMeasure({ recipe, lang }) {
  return (
    <div data-src={recipe.slug}>
      <RunningHead recipe={recipe} lang={lang} />
      <RecipeHero recipe={recipe} lang={lang} />
      <Ingredients recipe={recipe} lang={lang} measure />
      <Method recipe={recipe} lang={lang} measure />
      <Tips recipe={recipe} lang={lang} />
      <Credits recipe={recipe} lang={lang} />
    </div>
  );
}

/* ---------- One face of the book from its layout descriptor ---------- */

export function renderFace(desc, lang) {
  if (!desc) return null;
  switch (desc.type) {
    case 'cover':
      return <Cover lang={lang} />;
    case 'contentsLeft':
      return <ContentsLeft lang={lang} />;
    case 'contentsList':
      return <ContentsList lang={lang} withHow={desc.withHow} />;
    case 'recipeFull':
      return <RecipeFull recipe={desc.recipe} lang={lang} />;
    case 'recipePage':
      return desc.segs ? (
        <RecipePage recipe={desc.recipe} lang={lang} segs={desc.segs} first={desc.first} />
      ) : (
        <RecipeFull recipe={desc.recipe} lang={lang} />
      );
    case 'blank':
      return <BlankPage />;
    default:
      return null;
  }
}
