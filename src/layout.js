import { recipes } from './content.js';
import { hashForSpread, routeOfHash, spreadMatchesRoute } from './share.js';

export { hashForSpread, routeOfHash, spreadMatchesRoute };

let cachedNarrowSpreads = null;
let cachedNullWideSpreads = null;
const wideSpreadsByPlans = new WeakMap();

// The book as a list of spreads. Phone: one page per spread (R only).
// Wide: cover alone, contents, then each recipe over as many spreads as its
// paginated pages need. A recipe always starts on a left page.
export function buildSpreads(wide, plans) {
  if (!wide) {
    if (cachedNarrowSpreads) return cachedNarrowSpreads;
    const spreads = [
      { route: '', kind: 'cover', offset: 0, L: null, R: { type: 'cover' } },
      {
        route: 'contents',
        kind: 'contents',
        offset: 0,
        L: null,
        R: { type: 'contentsList', withTitle: true },
      },
    ];
    for (const recipe of recipes) {
      spreads.push({
        route: recipe.route,
        kind: 'recipe',
        recipe,
        offset: 0,
        L: null,
        R: { type: 'recipeFull', recipe },
      });
    }
    cachedNarrowSpreads = spreads;
    return spreads;
  }

  if (plans && typeof plans === 'object') {
    const cached = wideSpreadsByPlans.get(plans);
    if (cached) return cached;
  } else if (cachedNullWideSpreads) {
    return cachedNullWideSpreads;
  }

  const spreads = [
    { route: '', kind: 'cover', offset: 0, L: null, R: { type: 'cover' } },
    {
      route: 'contents',
      kind: 'contents',
      offset: 0,
      L: { type: 'contentsLeft' },
      R: { type: 'contentsList', withTitle: false },
    },
  ];
  for (const recipe of recipes) {
    // Before the first measurement: one spread, laid out unpaginated.
    const plan = plans?.[recipe.slug] || [null];
    const faces = plan.map((segs, i) => ({ type: 'recipePage', recipe, segs, first: i === 0 }));
    if (faces.length % 2) faces.push({ type: 'blank', recipe });
    for (let i = 0; i < faces.length; i += 2) {
      spreads.push({ route: recipe.route, kind: 'recipe', recipe, offset: i / 2, L: faces[i], R: faces[i + 1] });
    }
  }

  if (plans && typeof plans === 'object') wideSpreadsByPlans.set(plans, spreads);
  else cachedNullWideSpreads = spreads;
  return spreads;
}

export function firstIndexFor(spreads, route) {
  const i = spreads.findIndex((s) => spreadMatchesRoute(s, route));
  return i === -1 ? 0 : i;
}
