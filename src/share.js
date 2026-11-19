import { factorLabel } from './scale.js';

// Deep-link hash routing and recipe sharing helpers.
// Canonical recipe URLs use #/r/<slug> while legacy #/<route> and #/<slug>
// hashes continue to resolve to the same recipe.

export function recipeHash(recipeOrSlug) {
  const slug = typeof recipeOrSlug === 'string' ? recipeOrSlug : recipeOrSlug?.slug;
  return slug ? `#/r/${encodeURIComponent(slug)}` : '#/';
}

export function hashForSpread(spread) {
  if (!spread) return '#/';
  if (spread.kind === 'recipe' && spread.recipe?.slug) return recipeHash(spread.recipe.slug);
  return `#/${spread.route || ''}`;
}

export function routeOfHash(hash) {
  let raw = String(hash || '')
    .replace(/^#\/?/, '')
    .split('?')[0]
    .replace(/\/+$/, '');
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep raw token if percent-encoding is malformed */
  }
  return raw;
}

export function spreadMatchesRoute(spread, route) {
  if (!spread) return false;
  const target = String(route || '').trim().toLowerCase();
  const spreadRoute = String(spread.route || '').toLowerCase();
  if (!target) return spreadRoute === '';
  if (spreadRoute === target) return true;
  if (spread.kind === 'recipe' && spread.recipe) {
    const slug = String(spread.recipe.slug || '').toLowerCase();
    if (slug && slug === target) return true;
    if (target.startsWith('r/')) {
      const sub = target.slice(2);
      if (sub && (sub === slug || sub === spreadRoute)) return true;
    }
  }
  return false;
}

export function recipeShareUrl(recipe, loc = globalThis.location) {
  const hash = recipeHash(recipe);
  if (!loc?.href) return hash;
  try {
    const url = new URL(loc.href);
    url.hash = hash;
    return url.toString();
  } catch {
    return `${loc.origin || ''}${loc.pathname || ''}${loc.search || ''}${hash}`;
  }
}

export async function shareRecipe({
  title,
  url,
  nav = globalThis.navigator,
  doc = globalThis.document,
} = {}) {
  if (!url) return 'empty';

  if (typeof nav?.share === 'function') {
    const payload = title ? { title, url } : { url };
    const canShare = typeof nav.canShare === 'function' ? nav.canShare(payload) : true;
    if (canShare) {
      try {
        await nav.share(payload);
        return 'shared';
      } catch (err) {
        if (err?.name === 'AbortError') return 'aborted';
        /* fall through to clipboard when native share is unavailable or blocked */
      }
    }
  }

  if (typeof nav?.clipboard?.writeText === 'function') {
    try {
      await nav.clipboard.writeText(url);
      return 'copied';
    } catch {
      /* fall through to legacy textarea copy */
    }
  }

  if (doc?.createElement && doc?.body) {
    const textarea = doc.createElement('textarea');
    textarea.value = url;
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

export function formatScaleBadge(factor, custom = false, lang = 'en') {
  if (!custom) return factorLabel(factor);
  const formatted = new Intl.NumberFormat(lang, {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(factor);
  return `${formatted}×`;
}
