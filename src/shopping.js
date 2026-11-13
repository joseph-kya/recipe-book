import { textFor } from './recipe-i18n.js';
import { scaleAmount } from './scale.js';
import { amountsFor } from './units.js';

export const SHOPPING_KEY = 'recipe-book:shopping:v1';

const EMPTY_SET = new Set();
const ITEM_ID = /^\d+:\d+$/;
const gotBySlug = new Map();
const listeners = new Set();

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function reloadShopping(storage = defaultStorage()) {
  gotBySlug.clear();
  try {
    const raw = storage?.getItem(SHOPPING_KEY);
    if (!raw) return gotBySlug;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return gotBySlug;
    for (const [slug, items] of Object.entries(parsed)) {
      if (typeof slug !== 'string' || !slug || !Array.isArray(items)) continue;
      const set = new Set(items.filter((id) => typeof id === 'string' && ITEM_ID.test(id)));
      if (set.size > 0) gotBySlug.set(slug, set);
    }
  } catch {
    /* storage blocked or malformed: start with empty ticks */
  }
  return gotBySlug;
}

function persistShopping(storage = defaultStorage()) {
  try {
    if (!storage) return;
    const out = {};
    for (const [slug, set] of gotBySlug) {
      if (set.size > 0) out[slug] = [...set];
    }
    storage.setItem(SHOPPING_KEY, JSON.stringify(out));
  } catch {
    /* storage blocked: ticks still work this visit */
  }
}

function notify(slug) {
  for (const fn of listeners) fn(slug);
}

export function subscribeShopping(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getGotItems(slug) {
  return gotBySlug.get(slug) || EMPTY_SET;
}

export function toggleGotItem(slug, itemId, storage = defaultStorage()) {
  if (!slug || typeof itemId !== 'string' || !ITEM_ID.test(itemId)) return getGotItems(slug);
  const next = new Set(gotBySlug.get(slug));
  if (next.has(itemId)) next.delete(itemId);
  else next.add(itemId);
  if (next.size > 0) gotBySlug.set(slug, next);
  else gotBySlug.delete(slug);
  persistShopping(storage);
  notify(slug);
  return getGotItems(slug);
}

export function clearGotItems(slug, storage = defaultStorage()) {
  if (!gotBySlug.has(slug)) return;
  gotBySlug.delete(slug);
  persistShopping(storage);
  notify(slug);
}

export function formatShoppingList({
  recipe,
  lang = 'en',
  units = 'cups',
  factor = 1,
  custom = false,
  gotItems = EMPTY_SET,
}) {
  const { text, lang: textLang } = textFor(recipe, lang);
  const got = gotItems instanceof Set ? gotItems : new Set(gotItems || []);
  const lines = [];
  text.groups.forEach((group, gi) => {
    group.items.forEach((raw, ii) => {
      if (got.has(`${gi}:${ii}`)) return;
      const item =
        factor === 1
          ? raw
          : {
              ...raw,
              amount: scaleAmount(raw.amount, factor, textLang, custom),
              metric: scaleAmount(raw.metric, factor, textLang, custom),
            };
      const { primary } = amountsFor(item, units);
      lines.push(primary ? `${primary} ${item.name}` : item.name);
    });
  });
  if (!lines.length) return '';
  return [text.title, ...lines].join('\n');
}

export function isTouchDevice({
  matchMediaFn = globalThis.matchMedia,
  win = globalThis.window,
  nav = globalThis.navigator,
} = {}) {
  if (typeof matchMediaFn === 'function' && matchMediaFn('(pointer: coarse)').matches) return true;
  const hasTouchEvent = !!win && 'ontouchstart' in win;
  return hasTouchEvent && (nav?.maxTouchPoints ?? 0) > 0;
}

export async function shareOrCopyList({
  title,
  text,
  nav = globalThis.navigator,
  doc = globalThis.document,
  touch = isTouchDevice(),
} = {}) {
  if (!text) return 'empty';
  if (touch && typeof nav?.share === 'function') {
    try {
      await nav.share({ title, text });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'aborted';
    }
  }
  if (typeof nav?.clipboard?.writeText === 'function') {
    try {
      await nav.clipboard.writeText(text);
      return 'copied';
    } catch {
      /* fall through to legacy textarea copy */
    }
  }
  if (doc?.createElement && doc?.body) {
    const textarea = doc.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    doc.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = doc.execCommand?.('copy') ?? false;
    } finally {
      textarea.remove();
    }
    if (ok) return 'copied';
  }
  return 'failed';
}

reloadShopping();
