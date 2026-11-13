import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CheckIcon, ResetIcon, ShoppingListIcon } from './ornaments.jsx';
import { ContMark, cx, useRecipeText } from './recipeUI.jsx';
import { scaleAmount } from './scale.js';
import { clearGotItems, formatShoppingList, getGotItems, shareOrCopyList, subscribeShopping, toggleGotItem } from './shopping.js';
import { amountsFor } from './units.js';
import { useScale } from './useScale.js';
import Scaler from './Scaler.jsx';

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

export default function Ingredients({ recipe, lang, units, items, cont = false, measure = false }) {
  const { r, textLang, t } = useRecipeText(recipe, lang);
  const { factor, custom } = useScale(recipe);
  const gotItems = useGotItems(recipe.slug, measure);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(0);

  useEffect(() => {
    setCopied(false);
    clearTimeout(copyTimerRef.current);
  }, [recipe.slug]);

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const itemsList = allItems(r);
  const gotCount = itemsList.filter(([gi, ii]) => gotItems.has(`${gi}:${ii}`)).length;
  const remainingCount = itemsList.length - gotCount;

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
  // The first piece of the card carries the portion scale (and its note when scaled).
  const normalHead = (
    <div className="menu-head" data-head="normal">
      <h2 className="menu-title" lang={textLang}>
        {r.ingredients_headline}
      </h2>
      <Scaler recipe={recipe} text={r} textLang={textLang} t={t} />
      {factor !== 1 && <p className="scale-note">{t.scaleNote}</p>}
      <div className="menu-actions">
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
                // display-only: the JSON amounts, scaled in the language they are written in
                const it = scaleIngredient(g.items[ii], factor, textLang, custom);
                const current = amountsFor(it, units);
                const alt = current.secondary ? amountsFor(it, units === 'cups' ? 'metric' : 'cups') : null;
                const itemId = `${gi}:${ii}`;
                const isGot = !measure && gotItems.has(itemId);
                return (
                  <li className={cx('ing', isGot && 'ing--got')} key={ii} data-item={itemId}>
                    <button
                      type="button"
                      className="ing-btn"
                      aria-pressed={isGot}
                      onClick={() => !measure && toggleGotItem(recipe.slug, itemId)}
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
