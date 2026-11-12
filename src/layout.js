import { recipes } from './content.js';

// The book as a list of spreads. Phone: one page per spread (R only).
// Wide: cover alone, contents, then each recipe over as many spreads as its
// paginated pages need. A recipe always starts on a left page.
export function buildSpreads(wide, plans) {
  const spreads = [
    { route: '', kind: 'cover', offset: 0, L: null, R: { type: 'cover' } },
    {
      route: 'contents',
      kind: 'contents',
      offset: 0,
      L: wide ? { type: 'contentsLeft' } : null,
      R: { type: 'contentsList', withTitle: !wide },
    },
  ];
  for (const recipe of recipes) {
    if (!wide) {
      spreads.push({ route: recipe.route, kind: 'recipe', recipe, offset: 0, L: null, R: { type: 'recipeFull', recipe } });
      continue;
    }
    // Before the first measurement: one spread, laid out unpaginated.
    const plan = plans?.[recipe.slug] || [null];
    const faces = plan.map((segs, i) => ({ type: 'recipePage', recipe, segs, first: i === 0 }));
    if (faces.length % 2) faces.push({ type: 'blank', recipe });
    for (let i = 0; i < faces.length; i += 2) {
      spreads.push({ route: recipe.route, kind: 'recipe', recipe, offset: i / 2, L: faces[i], R: faces[i + 1] });
    }
  }
  return spreads;
}

export function routeOfHash(hash) {
  return decodeURIComponent((hash || '').replace(/^#\/?/, '')).replace(/\/$/, '');
}

export function firstIndexFor(spreads, route) {
  const i = spreads.findIndex((s) => s.route === route);
  return i === -1 ? 0 : i;
}
