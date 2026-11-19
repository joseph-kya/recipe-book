import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CheckIcon, ResetIcon, ShoppingListIcon } from './ornaments.jsx';
import { ContMark, cx, StepProgress, useRecipeText } from './recipeUI.jsx';
import { readingCopyFor } from './recipe-reading-i18n.js';
import { cookPrepCopyFor } from './more-cook-i18n.js';
import { recipeSummary } from './recipeMeta.js';
import { scaleAmount } from './scale.js';
import { clearGotItems, formatShoppingList, getGotItems, shareOrCopyList, subscribeShopping, toggleGotItem } from './shopping.js';
import { amountsFor } from './units.js';
import { useScale } from './useScale.js';
import { useDoneSteps } from './Method.jsx';
import {
  clearPrepItems,
  clearStepLink,
  matchRecipeSteps,
  resolveLinkedStep,
  syncUnits,
  toggleMiseMode,
  togglePrepItem,
  useActiveStep,
  useMiseMode,
  usePrepItems,
} from './more-cook.js';
import Scaler from './Scaler.jsx';
import './recipe-reading.css';
import './more-cook.css';

// Small flat-retro prep bowl icon for Mise en place.
function MiseIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M3 9.5h14a7 7 0 0 1-14 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M6.5 16.5h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7.5 6.5 9.2 4.5M12.5 6.5 11.2 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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

function AmountPair({ amounts: { primary, secondary, metricFirst }, comma = false }) {
  const srComma = comma && <span className="sr-only">, </span>;
  return (
    <>
      <span className="ing-amount">
        {srComma}
        {metricFirst ? primary : <Amount text={primary} />}
      </span>
      {secondary && (
        <span className="ing-metric">
          {srComma}
          {secondary}
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

const allItems = (r) => r.groups.flatMap((g, gi) => g.items.map((_, ii) => [gi, ii]));

const EMPTY_GOT = new Set();
const noopSubscribe = () => () => {};

function useGotItems(slug, measure = false) {
  return useSyncExternalStore(
    measure ? noopSubscribe : subscribeShopping,
    () => (measure ? EMPTY_GOT : getGotItems(slug)),
  );
}

function RecipeGlance({ recipe, lang }) {
  const rt = readingCopyFor(lang);
  const { totalTimeLabel, difficulty } = recipeSummary(recipe);
  const diffLabel = rt.difficulty[difficulty.key];
  return (
    <dl
      className={cx('recipe-glance', !totalTimeLabel && 'recipe-glance--single')}
      aria-label={rt.glanceLabel}
      lang={lang}
    >
      {totalTimeLabel && (
        <div className="recipe-glance-cell">
          <dt className="recipe-glance-label">{rt.totalTime}</dt>
          <dd className="recipe-glance-value">{totalTimeLabel}</dd>
        </div>
      )}
      <div className="recipe-glance-cell">
        <dt className="recipe-glance-label">{rt.effort}</dt>
        <dd className="recipe-glance-value">
          <span>{diffLabel}</span>
          <span className="effort-dots" aria-hidden="true">
            {[1, 2, 3].map((dot) => (
              <span key={dot} className={cx('effort-dot', dot <= difficulty.level && 'effort-dot--on')} />
            ))}
          </span>
        </dd>
      </div>
    </dl>
  );
}

export default function Ingredients({ recipe, lang, units, items, cont = false, measure = false }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  const mc = cookPrepCopyFor(lang);
  const { factor, custom } = useScale(recipe);
  const gotItems = useGotItems(recipe.slug, measure);
  const miseOn = useMiseMode(recipe.slug, measure);
  const prepItems = usePrepItems(recipe.slug, measure);
  const doneSteps = useDoneSteps(recipe.slug, measure);
  const activeStep = useActiveStep(recipe.slug, measure);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(0);

  useEffect(() => {
    if (!measure) syncUnits(units);
  }, [units, measure]);

  useEffect(() => {
    setCopied(false);
    clearTimeout(copyTimerRef.current);
  }, [recipe.slug]);

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const itemsList = allItems(r);
  const totalItems = itemsList.length;
  const gotCount = itemsList.filter(([gi, ii]) => gotItems.has(`${gi}:${ii}`)).length;
  const prepCount = itemsList.filter(([gi, ii]) => prepItems.has(`${gi}:${ii}`)).length;
  const remainingCount = totalItems - gotCount;

  const matchesByStep = useMemo(
    () => matchRecipeSteps(r.groups, r.steps, textLang),
    [r.groups, r.steps, textLang],
  );
  const currentStepIndex =
    !measure && doneSteps.size > 0 && doneSteps.size < r.steps.length
      ? r.steps.findIndex((_, idx) => !doneSteps.has(idx))
      : -1;
  const linkedStepIndex = measure ? null : resolveLinkedStep(activeStep, currentStepIndex, matchesByStep);
  const linkedIds = useMemo(
    () => new Set(linkedStepIndex !== null ? matchesByStep[linkedStepIndex] || [] : []),
    [linkedStepIndex, matchesByStep],
  );

  const handleCopy = async () => {
    if (measure) return;
    const text = formatShoppingList({ recipe, lang, units, factor, custom, gotItems });
    if (!text) return;
    const result = await shareOrCopyList({ title: r.title, text });
    if (result === 'copied' || result === 'shared') {
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const shown = items || itemsList;
  const byGroup = new Map();
  for (const [gi, ii] of shown) {
    if (!byGroup.has(gi)) byGroup.set(gi, []);
    byGroup.get(gi).push(ii);
  }
  const allPrepped = prepCount === totalItems && totalItems > 0;
  // The first piece of the card pairs title + shopping actions on one bar,
  // followed by the at-a-glance stub, portion scaler, and mise en place toggle.
  const normalHead = (
    <div className="menu-head" data-head="normal">
      <div className="menu-bar">
        <h2 className="menu-title" lang={textLang}>
          {r.ingredients_headline}
        </h2>
        <div className="menu-actions">
          {!miseOn && <StepProgress className="menu-progress" doneCount={gotCount} totalSteps={totalItems} />}
          <button
            type="button"
            className={cx('menu-action-btn menu-action-btn--copy', copied && 'is-copied')}
            aria-label={t.copyList}
            title={t.copyList}
            disabled={remainingCount === 0}
            onClick={handleCopy}
          >
            <span className="menu-action-box">
              <span className="menu-action-label">
                <ShoppingListIcon className="menu-action-icon" />
              </span>
              <span className="menu-action-done" aria-hidden="true">
                <CheckIcon className="menu-action-icon" strokeWidth={3} />
              </span>
            </span>
          </button>
          {!miseOn && gotCount > 0 && (
            <button
              type="button"
              className="menu-action-btn menu-action-btn--clear"
              aria-label={t.clearTicksLabel}
              title={t.clearTicksLabel}
              onClick={() => !measure && clearGotItems(recipe.slug)}
            >
              <ResetIcon className="menu-action-icon" />
            </button>
          )}
          <span className="sr-only" aria-live="polite">
            {copied ? t.copied : ''}
          </span>
        </div>
      </div>
      <RecipeGlance recipe={recipe} lang={lang} />
      <Scaler recipe={recipe} text={r} textLang={textLang} t={t} />
      {factor !== 1 && <p className="scale-note">{t.scaleNote}</p>}
      <div className="mise-bar" lang={lang}>
        <div className="mise-controls">
          <button
            type="button"
            className="mise-toggle"
            aria-pressed={miseOn}
            aria-label={mc.miseToggle(miseOn)}
            title={mc.miseToggle(miseOn)}
            onClick={() => !measure && toggleMiseMode(recipe.slug)}
          >
            <MiseIcon className="mise-toggle-icon" />
            <span>{mc.miseLabel}</span>
            {!miseOn && prepCount > 0 && (
              <span className="mise-saved-count" aria-hidden="true">
                · {prepCount}/{totalItems}
              </span>
            )}
          </button>
          {miseOn && prepCount > 0 && (
            <>
              <span
                className={cx('mise-progress', allPrepped && 'mise-progress--done')}
                aria-hidden="true"
              >
                {allPrepped ? mc.miseReady : `${prepCount}/${totalItems}`}
              </span>
              <button
                type="button"
                className="mise-clear"
                aria-label={mc.miseClear}
                title={mc.miseClear}
                onClick={() => !measure && clearPrepItems(recipe.slug)}
              >
                <ResetIcon className="menu-action-icon" />
              </button>
            </>
          )}
        </div>
        {linkedStepIndex !== null && linkedIds.size > 0 && (
          <button
            type="button"
            className="menu-step-chip"
            aria-label={mc.stepClear(linkedStepIndex + 1)}
            title={mc.stepClear(linkedStepIndex + 1)}
            onClick={() => !measure && clearStepLink(recipe.slug)}
          >
            <span className="menu-step-chip-dot" aria-hidden="true" />
            <span>{mc.stepBadge(linkedStepIndex + 1)}</span>
            <span className="menu-step-chip-x" aria-hidden="true">
              ×
            </span>
          </button>
        )}
        <span className="sr-only" aria-live="polite">
          {miseOn && prepCount > 0 ? mc.miseProgress(prepCount, totalItems) : ''}
        </span>
      </div>
    </div>
  );
  const contHead = (
    <div className="menu-head--cont" data-head="cont">
      <h2 className="menu-title" lang={textLang}>
        {r.ingredients_headline}
        <ContMark t={t} lang={lang} />
      </h2>
      <StepProgress
        className="menu-progress"
        doneCount={miseOn ? prepCount : gotCount}
        totalSteps={totalItems}
      />
    </div>
  );
  return (
    <section
      className={cx('menu', miseOn && 'menu--mise', linkedIds.size > 0 && 'menu--linked')}
      aria-label={cont ? `${t.ingredients} ${t.cont}` : t.ingredients}
      data-card="menu"
    >
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
                // display-only: the JSON amounts, scaled in the language they are written in
                const it = scaleIngredient(g.items[ii], factor, textLang, custom);
                const current = amountsFor(it, units);
                const alt = current.secondary ? amountsFor(it, units === 'cups' ? 'metric' : 'cups') : null;
                const itemId = `${gi}:${ii}`;
                const isGot = !measure && !miseOn && gotItems.has(itemId);
                const isPrepped = !measure && miseOn && prepItems.has(itemId);
                const isLinked = !measure && linkedIds.has(itemId);
                return (
                  <li
                    className={cx(
                      'ing',
                      isGot && 'ing--got',
                      isPrepped && 'ing--prepped',
                      isLinked && 'ing--linked',
                    )}
                    key={ii}
                    data-item={itemId}
                  >
                    <button
                      type="button"
                      className="ing-btn"
                      aria-pressed={miseOn ? isPrepped : isGot}
                      onClick={() => {
                        if (measure) return;
                        if (miseOn) togglePrepItem(recipe.slug, itemId);
                        else toggleGotItem(recipe.slug, itemId);
                      }}
                    >
                      <span className="ing-tick" aria-hidden="true">
                        <CheckIcon className="ing-tick-svg" />
                      </span>
                      <span className="ing-main">
                        <span className="ing-what">
                          <span className="ing-name">{it.name}</span>
                          {it.note && (
                            <span className="ing-note">
                              <span className="sr-only">, </span>
                              {it.note}
                            </span>
                          )}
                        </span>
                        <span className="ing-how">
                          <span className="ing-how-live" data-swappable={current.secondary ? 'true' : undefined}>
                            <AmountPair amounts={current} comma />
                          </span>
                          {alt && (
                            <span className="ing-how-sizer" aria-hidden="true">
                              <AmountPair amounts={alt} />
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
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
