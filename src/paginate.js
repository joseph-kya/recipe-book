// Lays each recipe into fixed-height book pages, the way a printed book does.
// It clones the real rendered blocks into a page-sized box and measures,
// so the split follows the actual fonts, width and language, never a guess.
// Rows, steps and the tips row are never split; a card that runs over
// continues on the next page under a "(cont.)" head.

const MAX_RECIPE_CACHE = 240;
const recipePlanCache = new Map();

function cacheGet(key) {
  const hit = recipePlanCache.get(key);
  if (hit !== undefined) {
    recipePlanCache.delete(key);
    recipePlanCache.set(key, hit);
  }
  return hit;
}

function cacheSet(key, value) {
  if (recipePlanCache.has(key)) recipePlanCache.delete(key);
  else if (recipePlanCache.size >= MAX_RECIPE_CACHE) {
    recipePlanCache.delete(recipePlanCache.keys().next().value);
  }
  recipePlanCache.set(key, value);
}

function el(cls) {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

function appendBatch(root, nodes) {
  if (!nodes.length) return;
  if (typeof document.createDocumentFragment === 'function') {
    const frag = document.createDocumentFragment();
    for (const node of nodes) frag.append(node);
    root.append(frag);
  } else {
    root.append(...nodes);
  }
}

// `slack` lowers the usable page height; balancing uses it (see paginate below).
// It is a number for every page, or a function of the page index.
function buildPageBox(src, pageIndex, slackFor) {
  const slack = typeof slackFor === 'function' ? slackFor(pageIndex) : slackFor;
  const face = el('face face--L');
  const body = el('page-body recipe');
  const top = el('checkers checkers--choc checkers--top');
  const pad = el('page-pad');
  body.append(top, pad);
  face.append(body);
  if (pageIndex > 0) pad.append(src.querySelector('[data-unit="running"]').cloneNode(true));
  return {
    face,
    pad,
    fits: () => top.offsetHeight + pad.offsetHeight + slack <= face.clientHeight + 0.5,
    used: () => (top.offsetHeight + pad.offsetHeight) / face.clientHeight,
  };
}

function buildMeasureFace(src) {
  const face = el('face face--L');
  const body = el('page-body recipe');
  const top = el('checkers checkers--choc checkers--top');
  const pad = el('page-pad');
  body.append(top, pad);
  face.append(body);

  const running = src.querySelector('[data-unit="running"]')?.cloneNode(true) || null;
  const hero = src.querySelector('[data-unit="hero"]')?.cloneNode(true) || null;
  const menu = src.querySelector('[data-card="menu"]')?.cloneNode(true) || null;
  const ticket = src.querySelector('[data-card="ticket"]')?.cloneNode(true) || null;
  const tips = src.querySelector('[data-card="tips"]')?.cloneNode(true) || null;
  const macros = src.querySelector('[data-unit="macros"]')?.cloneNode(true) || null;
  const credits = src.querySelector('[data-unit="credits"]')?.cloneNode(true) || null;

  for (const node of [running, hero, menu, ticket, tips, macros, credits]) {
    if (node) pad.append(node);
  }

  return { face, top, pad, running, hero, menu, ticket, tips, macros, credits };
}

function readMeasureFace(built, pageHeight) {
  const { face, top, pad, running, hero, menu, ticket, tips, macros, credits } = built;

  const px = (v) => parseFloat(v) || 0;
  const headHeight = (els) => {
    if (!els.length) return 0;
    const last = els.at(-1);
    const firstMT = px(getComputedStyle(els[0]).marginTop);
    const lastMB = px(getComputedStyle(last).marginBottom);
    return (last.offsetTop || 0) + last.offsetHeight - (els[0].offsetTop || 0) + firstMT + lastMB;
  };

  const faceH = face.clientHeight || pageHeight;
  const topH = top.offsetHeight;
  const padCS = getComputedStyle(pad);
  const padPadY = px(padCS.paddingTop) + px(padCS.paddingBottom);

  const runningH = running
    ? running.offsetHeight + px(getComputedStyle(running).marginBottom)
    : 0;
  const heroH = hero ? hero.offsetHeight : 0;

  let menuMetrics = null;
  if (menu) {
    const cs = getComputedStyle(menu);
    const normalHeads = [...menu.querySelectorAll(':scope > [data-head="normal"]')];
    const contHeads = [...menu.querySelectorAll(':scope > [data-head="cont"]')];
    const groupEls = [...menu.querySelectorAll('.ing-group')];
    const groupGap = groupEls.length > 1 ? px(getComputedStyle(groupEls[1]).marginTop) : 0;
    const groupTotals = [];
    const groups = groupEls.map((g) => {
      const titleEl = g.querySelector('.ing-group-title');
      const itemEls = [...g.querySelectorAll('[data-item]')];
      const firstBorderTop = itemEls.length > 0 ? px(getComputedStyle(itemEls[0]).borderTopWidth) : 0;
      const siblingBorderTop = itemEls.length > 1 ? px(getComputedStyle(itemEls[1]).borderTopWidth) : firstBorderTop;
      const items = itemEls.map((li, idx) => {
        const parts = li.dataset.item.split(':');
        const gi = Number(parts[0]);
        const ii = Number(parts[1]);
        const h = li.offsetHeight;
        const borderTop = idx === 0 ? firstBorderTop : siblingBorderTop;
        groupTotals[gi] = (groupTotals[gi] || 0) + 1;
        return { id: [gi, ii], h, borderTop };
      });
      return {
        h: g.offsetHeight,
        titleH: titleEl ? titleEl.offsetHeight : 0,
        ids: items.map((x) => x.id),
        items,
      };
    });
    const rows = [];
    const rowPosInGroup = [];
    const seenInGroup = [];
    for (let gIdx = 0; gIdx < groups.length; gIdx++) {
      const g = groups[gIdx];
      for (let i = 0; i < g.items.length; i++) {
        const item = g.items[i];
        const gi = item.id[0];
        const pos = (seenInGroup[gi] || 0) + 1;
        seenInGroup[gi] = pos;
        rowPosInGroup.push(pos);
        rows.push({ ...item, titleH: g.titleH, gIdx });
      }
    }
    menuMetrics = {
      marginTop: px(cs.marginTop),
      chrome:
        px(cs.borderTopWidth) +
        px(cs.borderBottomWidth) +
        px(cs.paddingTop) +
        px(cs.paddingBottom),
      normalHeadH: headHeight(normalHeads),
      contHeadH: headHeight(contHeads),
      groupGap,
      groups,
      rows,
      groupTotals,
      rowPosInGroup,
    };
  }

  let ticketMetrics = null;
  if (ticket) {
    const cs = getComputedStyle(ticket);
    const normalHeads = [...ticket.querySelectorAll(':scope > [data-head="normal"]')];
    const contHeads = [...ticket.querySelectorAll(':scope > [data-head="cont"]')];
    const steps = [...ticket.querySelectorAll('[data-step]')].map((li) => ({
      id: Number(li.dataset.step),
      h: li.offsetHeight,
    }));
    ticketMetrics = {
      marginTop: px(cs.marginTop),
      chrome:
        px(cs.borderTopWidth) +
        px(cs.borderBottomWidth) +
        px(cs.paddingTop) +
        px(cs.paddingBottom),
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
    const cols = Math.max(1, (cs.gridTemplateColumns || '').trim().split(/\s+/).filter(Boolean).length);
    tipsMetrics = {
      marginTop: px(cs.marginTop),
      cols,
      rowGap: px(cs.rowGap),
      items,
    };
  }

  let macrosMetrics = null;
  if (macros) {
    macrosMetrics = {
      marginTop: px(getComputedStyle(macros).marginTop),
      h: macros.offsetHeight,
    };
  }

  let creditsMetrics = null;
  if (credits) {
    const cs = getComputedStyle(credits);
    const trim = px(cs.borderTopWidth) + px(cs.paddingTop);
    creditsMetrics = {
      marginTop: px(cs.marginTop),
      h: credits.offsetHeight,
      afterRunningH: credits.offsetHeight - trim,
    };
  }

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

// Measure every block, head, group, row, step and tip of one recipe in a
// single DOM layout pass instead of forcing thousands of synchronous layouts
// across candidate page-break searches.
function measureRecipe(root, src, pageHeight) {
  const built = buildMeasureFace(src);
  root.append(built.face);
  const metrics = readMeasureFace(built, pageHeight);
  built.face.remove();
  return metrics;
}

const TIPS_META_CACHE = new WeakMap();
function tipsCardMeta(tips) {
  let meta = TIPS_META_CACHE.get(tips);
  if (!meta) {
    meta = { marginTop: tips.marginTop, chrome: 0, normalHeadH: 0, contHeadH: 0 };
    TIPS_META_CACHE.set(tips, meta);
  }
  return meta;
}

// `cut`: when the card is split anyway, end its first piece after this many
// units (rows or groups) so the right page has room for the method too.
function paginateOne(m, slack = 0, byRows = false, cut = null, menuBreaks = null) {
  const pages = [];
  const used = [];
  let overflow = false;
  let segs = [];
  let blockH = 0;

  const slackIsFn = typeof slack === 'function';
  const hasMenuBreaks = menuBreaks !== null && menuBreaks.length > 0;
  const currentPadH = (extra = 0) => m.padPadY + (pages.length > 0 ? m.runningH : 0) + blockH + extra;
  const fits = (extra = 0) =>
    m.topH + currentPadH(extra) + (slackIsFn ? slack(pages.length) : slack) <= m.faceH + 0.5;
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
    const checkBreaks = kind === 'menu' && hasMenuBreaks;

    const open = () => {
      const marginTop = segs.length > 0 ? meta.marginTop : 0;
      const headH = placed ? meta.contHeadH : meta.normalHeadH;
      cardBase = marginTop + meta.chrome + headH;
      cardContent = 0;
      ctx = {};
      seg = { kind, cont: placed > 0, items: [] };
      segs.push(seg);
    };

    for (let uIdx = 0; uIdx < units.length; uIdx++) {
      const u = units[uIdx];
      if (!seg) open();
      const delta = stepDelta(ctx, u, false);
      const forced =
        (limit !== null && pages.length === 0 && placed >= limit) ||
        (checkBreaks && menuBreaks.includes(placed));
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
      if (u.ids) {
        for (let k = 0; k < u.ids.length; k++) seg.items.push(u.ids[k]);
      } else {
        seg.items.push(u.id);
      }
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
            delta = row.h;
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
    placeCard('tips', m.tips.items, tipsCardMeta(m.tips), (ctx, tip, commit) => {
      const idx = ctx.count || 0;
      let delta = 0;
      if (m.tips.cols >= 2) {
        const col = idx % m.tips.cols;
        if (col === 0) {
          delta = (idx > 0 ? m.tips.rowGap : 0) + tip.h;
          if (commit) {
            ctx.rowMax = tip.h;
            ctx.count = idx + 1;
          }
        } else {
          delta = Math.max(0, tip.h - (ctx.rowMax || 0));
          if (commit) {
            ctx.rowMax = Math.max(ctx.rowMax || 0, tip.h);
            ctx.count = idx + 1;
          }
        }
      } else {
        delta = (idx > 0 ? m.tips.rowGap : 0) + tip.h;
        if (commit) ctx.count = idx + 1;
      }
      return delta;
    });
  }

  if (m.macros) placeAtom(true, m.macros.h, m.macros.marginTop, { kind: 'macros' });
  if (m.credits) placeAtom(true, m.credits.h, m.credits.marginTop, { kind: 'credits' }, m.credits.afterRunningH);

  pages.push(segs);
  used.push(pageUsed());

  let firstMenu = null;
  const page0 = pages[0];
  for (let i = 0; i < page0.length; i++) {
    if (page0[i].kind === 'menu') {
      firstMenu = page0[i];
      break;
    }
  }
  let menuSplit = false;
  if (firstMenu) {
    for (let p = 1; p < pages.length && !menuSplit; p++) {
      const pSegs = pages[p];
      for (let j = 0; j < pSegs.length; j++) {
        if (pSegs[j].kind === 'menu') {
          menuSplit = true;
          break;
        }
      }
    }
  }
  let firstUnits = 0;
  if (firstMenu) {
    if (byRows) {
      firstUnits = firstMenu.items.length;
    } else {
      let lastGi = -1;
      for (let i = 0; i < firstMenu.items.length; i++) {
        const gi = firstMenu.items[i][0];
        if (gi !== lastGi) {
          firstUnits++;
          lastGi = gi;
        }
      }
    }
  }
  return { pages, used, overflow, menuSplit, firstUnits };
}

// Repair each ingredient boundary where it occurs. Cutting only the first
// page can otherwise move several rows off it just to fix a later group's
// one- or two-row tail, even though its own continuation was already legal.
function paginateLegal(m, slack = 0, byRows = false, cut = null) {
  let breaks = null;
  let plan = paginateOne(m, slack, byRows, cut, breaks);
  if (!byRows || !m.menu) return plan;
  const { rows, groupTotals, rowPosInGroup } = m.menu;
  const rowCount = rows.length;
  for (let attempt = 0; attempt < rowCount; attempt++) {
    let placed = 0;
    let repair = null;
    let prevMenu = null;
    for (let p = 0; p < plan.pages.length && repair === null; p++) {
      const pSegs = plan.pages[p];
      for (let j = 0; j < pSegs.length; j++) {
        const seg = pSegs[j];
        if (seg.kind !== 'menu') continue;
        if (prevMenu) {
          const group = rows[placed - 1].id[0];
          if (rows[placed].id[0] === group) {
            const before = rowPosInGroup[placed - 1];
            const after = groupTotals[group] - before;
            if (before < 2 || after < 3) {
              repair = placed - (before < 2 ? before : 3 - after);
              break;
            }
          }
        }
        placed += seg.items.length;
        prevMenu = seg;
      }
    }
    // A group that cannot form a legal piece even on a fresh page has no
    // earlier boundary to try. Leave it for the existing overflow ranking.
    if (repair === null || repair <= 0 || (breaks && breaks.includes(repair))) return plan;
    if (!breaks) breaks = [repair];
    else breaks = [...breaks.filter((at) => at < repair), repair];
    plan = paginateOne(m, slack, byRows, cut, breaks);
  }
  return plan;
}

// Cookbook layout first (header + whole card left, method from the right page),
// then a small search over candidate layouts for the one with the fewest pages
// and no page left with an empty bottom half.
function balanceMetrics(m, pageHeight) {
  let byRows = false;
  let greedy = paginateOne(m, 0, byRows);
  const headerAlone = !greedy.pages[0].some((seg) => seg.kind === 'menu');
  if (greedy.overflow || headerAlone) {
    // A group taller than a page, or a card whose first group cannot sit beside
    // the header: split that card by rows rather than leave the header alone.
    byRows = true;
    greedy = paginateLegal(m, 0, byRows);
  }
  // Search every earlier cut: a large first piece may need more than three
  // rows removed to leave a legal continuation of its final group.
  const cuts = [null];
  if (greedy.menuSplit) for (let cut = greedy.firstUnits - 1; cut >= 1; cut--) cuts.push(cut);
  const SAMPLES = 8;
  const range = pageHeight * 0.6;

  // Continuation rules and a full left page take precedence over balancing
  // later pages. A soft penalty let a 5/4 dough split beat the valid 6/3 split.
  const evalRank = (plan) => {
    const mw = menuWidows(plan, m.menu);
    return [Number(plan.overflow), mw, -plan.firstUnits, score(plan, mw)];
  };

  let best = greedy;
  let bestRank = evalRank(greedy);

  const consider = (plan) => {
    const ar = evalRank(plan);
    for (let i = 0; i < 4; i++) {
      if (ar[i] !== bestRank[i]) {
        if (ar[i] < bestRank[i]) {
          best = plan;
          bestRank = ar;
        }
        return;
      }
    }
  };

  for (let c = 0; c < cuts.length; c++) {
    const cut = cuts[c];
    const base = cut === null ? greedy : paginateLegal(m, 0, byRows, cut);
    if (cut !== null) consider(base);
    const baseMW = menuWidows(base, m.menu);
    // Later-page balancing cannot improve a worse first ingredient piece.
    if (
      base.overflow ||
      baseMW > bestRank[1] ||
      (base.firstUnits < best.firstUnits && baseMW === bestRank[1])
    ) {
      continue;
    }
    const last = base.pages.length - 1;
    if (last <= 1) continue;
    for (let i = 1; i <= SAMPLES; i++) {
      const extra = (range * i) / SAMPLES;
      if (last > 2) {
        consider(paginateLegal(m, (p) => (p >= 2 && p < last ? extra : 0), byRows, cut));
      }
      for (let targetPage = 1; targetPage < last; targetPage++) {
        consider(paginateLegal(m, (p) => (p === targetPage ? extra : 0), byRows, cut));
      }
    }
  }
  return best;
}

// The finished-bake photo is optional: when a recipe ends on a left page, the
// photo takes the facing right page (instead of leaving it blank). Otherwise it
// goes at the end of the last page when at least PHOTO_MIN px fits there (up to
// 42% of the page). It never adds a spread.
const PHOTO_MIN = 110;

function fontSignature() {
  const fonts = typeof document !== 'undefined' ? document.fonts : null;
  if (!fonts) return '0';
  let loaded = 0;
  for (const f of fonts) {
    if (f.status === 'loaded') loaded++;
  }
  return `${fonts.status === 'loaded' ? 1 : 0}:${loaded}`;
}

export function paginate(root) {
  const plans = {};
  const pageHeight = root.clientHeight;
  const rootW = root.clientWidth || 0;
  const fontsBefore = fontSignature();
  const canCache = rootW > 0 && pageHeight > 0;

  const pending = [];
  for (const src of root.querySelectorAll('[data-src]')) {
    const slug = src.dataset.src;
    const sig = src.dataset.sig;
    const cacheKey = canCache && sig ? `${slug}|${rootW}x${pageHeight}|${fontsBefore}|${sig}` : null;
    if (cacheKey) {
      const cached = cacheGet(cacheKey);
      if (cached) {
        plans[slug] = cached;
        continue;
      }
    }
    pending.push({ slug, src, cacheKey });
  }

  if (!pending.length) return plans;

  // Pass 1: batch all uncached recipes into a single DOM layout pass.
  const builtList = pending.map((item) => buildMeasureFace(item.src));
  appendBatch(root, builtList.map((b) => b.face));
  const metricsList = builtList.map((b) => readMeasureFace(b, pageHeight));
  for (const b of builtList) b.face.remove();

  // Pure-JS pagination search (zero DOM access).
  const bestList = metricsList.map((m) => balanceMetrics(m, pageHeight));

  // Pass 2: batch closing-ornament fit checks and inline photo chrome probes
  // across all uncached recipes into one single DOM layout pass.
  const pass2Faces = [];
  const closingChecks = pending.map((item, idx) => {
    const best = bestList[idx];
    const ornamentSrc = item.src.querySelector('.closing-cupcake');
    if (!ornamentSrc) return null;
    const checks = new Map();
    for (let i = 1; i < best.pages.length; i++) {
      const segs = best.pages[i];
      if (!isClosing(segs)) continue;
      const box = buildPageBox(item.src, i, 0);
      box.pad.parentElement.classList.add('page-body--closing');
      box.pad.classList.add('page-pad--closing');
      box.pad.append(ornamentSrc.cloneNode(true));
      for (const seg of segs) {
        if (seg.kind === 'credits' || seg.kind === 'macros') {
          box.pad.append(item.src.querySelector(`[data-unit="${seg.kind}"]`).cloneNode(true));
        } else if (seg.kind === 'tips') {
          const tips = item.src.querySelector('[data-card="tips"]').cloneNode(true);
          for (const tip of tips.querySelectorAll('[data-tip]')) {
            if (!seg.items.includes(Number(tip.dataset.tip))) tip.remove();
          }
          box.pad.append(tips);
        }
      }
      pass2Faces.push(box.face);
      checks.set(i, box);
    }
    return checks.size ? checks : null;
  });

  const photoProbes = pending.map((item, idx) => {
    const figure = item.src.querySelector('[data-unit="photo"]');
    if (!figure) return null;
    const pages = bestList[idx].pages;
    const last = pages.length - 1;
    if (last > 0 && pages.length % 2 === 1) return { facing: true };
    const box = buildPageBox(item.src, 1, 0);
    const probe = figure.cloneNode(true);
    probe.style.setProperty('--photo-h', `${PHOTO_MIN}px`);
    box.pad.append(probe);
    const img = probe.querySelector('img');
    pass2Faces.push(box.face);
    return { facing: false, box, probe, img };
  });

  if (pass2Faces.length) {
    appendBatch(root, pass2Faces);
  }

  // Contiguous read phase for Pass 2.
  const closingFits = closingChecks.map((checks) => {
    if (!checks) return null;
    const fitsMap = new Map();
    for (const [pageIdx, box] of checks) {
      fitsMap.set(pageIdx, box.fits());
    }
    return fitsMap;
  });

  const photoChromes = photoProbes.map((probeInfo) => {
    if (!probeInfo || probeInfo.facing) return null;
    const { probe, img } = probeInfo;
    return (
      probe.getBoundingClientRect().height -
      img.getBoundingClientRect().height +
      parseFloat(getComputedStyle(probe).marginTop)
    );
  });

  // Contiguous cleanup phase for Pass 2.
  for (const face of pass2Faces) face.remove();

  const fontsAfter = fontSignature();
  const canStoreCache =
    fontsAfter === fontsBefore &&
    (typeof document === 'undefined' || !document.fonts || document.fonts.status === 'loaded');
  const photoMax = Math.round(pageHeight * 0.42);
  for (let idx = 0; idx < pending.length; idx++) {
    const { slug, cacheKey } = pending[idx];
    const best = bestList[idx];
    const fitsMap = closingFits[idx];
    let pages = fitsMap
      ? best.pages.map((segs, i) => (fitsMap.get(i) ? [{ kind: 'ornament' }, ...segs] : segs))
      : best.pages;

    const probeInfo = photoProbes[idx];
    if (probeInfo) {
      const last = pages.length - 1;
      if (probeInfo.facing) {
        pages = [...pages, [{ kind: 'photo', h: photoMax }]];
      } else {
        const room = (1 - best.used[last]) * pageHeight - 12 - photoChromes[idx];
        if (room >= PHOTO_MIN) {
          const h = Math.floor(Math.min(photoMax, room));
          pages = [
            ...pages.slice(0, last),
            [...pages[last].filter((seg) => seg.kind !== 'ornament'), { kind: 'photo', h }],
          ];
        }
      }
    }

    plans[slug] = pages;
    if (cacheKey && canStoreCache) cacheSet(cacheKey, pages);
  }

  return plans;
}

// Keep single-recipe reference helper used in documentation and fallback paths.
export { measureRecipe };

// A closing page holds only tips, macros and/or the credits: it is composed on purpose
// (see .page-pad--closing), so it may be short.
export const isClosing = (segs) =>
  segs.length > 0 &&
  segs.every(
    (seg) =>
      seg.kind === 'tips' ||
      seg.kind === 'macros' ||
      seg.kind === 'credits' ||
      seg.kind === 'ornament' ||
      seg.kind === 'photo',
  );

// Widows and orphans in a split ingredient card: at least 3 rows of a split
// group must continue, and at least 2 must stay before the break.
function menuWidows(plan, menuMeta) {
  let prevSeg = null;
  let placed = 0;
  let n = 0;
  const pages = plan.pages;
  for (let p = 0; p < pages.length; p++) {
    const segs = pages[p];
    for (let j = 0; j < segs.length; j++) {
      const seg = segs[j];
      if (seg.kind !== 'menu') continue;
      if (prevSeg) {
        const last = prevSeg.items[prevSeg.items.length - 1];
        const next = seg.items[0];
        if (last && next && last[0] === next[0]) {
          const g = last[0];
          const before = menuMeta.rowPosInGroup[placed - 1];
          const after = menuMeta.groupTotals[g] - before;
          if (after < 3 || before < 2) n++;
        }
      }
      placed += seg.items.length;
      prevSeg = seg;
    }
  }
  return n;
}

function ticketWidows(plan) {
  let pieces = 0;
  let prevLen = 0;
  let lastLen = 0;
  let total = 0;
  const pages = plan.pages;
  for (let p = 0; p < pages.length; p++) {
    const segs = pages[p];
    for (let j = 0; j < segs.length; j++) {
      const seg = segs[j];
      if (seg.kind !== 'ticket') continue;
      pieces++;
      prevLen = lastLen;
      lastLen = seg.items.length;
      total += lastLen;
    }
  }
  return pieces >= 2 && total > 1 && lastLen === 1 && prevLen >= 3 ? 1 : 0;
}

// Lower is better: every extra page costs, and so does every page left under
// about 60% full (`used` includes ~10% of padding and checkers), splitting the
// two-column tips pair, or a later spread starkly unbalanced left-to-right.
function score(plan, precomputedMenuWidows) {
  let tipPieces = 0;
  const pages = plan.pages;
  const pageCount = pages.length;
  for (let p = 0; p < pageCount; p++) {
    const segs = pages[p];
    for (let j = 0; j < segs.length; j++) {
      if (segs[j].kind === 'tips') tipPieces++;
    }
  }
  const w = precomputedMenuWidows + ticketWidows(plan);
  let s = pageCount * 4 + w * 100 + (tipPieces > 1 ? 5 : 0);
  for (let i = 0; i < pageCount; i++) {
    // Credits alone are centred with an ornament when it fits. Do not pull
    // tips off a method page just to decorate an already composed closing.
    if (isClosing(pages[i])) continue;
    const gap = Math.max(0, 0.65 - plan.used[i]);
    s += gap * gap * 10;
    if (i >= 2 && i % 2 === 0 && i + 1 < pageCount && !isClosing(pages[i + 1])) {
      const diff = Math.max(0, Math.abs(plan.used[i] - plan.used[i + 1]) - 0.14);
      s += diff * diff * 2;
    }
  }
  return s;
}
