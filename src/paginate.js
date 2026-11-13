// Lays each recipe into fixed-height book pages, the way a printed book does.
// It clones the real rendered blocks into a page-sized box and measures,
// so the split follows the actual fonts, width and language, never a guess.
// Rows, steps and the tips row are never split; a card that runs over
// continues on the next page under a "(cont.)" head.

function el(cls) {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

// `slack` lowers the usable page height; balancing uses it (see paginate below).
// It is a number for every page, or a function of the page index.
function newPageBox(root, src, pageIndex, slackFor) {
  const slack = typeof slackFor === 'function' ? slackFor(pageIndex) : slackFor;
  const face = el('face face--L');
  const body = el('page-body recipe');
  const top = el('checkers checkers--choc checkers--top');
  const pad = el('page-pad');
  body.append(top, pad);
  face.append(body);
  root.append(face);
  if (pageIndex > 0) pad.append(src.querySelector('[data-unit="running"]').cloneNode(true));
  return {
    face,
    pad,
    fits: () => top.offsetHeight + pad.offsetHeight + slack <= face.clientHeight + 0.5,
    used: () => (top.offsetHeight + pad.offsetHeight) / face.clientHeight,
  };
}

// Measure every block, head, group, row, step and tip of one recipe in a
// single DOM layout pass instead of forcing thousands of synchronous layouts
// across candidate page-break searches.
function measureRecipe(root, src, pageHeight) {
  const face = el('face face--L');
  const body = el('page-body recipe');
  const top = el('checkers checkers--choc checkers--top');
  const pad = el('page-pad');
  body.append(top, pad);
  face.append(body);
  root.append(face);

  const runningSrc = src.querySelector('[data-unit="running"]');
  const heroSrc = src.querySelector('[data-unit="hero"]');
  const menuSrc = src.querySelector('[data-card="menu"]');
  const ticketSrc = src.querySelector('[data-card="ticket"]');
  const tipsSrc = src.querySelector('[data-card="tips"]');
  const macrosSrc = src.querySelector('[data-unit="macros"]');
  const creditsSrc = src.querySelector('[data-unit="credits"]');

  const running = runningSrc?.cloneNode(true);
  const hero = heroSrc?.cloneNode(true);
  const menu = menuSrc?.cloneNode(true);
  const ticket = ticketSrc?.cloneNode(true);
  const tips = tipsSrc?.cloneNode(true);
  const macros = macrosSrc?.cloneNode(true);
  const credits = creditsSrc?.cloneNode(true);

  for (const node of [running, hero, menu, ticket, tips, macros, credits]) {
    if (node) pad.append(node);
  }

  const faceH = face.clientHeight || pageHeight;
  const topH = top.offsetHeight;
  const padCS = getComputedStyle(pad);
  const padPadY = parseFloat(padCS.paddingTop) + parseFloat(padCS.paddingBottom);

  const runningH = running
    ? running.offsetHeight + parseFloat(getComputedStyle(running).marginBottom)
    : 0;
  const heroH = hero ? hero.offsetHeight : 0;

  let menuMetrics = null;
  if (menu) {
    const cs = getComputedStyle(menu);
    const normalHeads = [...menu.querySelectorAll(':scope > [data-head="normal"]')];
    const contHeads = [...menu.querySelectorAll(':scope > [data-head="cont"]')];
    const headHeight = (els) => {
      if (!els.length) return 0;
      const last = els.at(-1);
      const firstMT = parseFloat(getComputedStyle(els[0]).marginTop);
      const lastMB = parseFloat(getComputedStyle(last).marginBottom);
      return last.offsetTop + last.offsetHeight - els[0].offsetTop + firstMT + lastMB;
    };
    const groupEls = [...menu.querySelectorAll('.ing-group')];
    const groupGap = groupEls.length > 1 ? parseFloat(getComputedStyle(groupEls[1]).marginTop) : 0;
    const groups = groupEls.map((g) => {
      const titleEl = g.querySelector('.ing-group-title');
      const items = [...g.querySelectorAll('[data-item]')].map((li) => {
        const [gi, ii] = li.dataset.item.split(':').map(Number);
        const h = li.offsetHeight;
        const borderTop = parseFloat(getComputedStyle(li).borderTopWidth);
        return { id: [gi, ii], h, borderTop };
      });
      return {
        h: g.offsetHeight,
        titleH: titleEl ? titleEl.offsetHeight : 0,
        ids: items.map((x) => x.id),
        items,
      };
    });
    const rows = groups.flatMap((g, gIdx) =>
      g.items.map((item) => ({ ...item, titleH: g.titleH, gIdx })),
    );
    menuMetrics = {
      marginTop: parseFloat(cs.marginTop),
      chrome:
        parseFloat(cs.borderTopWidth) +
        parseFloat(cs.borderBottomWidth) +
        parseFloat(cs.paddingTop) +
        parseFloat(cs.paddingBottom),
      normalHeadH: headHeight(normalHeads),
      contHeadH: headHeight(contHeads),
      groupGap,
      groups,
      rows,
    };
  }

  let ticketMetrics = null;
  if (ticket) {
    const cs = getComputedStyle(ticket);
    const normalHeads = [...ticket.querySelectorAll(':scope > [data-head="normal"]')];
    const contHeads = [...ticket.querySelectorAll(':scope > [data-head="cont"]')];
    const headHeight = (els) => {
      if (!els.length) return 0;
      const last = els.at(-1);
      const firstMT = parseFloat(getComputedStyle(els[0]).marginTop);
      const lastMB = parseFloat(getComputedStyle(last).marginBottom);
      return last.offsetTop + last.offsetHeight - els[0].offsetTop + firstMT + lastMB;
    };
    const steps = [...ticket.querySelectorAll('[data-step]')].map((li) => ({
      id: Number(li.dataset.step),
      h: li.offsetHeight,
    }));
    ticketMetrics = {
      marginTop: parseFloat(cs.marginTop),
      chrome:
        parseFloat(cs.borderTopWidth) +
        parseFloat(cs.borderBottomWidth) +
        parseFloat(cs.paddingTop) +
        parseFloat(cs.paddingBottom),
      normalHeadH: headHeight(normalHeads),
      contHeadH: headHeight(contHeads),
      steps,
    };
  }

  let tipsMetrics = null;
  if (tips) {
    const cs = getComputedStyle(tips);
    const items = [...tips.querySelectorAll('[data-tip]')].map((t) => ({
      id: Number(t.dataset.tip),
      h: t.offsetHeight,
    }));
    const cols = Math.max(1, cs.gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length);
    tipsMetrics = {
      marginTop: parseFloat(cs.marginTop),
      cols,
      rowGap: parseFloat(cs.rowGap) || 0,
      items,
    };
  }

  let macrosMetrics = null;
  if (macros) {
    macrosMetrics = {
      marginTop: parseFloat(getComputedStyle(macros).marginTop),
      h: macros.offsetHeight,
    };
  }

  let creditsMetrics = null;
  if (credits) {
    const cs = getComputedStyle(credits);
    const trim = parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop);
    creditsMetrics = {
      marginTop: parseFloat(cs.marginTop),
      h: credits.offsetHeight,
      afterRunningH: credits.offsetHeight - trim,
    };
  }

  face.remove();
  return {
    faceH,
    topH,
    padPadY,
    runningH,
    heroH,
    menu: menuMetrics,
    ticket: ticketMetrics,
    tips: tipsMetrics,
    macros: macrosMetrics,
    credits: creditsMetrics,
  };
}

// `cut`: when the card is split anyway, end its first piece after this many
// units (rows or groups) so the right page has room for the method too.
function paginateOne(m, slack = 0, byRows = false, cut = null, menuBreaks = []) {
  const pages = [];
  const used = [];
  let overflow = false;
  let segs = [];
  let blockH = 0;

  const pageSlack = (idx) => (typeof slack === 'function' ? slack(idx) : slack);
  const currentPadH = (extra = 0) => m.padPadY + (pages.length > 0 ? m.runningH : 0) + blockH + extra;
  const fits = (extra = 0) => m.topH + currentPadH(extra) + pageSlack(pages.length) <= m.faceH + 0.5;
  const pageUsed = () => (m.topH + currentPadH()) / m.faceH;

  const nextPage = () => {
    pages.push(segs);
    used.push(pageUsed());
    segs = [];
    blockH = 0;
  };

  const placeAtom = (exists, h, marginTop, seg, afterRunningH = h) => {
    if (!exists) return;
    const isFirst = segs.length === 0;
    const addedFirst = isFirst ? (pages.length > 0 ? afterRunningH : h) : marginTop + h;
    if (!fits(addedFirst) && segs.length) {
      nextPage();
      const onFresh = pages.length > 0 ? afterRunningH : h;
      blockH += onFresh;
      segs.push(seg);
      if (!fits()) overflow = true;
      return;
    }
    blockH += addedFirst;
    segs.push(seg);
    if (!fits()) overflow = true;
  };

  const placeCard = (kind, units, meta, stepDelta, limit = null) => {
    if (!meta || !units.length) return;
    let cardBase = 0;
    let cardContent = 0;
    let seg = null;
    let ctx = null;
    let placed = 0;

    const open = () => {
      const marginTop = segs.length > 0 ? meta.marginTop : 0;
      const headH = placed ? meta.contHeadH : meta.normalHeadH;
      cardBase = marginTop + meta.chrome + headH;
      cardContent = 0;
      ctx = {};
      seg = { kind, cont: placed > 0, items: [] };
      segs.push(seg);
    };

    for (const u of units) {
      if (!seg) open();
      const delta = stepDelta(ctx, u, false);
      const forced =
        (limit !== null && pages.length === 0 && placed >= limit) ||
        (kind === 'menu' && menuBreaks.includes(placed));
      if (forced || !fits(cardBase + cardContent + delta)) {
        const pageHadOtherBlocks = segs.length > 1 || seg.items.length > 0;
        if (pageHadOtherBlocks) {
          if (!seg.items.length) segs.pop();
          else blockH += cardBase + cardContent;
          nextPage();
          open();
        }
        cardContent += stepDelta(ctx, u, true);
        if (!fits(cardBase + cardContent)) overflow = true;
      } else {
        cardContent += stepDelta(ctx, u, true);
      }
      if (u.ids) seg.items.push(...u.ids);
      else seg.items.push(u.id);
      placed++;
    }
    if (seg && seg.items.length) blockH += cardBase + cardContent;
  };

  placeAtom(m.heroH > 0, m.heroH, 0, { kind: 'hero' });

  if (m.menu) {
    if (!byRows) {
      placeCard(
        'menu',
        m.menu.groups,
        m.menu,
        (ctx, g, commit) => {
          const delta = (ctx.count ? m.menu.groupGap : 0) + g.h;
          if (commit) ctx.count = (ctx.count || 0) + 1;
          return delta;
        },
        cut,
      );
    } else {
      placeCard(
        'menu',
        m.menu.rows,
        m.menu,
        (ctx, row, commit) => {
          let delta = 0;
          if (ctx.gi === row.id[0]) {
            delta = row.borderTop ? row.h : row.h;
          } else {
            const firstRowH = row.h - row.borderTop;
            const titleH = row.id[1] === 0 ? row.titleH : 0;
            delta = (ctx.gi !== undefined ? m.menu.groupGap : 0) + titleH + firstRowH;
            if (commit) ctx.gi = row.id[0];
          }
          return delta;
        },
        cut,
      );
    }
  }

  if (pages.length === 0) nextPage();

  if (m.ticket) {
    placeCard('ticket', m.ticket.steps, m.ticket, (_ctx, step) => step.h);
  }

  if (m.tips) {
    placeCard('tips', m.tips.items, { marginTop: m.tips.marginTop, chrome: 0, normalHeadH: 0, contHeadH: 0 }, (ctx, tip, commit) => {
      const idx = ctx.items ? ctx.items.length : 0;
      let delta = 0;
      if (m.tips.cols >= 2) {
        const col = idx % m.tips.cols;
        if (col === 0) {
          delta = (idx > 0 ? m.tips.rowGap : 0) + tip.h;
          if (commit) {
            ctx.rowMax = tip.h;
            (ctx.items ||= []).push(tip.h);
          }
        } else {
          delta = Math.max(0, tip.h - (ctx.rowMax || 0));
          if (commit) {
            ctx.rowMax = Math.max(ctx.rowMax || 0, tip.h);
            ctx.items.push(tip.h);
          }
        }
      } else {
        delta = (idx > 0 ? m.tips.rowGap : 0) + tip.h;
        if (commit) (ctx.items ||= []).push(tip.h);
      }
      return delta;
    });
  }

  if (m.macros) placeAtom(true, m.macros.h, m.macros.marginTop, { kind: 'macros' });
  if (m.credits) placeAtom(true, m.credits.h, m.credits.marginTop, { kind: 'credits' }, m.credits.afterRunningH);

  pages.push(segs);
  used.push(pageUsed());

  const firstMenu = pages[0].find((seg) => seg.kind === 'menu');
  const menuSplit = !!firstMenu && pages.slice(1).some((p) => p.some((seg) => seg.kind === 'menu'));
  const firstUnits = !firstMenu
    ? 0
    : byRows
      ? firstMenu.items.length
      : m.menu.groups.filter((g) => firstMenu.items.some((id) => id[0] === g.ids[0][0])).length;
  return { pages, used, overflow, menuSplit, firstUnits };
}

// Repair each ingredient boundary where it occurs. Cutting only the first
// page can otherwise move several rows off it just to fix a later group's
// one- or two-row tail, even though its own continuation was already legal.
function paginateLegal(m, rows, slack = 0, byRows = false, cut = null) {
  let breaks = [];
  let plan = paginateOne(m, slack, byRows, cut, breaks);
  if (!byRows) return plan;
  for (let attempt = 0; attempt < rows.length; attempt++) {
    const pieces = plan.pages.flatMap((p) => p.filter((s) => s.kind === 'menu'));
    let placed = 0;
    let repair = null;
    for (let i = 0; i + 1 < pieces.length; i++) {
      placed += pieces[i].items.length;
      const group = rows[placed - 1][0];
      if (rows[placed][0] !== group) continue;
      const before = rows.slice(0, placed).filter((id) => id[0] === group).length;
      const after = rows.slice(placed).filter((id) => id[0] === group).length;
      if (before < 2 || after < 3) {
        repair = placed - (before < 2 ? before : 3 - after);
        break;
      }
    }
    // A group that cannot form a legal piece even on a fresh page has no
    // earlier boundary to try. Leave it for the existing overflow ranking.
    if (repair === null || repair <= 0 || breaks.includes(repair)) return plan;
    breaks = [...breaks.filter((at) => at < repair), repair];
    plan = paginateOne(m, slack, byRows, cut, breaks);
  }
  return plan;
}

export function paginate(root) {
  const plans = {};
  const pageHeight = root.clientHeight;
  for (const src of root.querySelectorAll('[data-src]')) {
    plans[src.dataset.src] = balance(root, src, pageHeight);
  }
  return plans;
}

// Cookbook layout first (header + whole card left, method from the right page),
// then a small search over candidate layouts for the one with the fewest pages
// and no page left with an empty bottom half.
function balance(root, src, pageHeight) {
  const m = measureRecipe(root, src, pageHeight);
  const rows = m.menu ? m.menu.rows.map((r) => r.id) : [];
  let byRows = false;
  let greedy = paginateOne(m, 0, byRows);
  const headerAlone = !greedy.pages[0].some((seg) => seg.kind === 'menu');
  if (greedy.overflow || headerAlone) {
    // A group taller than a page, or a card whose first group cannot sit beside
    // the header: split that card by rows rather than leave the header alone.
    byRows = true;
    greedy = paginateLegal(m, rows, 0, byRows);
  }
  // Search every earlier cut: a large first piece may need more than three
  // rows removed to leave a legal continuation of its final group.
  const cuts = [null];
  if (greedy.menuSplit) for (let cut = greedy.firstUnits - 1; cut >= 1; cut--) cuts.push(cut);
  const SAMPLES = 8;
  const range = pageHeight * 0.6;
  // Continuation rules and a full left page take precedence over balancing
  // later pages. A soft penalty let a 5/4 dough split beat the valid 6/3 split.
  const rank = (plan) => [Number(plan.overflow), widows(plan, ['menu']), -plan.firstUnits, score(plan)];
  const better = (a, b) => {
    const ar = rank(a), br = rank(b);
    for (let i = 0; i < ar.length; i++) if (ar[i] !== br[i]) return ar[i] < br[i];
    return false;
  };
  let best = greedy;
  const consider = (plan) => {
    if (better(plan, best)) best = plan;
  };
  for (const cut of cuts) {
    const base = cut === null ? greedy : paginateLegal(m, rows, 0, byRows, cut);
    consider(base);
    // Later-page balancing cannot improve a worse first ingredient piece.
    if (base.overflow || widows(base, ['menu']) > widows(best, ['menu']) ||
        (base.firstUnits < best.firstUnits && widows(base, ['menu']) === widows(best, ['menu']))) continue;
    const last = base.pages.length - 1;
    for (let i = 1; i <= SAMPLES; i++) {
      const extra = (range * i) / SAMPLES;
      consider(paginateLegal(m, rows, (p) => (p >= 2 && p < last ? extra : 0), byRows, cut));
      for (let targetPage = 1; targetPage < last; targetPage++) {
        consider(paginateLegal(m, rows, (p) => (p === targetPage ? extra : 0), byRows, cut));
      }
    }
  }
  // Measure the ornament with the exact closing-page styles; a percentage of
  // unused space alone cannot guarantee that it fits on a short desktop.
  const pages = best.pages.map((segs, i) => {
    if (i === 0 || !isClosing(segs)) return segs;
    const box = newPageBox(root, src, i, 0);
    box.pad.parentElement.classList.add('page-body--closing');
    box.pad.classList.add('page-pad--closing');
    const ornament = src.querySelector('.closing-cupcake')?.cloneNode(true);
    if (ornament) box.pad.append(ornament);
    for (const seg of segs) {
      if (seg.kind === 'credits' || seg.kind === 'macros') {
        box.pad.append(src.querySelector(`[data-unit="${seg.kind}"]`).cloneNode(true));
      }
      if (seg.kind === 'tips') {
        const tips = src.querySelector('[data-card="tips"]').cloneNode(true);
        for (const tip of tips.querySelectorAll('[data-tip]')) if (!seg.items.includes(Number(tip.dataset.tip))) tip.remove();
        box.pad.append(tips);
      }
    }
    const fits = box.fits();
    box.face.remove();
    return ornament && fits ? [{ kind: 'ornament' }, ...segs] : segs;
  });
  return placePhoto(root, src, pages, best.used, pageHeight);
}

// The finished-bake photo is optional: when a recipe ends on a left page, the
// photo takes the facing right page (instead of leaving it blank). Otherwise it
// goes at the end of the last page when at least PHOTO_MIN px fits there (up to
// 42% of the page). It never adds a spread.
const PHOTO_MIN = 110;
function placePhoto(root, src, pages, used, pageHeight) {
  const figure = src.querySelector('[data-unit="photo"]');
  if (!figure) return pages;
  const max = Math.round(pageHeight * 0.42);
  const last = pages.length - 1;
  if (last > 0 && pages.length % 2 === 1) return [...pages, [{ kind: 'photo', h: max }]];
  // Everything around the picture (label, mat, credit, margin), measured once.
  const box = newPageBox(root, src, 1, 0);
  const probe = figure.cloneNode(true);
  probe.style.setProperty('--photo-h', `${PHOTO_MIN}px`);
  box.pad.append(probe);
  const img = probe.querySelector('img');
  const chrome = probe.getBoundingClientRect().height - img.getBoundingClientRect().height + parseFloat(getComputedStyle(probe).marginTop);
  box.face.remove();
  const room = (1 - used[last]) * pageHeight - 12 - chrome;
  if (room >= PHOTO_MIN) {
    const h = Math.floor(Math.min(max, room));
    return [...pages.slice(0, last), [...pages[last].filter((seg) => seg.kind !== 'ornament'), { kind: 'photo', h }]];
  }
  return pages;
}

// A closing page holds only tips, macros and/or the credits: it is composed on purpose
// (see .page-pad--closing), so it may be short.
export const isClosing = (segs) =>
  segs.length > 0 && segs.every((seg) => ['tips', 'macros', 'credits', 'ornament', 'photo'].includes(seg.kind));

// Widows and orphans in a split card: an ingredient piece on either side of a
// page break must carry at least 3 rows (or all that remain, if fewer). The
// method follows the same rule loosely: a lone last step is not left on its own
// page when the piece before it had 3 or more to give.
function widows(plan, kinds = ['menu', 'ticket']) {
  let n = 0;
  for (const kind of kinds) {
    const pieces = plan.pages.flatMap((segs) => segs.filter((seg) => seg.kind === kind)).map((seg) => seg.items.length);
    if (pieces.length < 2) continue;
    const total = pieces.reduce((a, b) => a + b, 0);
    if (kind === 'menu') {
      // Only a group split across a page break counts: at least 3 of its rows
      // must continue, and at least 2 stay before the break. A whole short group
      // continuing on its own is fine.
      const segs = plan.pages.flatMap((p) => p.filter((seg) => seg.kind === 'menu'));
      for (let i = 0; i + 1 < segs.length; i++) {
        const last = segs[i].items.at(-1);
        const next = segs[i + 1].items[0];
        if (!last || !next || last[0] !== next[0]) continue;
        const g = last[0];
        const before = segs.slice(0, i + 1).flatMap((s) => s.items).filter((id) => id[0] === g).length;
        const after = segs.slice(i + 1).flatMap((s) => s.items).filter((id) => id[0] === g).length;
        if (after < 3 || before < 2) n++;
      }
    } else if (total > 1 && pieces.at(-1) === 1 && pieces.at(-2) >= 3) n++;
  }
  return n;
}

// Lower is better: every extra page costs, and so does every page left under
// about 60% full (`used` includes ~10% of padding and checkers), splitting the
// two-column tips pair, or a later spread starkly unbalanced left-to-right.
function score(plan) {
  const tipPieces = plan.pages.flatMap((segs) => segs.filter((seg) => seg.kind === 'tips')).length;
  let s = plan.pages.length * 4 + widows(plan) * 100 + (tipPieces > 1 ? 5 : 0);
  plan.pages.forEach((segs, i) => {
    // Credits alone are centred with an ornament when it fits. Do not pull
    // tips off a method page just to decorate an already composed closing.
    if (isClosing(segs)) return;
    const gap = Math.max(0, 0.65 - plan.used[i]);
    s += gap * gap * 10;
    if (i >= 2 && i % 2 === 0 && i + 1 < plan.pages.length && !isClosing(plan.pages[i + 1])) {
      const diff = Math.max(0, Math.abs(plan.used[i] - plan.used[i + 1]) - 0.14);
      s += diff * diff * 2;
    }
  });
  return s;
}
