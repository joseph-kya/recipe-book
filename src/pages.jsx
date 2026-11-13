import { Fragment, useEffect, useRef, useState } from 'react';
import { amountsCreditFor, recipes, textFor } from './content.js';
import { ui } from './i18n.js';
import { spinCupcake } from './motion.js';
import { Bell, CUPCAKE_BITES, Checkers, Cupcake } from './ornaments.jsx';
import { isClosing } from './paginate.js';
import { amountsFor } from './units.js';
import { scaleAmount, scaleStat } from './scale.js';
import { useScale } from './useScale.js';
import { formatRemaining, parseDuration, primeAudio, startTimer, stopTimer } from './timer.js';
import { useTimer } from './useTimer.js';
import { nextTheme, useTheme } from './theme.js';
import { themeText } from './theme-i18n.js';
import Scaler from './Scaler.jsx';
import Photo from './Photo.jsx';
import Macros from './Macros.jsx';

/* ---------- Cover: the title, an ornament, Open ---------- */

export function Cover({ lang }) {
  const t = ui[lang];
  const themeCopy = themeText[lang] || themeText.en;
  const [theme, setTheme] = useTheme();
  const [announced, setAnnounced] = useState(null);
  const spinRef = useRef(null);
  const spinAnimRef = useRef(null);
  // Press and hold the cupcake to take a bite; after three, the next hold brings a fresh one.
  const [bites, setBites] = useState(0);
  const [fresh, setFresh] = useState(false);
  const holdRef = useRef(0);
  const heldRef = useRef(false);

  useEffect(() => () => {
    spinAnimRef.current?.stop();
    clearTimeout(holdRef.current);
  }, []);

  const cycleTheme = () => {
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    const next = nextTheme(theme);
    setTheme(next);
    setAnnounced(themeCopy.names[next]);
    spinCupcake(spinRef.current, spinAnimRef);
  };

  const takeBite = () => {
    heldRef.current = true;
    const n = bites >= CUPCAKE_BITES.length ? 0 : bites + 1;
    setBites(n);
    setFresh(n === 0);
    setAnnounced(themeCopy.bites[n === 0 ? CUPCAKE_BITES.length : n - 1]);
  };
  const holdStart = (e) => {
    if (e.button !== 0) return;
    heldRef.current = false;
    clearTimeout(holdRef.current);
    holdRef.current = setTimeout(takeBite, 450);
  };
  const holdEnd = () => clearTimeout(holdRef.current);

  return (
    <div className="page-body cover">
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
        <button
          type="button"
          className="cover-cupcake-btn"
          aria-label={themeCopy.changeColor}
          onClick={cycleTheme}
          onPointerDown={holdStart}
          onPointerUp={holdEnd}
          onPointerCancel={holdEnd}
          onPointerLeave={holdEnd}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className="cover-cupcake-spin" ref={spinRef}>
            <Cupcake
              key={bites}
              className={`cover-cupcake${bites ? ' cover-cupcake--bitten' : fresh ? ' cover-cupcake--fresh' : ''}`}
              bites={bites}
            />
          </span>
        </button>
        <div className="cover-open">
          <a className="btn btn--cream" href="#/contents">
            {t.open}
          </a>
        </div>
        <span className="sr-only" aria-live="polite">
          {announced || ''}
        </span>
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

/* ---------- Contents: numbers and titles ---------- */

// A service bell by the contents heading: tap to ding, hold to keep ringing.
function ServiceBell({ lang }) {
  const copy = themeText[lang] || themeText.en;
  const [ring, setRing] = useState(''); // '' | 'ding' | 'held'
  const [announced, setAnnounced] = useState('');
  const [tick, setTick] = useState(0);
  const holdRef = useRef(0);
  const heldRef = useRef(false);

  useEffect(() => () => clearTimeout(holdRef.current), []);

  const ding = () => {
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    setRing('ding');
    setTick((n) => n + 1);
    setAnnounced(copy.ding);
  };
  const holdStart = (e) => {
    if (e.button !== 0) return;
    heldRef.current = false;
    clearTimeout(holdRef.current);
    holdRef.current = setTimeout(() => {
      heldRef.current = true;
      setRing('held');
      setAnnounced(copy.ringing);
    }, 450);
  };
  const holdEnd = () => {
    clearTimeout(holdRef.current);
    if (heldRef.current) setRing('');
  };

  return (
    <>
      <button
        type="button"
        className="service-bell-btn"
        aria-label={copy.ringBell}
        onClick={ding}
        onPointerDown={holdStart}
        onPointerUp={holdEnd}
        onPointerCancel={holdEnd}
        onPointerLeave={holdEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Bell key={ring === 'ding' ? tick : ring} className={`service-bell${ring ? ` service-bell--${ring}` : ''}`} />
      </button>
      <span className="sr-only" aria-live="polite">
        {announced}
      </span>
    </>
  );
}

// Wide: the left page of the contents spread carries its heading and an ornament.
function ContentsLeft({ lang }) {
  const t = ui[lang];
  return (
    <div className="page-body contents-left">
      <Checkers tone="choc" edge="top" />
      <div className="contents-left-inner">
        <div className="contents-medallion" aria-hidden="true">
          <Cupcake className="contents-cupcake" />
        </div>
        <h1 className="contents-title">{t.contents}</h1>
        <ServiceBell lang={lang} />
      </div>
      <Checkers tone="cherry" edge="bottom" />
    </div>
  );
}

function ContentsList({ lang, withTitle = false }) {
  const t = ui[lang];
  const [, setStepTick] = useState(0);

  useEffect(() => {
    const sync = () => setStepTick((n) => n + 1);
    stepListeners.add(sync);
    return () => stepListeners.delete(sync);
  }, []);

  return (
    <div className="page-body contents">
      <Checkers tone="choc" edge="top" />
      <div className="page-pad">
        {withTitle && (
          <div className="contents-head">
            <h1 className="contents-title">{t.contents}</h1>
            <ServiceBell lang={lang} />
          </div>
        )}
        <ol className="toc" aria-label={withTitle ? undefined : t.contents}>
          {recipes.map((r) => {
            const { text, lang: textLang } = textFor(r, lang);
            const totalSteps = text.steps.length;
            const doneCount = doneStepsBySlug.get(r.slug)?.size ?? 0;
            const allDone = doneCount > 0 && doneCount === totalSteps;
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
                    {text.tagline && (
                      <span className="toc-tagline" lang={textLang}>
                        {text.tagline}
                      </span>
                    )}
                  </span>
                  {doneCount > 0 && (
                    <span className={`toc-progress${allDone ? ' toc-progress--done' : ''}`} aria-hidden="true">
                      {doneCount}/{totalSteps}
                    </span>
                  )}
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

const doneStepsBySlug = new Map();
const stepListeners = new Set();

function TicketProgress({ doneCount, totalSteps }) {
  if (doneCount === 0) return null;
  const allDone = doneCount === totalSteps;
  return (
    <span className={`ticket-progress${allDone ? ' ticket-progress--done' : ''}`} aria-hidden="true">
      {doneCount}/{totalSteps}
    </span>
  );
}

// A step that names a time gets a countdown: tap to start, tap again to stop.
// Timers keep running across page turns and ring when they hit zero.
function StepTimer({ timerKey, duration, t, measure }) {
  const { state, remaining } = useTimer(measure ? null : timerKey);
  const toggle = () => {
    if (measure) return;
    if (state === 'running') stopTimer(timerKey);
    else if (state === 'done') stopTimer(timerKey);
    else {
      primeAudio();
      startTimer(timerKey, duration.seconds);
    }
  };
  const text =
    state === 'running' ? formatRemaining(remaining) : state === 'done' ? t.timerDone : duration.label;
  const label =
    state === 'running'
      ? t.timerStop(formatRemaining(remaining))
      : state === 'done'
        ? t.timerReset
        : t.timerStart(duration.label);
  return (
    <button
      type="button"
      className={`step-timer step-timer--${state}`}
      aria-label={label}
      aria-live={state === 'done' ? 'assertive' : 'off'}
      onClick={toggle}
    >
      <svg className="step-timer-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M12 9v4.5l3 2M9 3h6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="step-timer-text">{text}</span>
    </button>
  );
}

function Method({ recipe, lang, steps, cont = false, measure = false }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  const [doneSteps, setDoneSteps] = useState(() => new Set(doneStepsBySlug.get(recipe.slug)));

  useEffect(() => {
    setDoneSteps(new Set(doneStepsBySlug.get(recipe.slug)));
    if (measure) return;
    const sync = (slug) => {
      if (slug === recipe.slug) setDoneSteps(new Set(doneStepsBySlug.get(recipe.slug)));
    };
    stepListeners.add(sync);
    return () => stepListeners.delete(sync);
  }, [recipe.slug, measure]);

  const toggleStep = (stepIndex) => {
    if (measure) return;
    const wasDone = doneSteps.has(stepIndex);
    const next = new Set(doneStepsBySlug.get(recipe.slug) || doneSteps);
    if (wasDone) next.delete(stepIndex);
    else next.add(stepIndex);
    doneStepsBySlug.set(recipe.slug, next);
    for (const sync of stepListeners) sync(recipe.slug);
  };

  const shown = steps || r.steps.map((_, i) => i);
  const doneCount = doneSteps.size;
  const totalSteps = r.steps.length;
  const normalHead = (
    <>
      <div className="ticket-head" data-head="normal">
        <h2 className="ticket-title" lang={textLang}>
          {r.method_headline}
        </h2>
        <TicketProgress doneCount={doneCount} totalSteps={totalSteps} />
      </div>
      <p className="equipment" data-head="normal">
        <b>{t.equipment}:</b> <span lang={textLang}>{r.equipment}</span>
      </p>
    </>
  );
  const contHead = (
    <div className="ticket-head ticket-head--cont" data-head="cont">
      <h2 className="ticket-title ticket-title--cont" lang={textLang}>
        {r.method_headline}
        <ContMark t={t} lang={lang} />
      </h2>
      <TicketProgress doneCount={doneCount} totalSteps={totalSteps} />
    </div>
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
          const isDone = doneSteps.has(i);
          const duration = parseDuration(s.text, s.cue);
          return (
            <li className={`step${isDone ? ' step--done' : ''}`} key={i} data-step={i}>
              <button
                type="button"
                className="step-dot"
                aria-pressed={isDone}
                aria-label={`${i + 1}. ${s.title}`}
                onClick={() => toggleStep(i)}
              >
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <svg className="step-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M5 12.5 9.5 17 19 7.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="step-body">
                <h3 className="step-title">{s.title}</h3>
                <p>{s.text}</p>
                {s.cue && (
                  <p className="cue">
                    <span aria-hidden="true">→ </span>
                    {s.cue}
                  </p>
                )}
                {duration && (
                  <StepTimer timerKey={`${recipe.slug}:${i}`} duration={duration} t={t} measure={measure} />
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
        {t.source}: {s.author},{' '}
        <span className="source-name">
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            {s.site}
          </a>
        </span>
      </p>
      {/* Keep the amounts attribution intact, alongside the recipe source. */}
      {credit ? (
        <p className="small-credit" lang={credit.lang}>
          {credit.label}: {credit.src}
        </p>
      ) : recipe.conversions ? (
        <p className="small-credit">
          {t.conversions}: <span lang={r.conversions ? lang : 'en'}>{r.conversions || recipe.conversions}</span>
        </p>
      ) : null}
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
