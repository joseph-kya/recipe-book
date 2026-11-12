import { Fragment, useLayoutEffect, useRef } from 'react';
import { amountsCreditFor, recipes, textFor } from './content.js';
import { ui } from './i18n.js';
import { Checkers, Cupcake } from './ornaments.jsx';
import { isClosing } from './paginate.js';
import { amountsFor } from './units.js';
import { scaleAmount, scaleStat } from './scale.js';
import { useScale } from './useScale.js';
import Scaler from './Scaler.jsx';
import Photo from './Photo.jsx';
import Macros from './Macros.jsx';
import ThemePicker from './ThemePicker.jsx';

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const SPRING_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const OUT_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

let coverEntered = false;
let contentsLeftEntered = false;

/* ---------- Cover: the title, an ornament, Open ---------- */

export function Cover({ lang }) {
  const t = ui[lang];
  const rootRef = useRef(null);
  const popAnimRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || coverEntered || prefersReducedMotion() || !root.closest('.face--rest')) return;
    coverEntered = true;
    const animations = [];
    const cupcake = root.querySelector('.cover-cupcake');
    const picker = root.querySelector('.theme-picker');
    if (cupcake?.animate) {
      animations.push(
        cupcake.animate(
          [{ transform: 'rotate(-15deg) scale(0.92)' }, { transform: 'rotate(-8deg) scale(1)' }],
          { delay: 65, duration: 320, easing: SPRING_EASE, fill: 'backwards' }
        )
      );
    }
    if (picker?.animate) {
      animations.push(
        picker.animate(
          [
            { opacity: 0, transform: 'translateY(6px) scale(0.96)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' },
          ],
          { delay: 155, duration: 220, easing: OUT_EASE, fill: 'backwards' }
        )
      );
    }
    const finish = () => {
      animations.forEach((a) => a.cancel());
      root.removeEventListener('pointerdown', finish, true);
      root.removeEventListener('focusin', finish, true);
    };
    root.addEventListener('pointerdown', finish, true);
    root.addEventListener('focusin', finish, true);
    Promise.allSettled(animations.map((a) => a.finished)).then(finish);
    return finish;
  }, []);

  const popCupcake = () => {
    if (prefersReducedMotion()) return;
    const cupcake = rootRef.current?.querySelector('.cover-cupcake');
    if (!cupcake?.animate) return;
    popAnimRef.current?.cancel();
    popAnimRef.current = cupcake.animate(
      [
        { transform: 'rotate(-8deg) scale(1)' },
        { transform: 'rotate(5deg) scale(1.12)', offset: 0.38 },
        { transform: 'rotate(-10deg) scale(0.98)', offset: 0.72 },
        { transform: 'rotate(-8deg) scale(1)' },
      ],
      { duration: 380, easing: OUT_EASE }
    );
  };

  return (
    <div ref={rootRef} className="page-body cover">
      <Checkers tone="choc" edge="top" />
      <div className="cover-inner">
        <h1 className="cover-title">
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
        <span className="cover-cupcake-hit" onClick={popCupcake}>
          <Cupcake className="cover-cupcake" />
        </span>
        <div className="cover-open">
          <a className="btn btn--cream" href="#/contents">
            {t.open}
          </a>
        </div>
        <ThemePicker lang={lang} />
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

/* ---------- Contents: numbers and titles ---------- */

// Wide: the left page of the contents spread carries its heading and an ornament.
function ContentsLeft({ lang }) {
  const t = ui[lang];
  const rootRef = useRef(null);
  const popAnimRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || contentsLeftEntered || prefersReducedMotion() || !root.closest('.face--rest')) return;
    contentsLeftEntered = true;
    const animations = [];
    const medallion = root.querySelector('.contents-medallion');
    const title = root.querySelector('.contents-title');
    if (medallion?.animate) {
      animations.push(
        medallion.animate(
          [
            { opacity: 0, transform: 'scale(0.93) rotate(-4deg)' },
            { opacity: 1, transform: 'scale(1) rotate(0deg)' },
          ],
          { duration: 280, easing: SPRING_EASE, fill: 'backwards' }
        )
      );
    }
    if (title?.animate) {
      animations.push(
        title.animate(
          [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { delay: 50, duration: 220, easing: OUT_EASE, fill: 'backwards' }
        )
      );
    }
    const finish = () => {
      animations.forEach((a) => a.cancel());
      root.removeEventListener('pointerdown', finish, true);
      root.removeEventListener('focusin', finish, true);
    };
    root.addEventListener('pointerdown', finish, true);
    root.addEventListener('focusin', finish, true);
    Promise.allSettled(animations.map((a) => a.finished)).then(finish);
    return finish;
  }, []);

  const popMedallion = () => {
    if (prefersReducedMotion()) return;
    const medallion = rootRef.current?.querySelector('.contents-medallion');
    if (!medallion?.animate) return;
    popAnimRef.current?.cancel();
    popAnimRef.current = medallion.animate(
      [
        { transform: 'scale(1) rotate(0deg)' },
        { transform: 'scale(1.06) rotate(4deg)', offset: 0.4 },
        { transform: 'scale(1) rotate(0deg)' },
      ],
      { duration: 320, easing: SPRING_EASE }
    );
  };

  return (
    <div ref={rootRef} className="page-body contents-left">
      <Checkers tone="choc" edge="top" />
      <div className="contents-left-inner">
        <div className="contents-medallion" aria-hidden="true" onClick={popMedallion}>
          <Cupcake className="contents-cupcake" />
        </div>
        <h1 className="contents-title">{t.contents}</h1>
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

function ContentsList({ lang, withTitle = false }) {
  const t = ui[lang];
  return (
    <div className="page-body contents">
      <Checkers tone="choc" edge="top" />
      <div className="page-pad">
        {withTitle && <h1 className="contents-title">{t.contents}</h1>}
        <ol className="toc" aria-label={withTitle ? undefined : t.contents}>
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
                  </span>
                  <span className="toc-arrow" aria-hidden="true">
                    ›
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
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
    <span className="sr-only" lang={lang}>
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
        {t.recipeNo} {recipe.no}
      </span>
    </p>
  );
}

function RecipeHero({ recipe, lang }) {
  const { r, textLang, fallback, t } = useRecipeText(recipe, lang);
  const { factor, custom } = useScale(recipe);
  return (
    <header className="hero" data-unit="hero">
      <p className="eyebrow">
        {t.recipeNo} {recipe.no}
      </p>
      {/* Phones break the title at its title_lines; wide pages run it on one line
          where it fits, so a "Topfen-" line break joins back to "Topfenschmarren". */}
      <h1 className="recipe-title" lang={textLang}>
        {r.title_lines.map((l, i) => {
          const prevHyphen = i > 0 && r.title_lines[i - 1].endsWith('-');
          const hyphen = l.endsWith('-');
          return (
            <span key={i} className="title-line">
              {i > 0 && !prevHyphen && <span className="title-space"> </span>}
              {hyphen ? l.slice(0, -1) : l}
              {hyphen && <span className="title-hyphen">-</span>}
            </span>
          );
        })}
      </h1>
      <p className="tagline" lang={textLang}>
        {r.tagline}
      </p>
      <FallbackNote fallback={fallback} t={t} />
      <ul className="stats" lang={textLang}>
        {r.stats.map((s, i) => (
          <li key={i}>
            {/* a plain-number yield ("24" squares) follows the portion scale */}
            <b>{scaleStat(s.value, factor, custom, textLang)}</b> {s.label}
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

function Ingredients({ recipe, lang, units, items, cont = false, measure = false }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  const { factor, custom } = useScale(recipe);
  const shown = items || allItems(r);
  const byGroup = new Map();
  for (const [gi, ii] of shown) {
    if (!byGroup.has(gi)) byGroup.set(gi, []);
    byGroup.get(gi).push(ii);
  }
  // The first piece of the card carries the portion scale (and its note when scaled).
  const normalHead = (
    <div className="menu-head" data-head="normal">
      <h2 className="menu-title" lang={textLang}>
        {r.ingredients_headline}
      </h2>
      <Scaler recipe={recipe} text={r} textLang={textLang} t={t} />
      {factor !== 1 && <p className="scale-note">{t.scaleNote}</p>}
    </div>
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
                const raw = g.items[ii];
                // display-only: the JSON amounts, scaled in the language they are written in
                const it = factor === 1 ? raw : {
                  ...raw,
                  amount: scaleAmount(raw.amount, factor, textLang, custom),
                  metric: scaleAmount(raw.metric, factor, textLang, custom),
                };
                const { primary, secondary, metricFirst } = amountsFor(it, units);
                return (
                  <li className="ing" key={ii} data-item={`${gi}:${ii}`}>
                    <span className="ing-what">
                      <span className="ing-name">{it.name}</span>
                      {it.note && <span className="ing-note">{it.note}</span>}
                    </span>
                    <span className="ing-how">
                      <span className="ing-amount">{metricFirst ? primary : <Amount text={primary} />}</span>
                      {secondary && <span className="ing-metric">{secondary}</span>}
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

function Credits({ recipe, lang, units }) {
  const { r, t } = useRecipeText(recipe, lang);
  const credit = amountsCreditFor(recipe, lang);
  const s = recipe.source;
  const grams = units === 'metric' && !!recipe.gramsPdf;
  const pdf = grams ? recipe.gramsPdf : recipe.pdf;
  return (
    <footer className="credits" data-unit="credits">
      {pdf && (
        <a
          className="btn btn--cherry"
          href={pdf}
          download={`${recipe.slug}${grams ? '.grams' : ''}.pdf`}
          aria-label={t.pdfLabel(r.title, grams)}
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
        {t.source}: <span className="source-name">{s.author}</span>,{' '}
        <span className="source-name">
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            {s.site}
          </a>
        </span>
        {/* Keep the amounts attribution intact, alongside the recipe source. */}
        {credit ? (
          <>
            {'; '}
            <span lang={credit.lang}>{credit.label}: {credit.src}</span>
          </>
        ) : recipe.conversions ? (
          <>
            {'; '}{t.conversions}: <span className="source-name" lang={r.conversions ? lang : 'en'}>{r.conversions || recipe.conversions}</span>
          </>
        ) : null}
      </p>
    </footer>
  );
}

/* ---------- Recipe pages ---------- */

// Phone: the whole recipe on one scrolling page.
function RecipeFull({ recipe, lang, units }) {
  return (
    <div className="page-body recipe">
      <Checkers tone="choc" edge="top" />
      <div className="page-pad">
        <RecipeHero recipe={recipe} lang={lang} />
        <Ingredients recipe={recipe} lang={lang} units={units} />
        <Method recipe={recipe} lang={lang} />
        <Tips recipe={recipe} lang={lang} />
        <Macros recipe={recipe} lang={lang} />
        <Credits recipe={recipe} lang={lang} units={units} />
        <Photo recipe={recipe} lang={lang} />
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

// Wide: one fixed-height book page holding the segments the paginator gave it.
function RecipePage({ recipe, lang, units, segs, first }) {
  const closing = !first && isClosing(segs);
  // the photo, when the paginator found room for it, stands in for the cupcake
  const hasPhoto = segs.some((seg) => seg.kind === 'photo');
  return (
    <div className={`page-body recipe${closing ? ' page-body--closing' : ''}`}>
      <Checkers tone="choc" edge="top" />
      <div className={`page-pad${closing ? ' page-pad--closing' : ''}`}>
        {!first && <RunningHead recipe={recipe} lang={lang} />}
        {segs.map((seg, i) => {
          const props = { recipe, lang };
          if (seg.kind === 'hero') return <RecipeHero key={i} {...props} />;
          if (seg.kind === 'menu') return <Ingredients key={i} {...props} units={units} items={seg.items} cont={seg.cont} />;
          if (seg.kind === 'ticket') return <Method key={i} {...props} steps={seg.items} cont={seg.cont} />;
          if (seg.kind === 'tips') return <Tips key={i} {...props} items={seg.items} />;
          if (seg.kind === 'ornament') return hasPhoto ? null : <Cupcake key={i} className="closing-cupcake" />;
          if (seg.kind === 'macros') return <Macros key={i} {...props} />;
          if (seg.kind === 'photo') return <Photo key={i} {...props} height={seg.h} />;
          return <Credits key={i} {...props} units={units} />;
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
export function RecipeMeasure({ recipe, lang, units }) {
  return (
    <div data-src={recipe.slug}>
      <RunningHead recipe={recipe} lang={lang} />
      <RecipeHero recipe={recipe} lang={lang} />
      <Ingredients recipe={recipe} lang={lang} units={units} measure />
      <Method recipe={recipe} lang={lang} measure />
      <Tips recipe={recipe} lang={lang} />
      <Macros recipe={recipe} lang={lang} />
      <Credits recipe={recipe} lang={lang} units={units} />
      <Cupcake className="closing-cupcake" />
      <Photo recipe={recipe} lang={lang} height={160} />
    </div>
  );
}

/* ---------- One face of the book from its layout descriptor ---------- */

export function renderFace(desc, lang, units) {
  if (!desc) return null;
  switch (desc.type) {
    case 'cover':
      return <Cover lang={lang} />;
    case 'contentsLeft':
      return <ContentsLeft lang={lang} />;
    case 'contentsList':
      return <ContentsList lang={lang} withTitle={desc.withTitle} />;
    case 'recipeFull':
      return <RecipeFull recipe={desc.recipe} lang={lang} units={units} />;
    case 'recipePage':
      return desc.segs ? (
        <RecipePage recipe={desc.recipe} lang={lang} units={units} segs={desc.segs} first={desc.first} />
      ) : (
        <RecipeFull recipe={desc.recipe} lang={lang} units={units} />
      );
    case 'blank':
      return <BlankPage />;
    default:
      return null;
  }
}
