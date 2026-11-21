import { Fragment, memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CheckIcon, ResetIcon, ShoppingListIcon } from './ornaments.jsx';
import { ContMark, cx, StepProgress, useRecipeText } from './recipeUI.jsx';
import { readingCopyFor } from './recipe-reading-i18n.js';
import { recipeSummary } from './recipeMeta.js';
import { scaleAmount } from './scale.js';
import { clearGotItems, formatShoppingList, getGotItems, shareOrCopyList, subscribeShopping, toggleGotItem } from './shopping.js';
import { amountsFor } from './units.js';
import { useScale } from './useScale.js';
import Scaler from './Scaler.jsx';
import './recipe-reading.css';

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

const allItemsCache = new WeakMap();
const allItems = (r) => {
  let list = allItemsCache.get(r);
  if (!list) {
    list = r.groups.flatMap((g, gi) => g.items.map((_, ii) => [gi, ii]));
    allItemsCache.set(r, list);
  }
  return list;
};

const summaryCache = new WeakMap();
function cachedRecipeSummary(recipe) {
  const key = recipe?.en || recipe?.de || recipe?.fr;
  if (!key) return recipeSummary(recipe);
  let summary = summaryCache.get(key);
  if (!summary) {
    summary = recipeSummary(recipe);
    summaryCache.set(key, summary);
  }
  return summary;
}

const EMPTY_GOT = new Set();
const noopSubscribe = () => () => {};

function useGotItems(slug, measure = false) {
  return useSyncExternalStore(
    measure ? noopSubscribe : subscribeShopping,
    () => (measure ? EMPTY_GOT : getGotItems(slug)),
  );
}

const RecipeGlance = memo(function RecipeGlance({ recipe, lang }) {
  const rt = readingCopyFor(lang);
  const { totalTimeLabel, difficulty } = cachedRecipeSummary(recipe);
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
        <dd className="recipe-glance-value">{diffLabel}</dd>
      </div>
    </dl>
  );
});

const IngredientRow = memo(function IngredientRow({
  slug,
  itemId,
  raw,
  factor,
  textLang,
  custom,
  units,
  isGot,
  measure,
}) {
  // display-only: the JSON amounts, scaled in the language they are written in
  const it = useMemo(
    () => scaleIngredient(raw, factor, textLang, custom),
    [raw, factor, textLang, custom],
  );
  const current = amountsFor(it, units);
  const alt = current.secondary ? amountsFor(it, units === 'cups' ? 'metric' : 'cups') : null;
  return (
    <li className={cx('ing', isGot && 'ing--got')} data-item={itemId}>
      <button
        type="button"
        className="ing-btn"
        aria-pressed={isGot}
        onClick={measure ? undefined : () => toggleGotItem(slug, itemId)}
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
});

const IngredientsInner = memo(function IngredientsInner({
  recipe,
  lang,
  units,
  items,
  cont = false,
  measure = false,
  factor,
  custom,
}) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  const gotItems = useGotItems(recipe.slug, measure);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(0);

  useEffect(() => {
    if (measure) return;
    setCopied(false);
    clearTimeout(copyTimerRef.current);
  }, [recipe.slug, measure]);

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const itemsList = allItems(r);
  const totalItems = itemsList.length;
  const gotCount =
    measure || gotItems.size === 0
      ? 0
      : itemsList.reduce((n, [gi, ii]) => n + (gotItems.has(`${gi}:${ii}`) ? 1 : 0), 0);
  const remainingCount = totalItems - gotCount;

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
  const groupEntries = useMemo(() => {
    const byGroup = new Map();
    for (const [gi, ii] of shown) {
      let arr = byGroup.get(gi);
      if (!arr) {
        arr = [];
        byGroup.set(gi, arr);
      }
      arr.push(ii);
    }
    return [...byGroup];
  }, [shown]);

  // The first piece of the card pairs title + shopping actions on one bar,
  // followed by the at-a-glance stub and portion scaler.
  const normalHead = (measure || !cont) && (
    <div className="menu-head" data-head="normal">
      <div className="menu-bar">
        <h2 className="menu-title" lang={textLang}>
          {r.ingredients_headline}
        </h2>
        <div className="menu-actions">
          <StepProgress className="menu-progress" doneCount={gotCount} totalSteps={totalItems} />
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
          {gotCount > 0 && (
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
      <Scaler recipe={recipe} text={r} textLang={textLang} t={t} measure={measure} />
      {factor !== 1 && <p className="scale-note">{t.scaleNote}</p>}
    </div>
  );
  const contHead = (measure || cont) && (
    <div className="menu-head--cont" data-head="cont">
      <h2 className="menu-title" lang={textLang}>
        {r.ingredients_headline}
        <ContMark t={t} lang={lang} />
      </h2>
      <StepProgress className="menu-progress" doneCount={gotCount} totalSteps={totalItems} />
    </div>
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
      {groupEntries.map(([gi, iis]) => {
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
                const itemId = `${gi}:${ii}`;
                return (
                  <IngredientRow
                    key={ii}
                    slug={recipe.slug}
                    itemId={itemId}
                    raw={g.items[ii]}
                    factor={factor}
                    textLang={textLang}
                    custom={custom}
                    units={units}
                    isGot={!measure && gotItems.has(itemId)}
                    measure={measure}
                  />
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
});

export default memo(function Ingredients({ recipe, lang, units, items, cont = false, measure = false }) {
  const { factor, custom } = useScale(recipe);
  return (
    <IngredientsInner
      recipe={recipe}
      lang={lang}
      units={units}
      items={items}
      cont={cont}
      measure={measure}
      factor={factor}
      custom={custom}
    />
  );
});
