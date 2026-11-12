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

// `cut`: when the card is split anyway, end its first piece after this many
// units (rows or groups) so the right page has room for the method too.
function paginateOne(root, src, slack = 0, byRows = false, cut = null) {
  const pages = [];
  const used = []; // how full each page ends up, for balancing
  let overflow = false; // a block had to go in taller than its page
  let segs = [];
  let box = newPageBox(root, src, 0, slack);

  const nextPage = () => {
    pages.push(segs);
    used.push(box.used());
    box.face.remove();
    segs = [];
    box = newPageBox(root, src, pages.length, slack);
  };

  // A block that moves as one piece.
  const placeAtom = (node, seg) => {
    if (!node) return;
    let c = node.cloneNode(true);
    box.pad.append(c);
    if (!box.fits() && segs.length) {
      c.remove();
      nextPage();
      c = node.cloneNode(true);
      box.pad.append(c);
    }
    segs.push(seg);
  };

  // A card (ingredients or method) whose rows may run across pages.
  const placeCard = (card, kind, units, appendUnit, limit = null) => {
    if (!card || !units.length) return;
    const normalHead = [...card.querySelectorAll(':scope > [data-head="normal"]')];
    const contHead = [...card.querySelectorAll(':scope > [data-head="cont"]')];
    let shell = null;
    let seg = null;
    let ctx = null;
    let placed = 0;

    const open = () => {
      shell = card.cloneNode(false);
      for (const h of placed ? contHead : normalHead) shell.append(h.cloneNode(true));
      box.pad.append(shell);
      seg = { kind, cont: placed > 0, items: [] };
      segs.push(seg);
      ctx = {};
    };

    for (const u of units) {
      if (!shell) open();
      let added = appendUnit(shell, ctx, u);
      const forced = limit !== null && pages.length === 0 && placed >= limit;
      if (forced || !box.fits()) {
        for (const n of added) n.remove();
        const pageHadOtherBlocks = segs.length > 1 || seg.items.length > 0;
        if (pageHadOtherBlocks) {
          if (!seg.items.length) {
            // The head would be left alone at the bottom: take it along.
            shell.remove();
            segs.pop();
          }
          nextPage();
          open();
        }
        // On a fresh page it goes in even if it is taller than a page.
        added = appendUnit(shell, ctx, u);
        if (!box.fits() && kind === 'menu') overflow = true;
      }
      if (u.ids) seg.items.push(...u.ids);
      else seg.items.push(u.id);
      placed++;
    }
  };

  // Ingredients. Cookbook rule: the whole card sits on the left page under the
  // header; a card too long for that splits only between its groups (dough /
  // filling / icing), the rest continuing at the top of the right page. Rows are
  // the unit only as a last resort, when a group itself cannot fit (`byRows`).
  const menu = src.querySelector('[data-card="menu"]');
  const menuRows = menu
    ? [...menu.querySelectorAll('[data-item]')].map((li) => {
        const [gi, ii] = li.dataset.item.split(':').map(Number);
        return { id: [gi, ii], li, group: li.closest('.ing-group') };
      })
    : [];
  const menuGroups = menu
    ? [...menu.querySelectorAll('.ing-group')].map((group) => ({
        group,
        ids: [...group.querySelectorAll('[data-item]')].map((li) => li.dataset.item.split(':').map(Number)),
      }))
    : [];
  placeAtom(src.querySelector('[data-unit="hero"]'), { kind: 'hero' });
  if (!byRows) {
    placeCard(
      menu,
      'menu',
      menuGroups,
      (shell, ctx, u) => {
        const g = u.group.cloneNode(true);
        shell.append(g);
        return [g];
      },
      cut,
    );
  } else placeCard(menu, 'menu', menuRows, (shell, ctx, u) => {
    const li = u.li.cloneNode(true);
    if (ctx.gi === u.id[0]) {
      ctx.list.append(li);
      return [li];
    }
    const g = u.group.cloneNode(false);
    const title = u.group.querySelector('.ing-group-title');
    if (title && u.id[1] === 0) g.append(title.cloneNode(true));
    ctx.list = u.group.querySelector('.ing-list').cloneNode(false);
    ctx.list.append(li);
    g.append(ctx.list);
    shell.append(g);
    ctx.gi = u.id[0];
    // Rolling back the first row of a group takes the group (and its title) with it.
    return [{ remove: () => (g.remove(), (ctx.gi = undefined)) }];
  }, cut);

  // The method opens the right page when the whole card fit on the left one.
  // (After a continuation it follows on the same page if its head and first
  // step fit, else it starts the next spread: placeCard's keep-with-next.)
  if (pages.length === 0) nextPage();

  // Method: one list of numbered steps.
  const ticket = src.querySelector('[data-card="ticket"]');
  const stepUnits = ticket
    ? [...ticket.querySelectorAll('[data-step]')].map((li) => ({ id: Number(li.dataset.step), li }))
    : [];
  const steps = ticket?.querySelector('.steps');
  placeCard(ticket, 'ticket', stepUnits, (shell, ctx, u) => {
    if (!ctx.list) {
      ctx.list = steps.cloneNode(false);
      shell.append(ctx.list);
    }
    const li = u.li.cloneNode(true);
    ctx.list.append(li);
    return [li];
  });

  // Tips: each card moves whole, but two cards may sit on different pages.
  const tips = src.querySelector('[data-card="tips"]');
  const tipUnits = tips ? [...tips.querySelectorAll('[data-tip]')].map((el) => ({ id: Number(el.dataset.tip), li: el })) : [];
  placeCard(tips, 'tips', tipUnits, (shell, ctx, u) => {
    const card = u.li.cloneNode(true);
    shell.append(card);
    return [card];
  });
  placeAtom(src.querySelector('[data-unit="credits"]'), { kind: 'credits' });

  pages.push(segs);
  used.push(box.used());
  box.face.remove();
  const firstMenu = pages[0].find((seg) => seg.kind === 'menu');
  const menuSplit = !!firstMenu && pages.slice(1).some((p) => p.some((seg) => seg.kind === 'menu'));
  // how many card units (groups, or rows) stayed on the first page
  const firstUnits = !firstMenu
    ? 0
    : byRows
      ? firstMenu.items.length
      : menuGroups.filter((g) => firstMenu.items.some((id) => id[0] === g.ids[0][0])).length;
  return { pages, used, overflow, menuSplit, firstUnits };
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
  let byRows = false;
  let greedy = paginateOne(root, src, 0, byRows);
  const headerAlone = !greedy.pages[0].some((seg) => seg.kind === 'menu');
  if (greedy.overflow || headerAlone) {
    // A group taller than a page, or a card whose first group cannot sit beside
    // the header: split that card by rows rather than leave the header alone.
    byRows = true;
    greedy = paginateOne(root, src, 0, byRows);
  }
  // Candidates, all within the hard rules (whole card left when it fits, groups
  // whole, nothing split): the card cut a unit or three earlier when it is split
  // anyway, so the continuation and the method can share the right page; and
  // lower capacity on later pages, so steps, tips, PDF and credit spread across
  // the last spread instead of stacking at the top of each page.
  const cuts = [null];
  if (greedy.menuSplit) for (const d of [1, 2, 3]) if (greedy.firstUnits - d >= 1) cuts.push(greedy.firstUnits - d);
  const SAMPLES = 8;
  const range = pageHeight * 0.6;
  let best = greedy;
  let bestScore = score(greedy);
  const consider = (plan) => {
    if (plan.overflow) return;
    const sc = score(plan);
    if (sc < bestScore) {
      best = plan;
      bestScore = sc;
    }
  };
  for (const cut of cuts) {
    const base = cut === null ? greedy : paginateOne(root, src, 0, byRows, cut);
    consider(base);
    const last = base.pages.length - 1;
    for (let i = 1; i <= SAMPLES; i++) {
      const extra = (range * i) / SAMPLES;
      consider(paginateOne(root, src, (p) => (p >= 2 && p < last ? extra : 0), byRows, cut));
      consider(paginateOne(root, src, (p) => (p === last - 1 ? extra : 0), byRows, cut));
    }
  }
  return best.pages;
}

// A closing page holds only tips and/or the credits: it is composed on purpose
// (see .page-pad--closing), so it may be short.
export const isClosing = (segs) => segs.length > 0 && segs.every((seg) => seg.kind === 'tips' || seg.kind === 'credits');

// Lower is better: every extra page costs, and so does every page left under
// about 60% full (`used` includes ~10% of padding and checkers).
function score(plan) {
  let s = plan.pages.length * 4;
  plan.pages.forEach((segs, i) => {
    if (isClosing(segs)) return;
    const gap = Math.max(0, 0.62 - plan.used[i]);
    s += gap * gap * 10;
  });
  return s;
}
