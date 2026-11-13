import { Fragment, useEffect, useRef, useState } from 'react';
import { amountsCreditFor, recipes, textFor } from './content.js';
import { ui } from './i18n.js';
import { spinCupcake } from './motion.js';
import { Bell, CUPCAKE_BITES, Checkers, Cupcake, CupcakeCrumbs, DownloadIcon } from './ornaments.jsx';
import { isClosing } from './paginate.js';
import { scaleStat } from './scale.js';
import { useScale } from './useScale.js';
import { primeAudio } from './timer.js';
import { bite as biteSound, ring as ringDing } from './audio.js';
import { nextTheme, useTheme } from './theme.js';
import { MUFFIN_TIER_COUNT, pickNextIndex, recordMuffinFinish, themeText, tierForFinishes } from './theme-i18n.js';
import { cx, StepProgress, useRecipeText } from './recipeUI.jsx';
import Ingredients from './Ingredients.jsx';
import Method, { getDoneStepCount, subscribeSteps } from './Method.jsx';
import Photo from './Photo.jsx';
import Macros from './Macros.jsx';

export { useRecipeText } from './recipeUI.jsx';
export { clearDoneSteps, getDoneSteps, setStepDone, toggleStepDone, useDoneSteps, StepDot, StepTimer, StepBody } from './Method.jsx';

/* ---------- Cover: the title, an ornament, Open ---------- */

const lastGoneByTier = Array(MUFFIN_TIER_COUNT).fill(-1);
const lastReplyByTier = Array(MUFFIN_TIER_COUNT).fill(-1);

export function Cover({ lang }) {
  const t = ui[lang];
  const themeCopy = themeText[lang] || themeText.en;
  const [theme, setTheme] = useTheme();
  const [announced, setAnnounced] = useState(null);
  const spinRef = useRef(null);
  const spinAnimRef = useRef(null);
  // Press and hold the cupcake to take a bite; the last bite finishes it,
  // celebrates briefly, then the muffin replies and springs back fresh.
  const [bites, setBites] = useState(0);
  const [fresh, setFresh] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [replying, setReplying] = useState(false);
  const [finishTier, setFinishTier] = useState(0);
  const [goneIndex, setGoneIndex] = useState(0);
  const [replyIndex, setReplyIndex] = useState(0);
  const holdRef = useRef(0);
  const respawnRef = useRef(0);
  const replyTimerRef = useRef(0);
  const heldRef = useRef(false);
  const bitesRef = useRef(0);
  const copyRef = useRef(themeCopy);
  copyRef.current = themeCopy;

  useEffect(() => () => {
    spinAnimRef.current?.stop();
    clearTimeout(holdRef.current);
    clearTimeout(respawnRef.current);
    clearTimeout(replyTimerRef.current);
  }, []);

  const cycleTheme = () => {
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    if (celebrating) return;
    const next = nextTheme(theme);
    setTheme(next);
    setAnnounced(themeCopy.names[next]);
    spinCupcake(spinRef.current, spinAnimRef);
  };

  const takeBite = () => {
    heldRef.current = true;
    clearTimeout(replyTimerRef.current);
    setReplying(false);
    const current = bitesRef.current;
    if (current >= CUPCAKE_BITES.length) return;
    const n = current + 1;
    bitesRef.current = n;
    setBites(n);
    setFresh(false);
    void biteSound(n - 1);
    if (n >= CUPCAKE_BITES.length) {
      const totalFinishes = recordMuffinFinish();
      const tier = tierForFinishes(totalFinishes);
      const tierPool = copyRef.current.tiers[tier];
      const nextGone = pickNextIndex(tierPool.allGone.length, lastGoneByTier[tier]);
      lastGoneByTier[tier] = nextGone;
      setFinishTier(tier);
      setGoneIndex(nextGone);
      setCelebrating(true);
      setAnnounced(tierPool.allGone[nextGone]);
      clearTimeout(respawnRef.current);
      respawnRef.current = setTimeout(() => {
        const replyPool = copyRef.current.tiers[tier].muffinReply;
        const nextReply = pickNextIndex(replyPool.length, lastReplyByTier[tier]);
        lastReplyByTier[tier] = nextReply;
        setReplyIndex(nextReply);
        setCelebrating(false);
        bitesRef.current = 0;
        setBites(0);
        setFresh(true);
        setReplying(true);
        setAnnounced(`${copyRef.current.bites[CUPCAKE_BITES.length]} ${replyPool[nextReply]}`);
        clearTimeout(replyTimerRef.current);
        replyTimerRef.current = setTimeout(() => setReplying(false), 2400);
      }, 1350);
    } else {
      setAnnounced(copyRef.current.bites[n - 1]);
    }
  };
  const holdStart = (e) => {
    if (e.button !== 0 || celebrating) return;
    primeAudio();
    heldRef.current = false;
    clearTimeout(holdRef.current);
    holdRef.current = setTimeout(takeBite, 450);
  };
  const holdEnd = () => clearTimeout(holdRef.current);

  const cupcakeMod = celebrating ? 'gone' : bites ? 'bitten' : fresh ? 'fresh' : '';
  const cupcakeClass = cx('cover-cupcake', cupcakeMod && `cover-cupcake--${cupcakeMod}`);

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
        <div className="cover-cupcake-stage">
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
                className={cupcakeClass}
                bites={bites}
              />
            </span>
          </button>
          {celebrating && (
            <div className="cover-cupcake-celebrate" aria-hidden="true">
              <CupcakeCrumbs />
              <span className="cover-cupcake-gone">{themeCopy.tiers[finishTier].allGone[goneIndex]}</span>
            </div>
          )}
          {replying && (
            <span className="cover-cupcake-reply" aria-hidden="true">
              {themeCopy.tiers[finishTier].muffinReply[replyIndex]}
            </span>
          )}
        </div>
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
    void ringDing();
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
        <Bell key={ring === 'ding' ? tick : ring} className={cx('service-bell', ring && `service-bell--${ring}`)} />
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

  useEffect(() => subscribeSteps(() => setStepTick((n) => n + 1)), []);

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
            const doneCount = getDoneStepCount(r.slug);
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
                  <StepProgress className="toc-progress" doneCount={doneCount} totalSteps={totalSteps} />
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

function FallbackNote({ fallback, t }) {
  if (!fallback || !t.englishOnly) return null;
  return <p className="fallback-note">{t.englishOnly}</p>;
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
          <DownloadIcon className="btn-icon" />
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
function RecipeFull({ recipe, lang, units, onStartCooking }) {
  return (
    <div className="page-body recipe">
      <Checkers tone="choc" edge="top" />
      <div className="page-pad">
        <RecipeHero recipe={recipe} lang={lang} />
        <Ingredients recipe={recipe} lang={lang} units={units} />
        <Method recipe={recipe} lang={lang} onStartCooking={onStartCooking} />
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
function RecipePage({ recipe, lang, units, segs, first, onStartCooking }) {
  const closing = !first && isClosing(segs);
  // the photo, when the paginator found room for it, stands in for the cupcake
  const hasPhoto = segs.some((seg) => seg.kind === 'photo');
  return (
    <div className={cx('page-body recipe', closing && 'page-body--closing')}>
      <Checkers tone="choc" edge="top" />
      <div className={cx('page-pad', closing && 'page-pad--closing')}>
        {!first && <RunningHead recipe={recipe} lang={lang} />}
        {segs.map((seg) => {
          const props = { recipe, lang };
          if (seg.kind === 'hero') return <RecipeHero key={seg.kind} {...props} />;
          if (seg.kind === 'menu') return <Ingredients key={seg.kind} {...props} units={units} items={seg.items} cont={seg.cont} />;
          if (seg.kind === 'ticket') return <Method key={seg.kind} {...props} steps={seg.items} cont={seg.cont} onStartCooking={onStartCooking} />;
          if (seg.kind === 'tips') return <Tips key={seg.kind} {...props} items={seg.items} />;
          if (seg.kind === 'ornament') return hasPhoto ? null : <Cupcake key={seg.kind} className="closing-cupcake" />;
          if (seg.kind === 'macros') return <Macros key={seg.kind} {...props} />;
          if (seg.kind === 'photo') return <Photo key={seg.kind} {...props} height={seg.h} />;
          return <Credits key={seg.kind} {...props} units={units} />;
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

export function renderFace(desc, lang, units, onStartCooking) {
  if (!desc) return null;
  switch (desc.type) {
    case 'cover':
      return <Cover lang={lang} />;
    case 'contentsLeft':
      return <ContentsLeft lang={lang} />;
    case 'contentsList':
      return <ContentsList lang={lang} withTitle={desc.withTitle} />;
    case 'recipeFull':
      return <RecipeFull recipe={desc.recipe} lang={lang} units={units} onStartCooking={onStartCooking} />;
    case 'recipePage':
      return desc.segs ? (
        <RecipePage recipe={desc.recipe} lang={lang} units={units} segs={desc.segs} first={desc.first} onStartCooking={onStartCooking} />
      ) : (
        <RecipeFull recipe={desc.recipe} lang={lang} units={units} onStartCooking={onStartCooking} />
      );
    case 'blank':
      return <BlankPage />;
    default:
      return null;
  }
}
