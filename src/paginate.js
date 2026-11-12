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

function paginateOne(root, src, slack = 0) {
  const pages = [];
  const used = []; // how full each page ends up, for balancing
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
  const placeCard = (card, kind, units, appendUnit) => {
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
      if (!box.fits()) {
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
      }
      seg.items.push(u.id);
      placed++;
    }
  };

  // Ingredients: rows live in per-group lists; a group title travels with its first row.
  const menu = src.querySelector('[data-card="menu"]');
  const menuUnits = menu
    ? [...menu.querySelectorAll('[data-item]')].map((li) => {
        const [gi, ii] = li.dataset.item.split(':').map(Number);
        return { id: [gi, ii], li, group: li.closest('.ing-group') };
      })
    : [];
  placeAtom(src.querySelector('[data-unit="hero"]'), { kind: 'hero' });
  placeCard(menu, 'menu', menuUnits, (shell, ctx, u) => {
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
  });

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
  return { pages, used };
}

export function paginate(root) {
  const plans = {};
  const pageHeight = root.clientHeight;
  for (const src of root.querySelectorAll('[data-src]')) {
    plans[src.dataset.src] = balance(root, src, pageHeight);
  }
  return plans;
}

// Greedy filling packs early pages full and leaves the last one a near-empty
// tail. Like balancing newspaper columns: keep the fewest pages greedy found,
// find how far every page's capacity can drop without adding a page, then
// among capacities in that range keep the plan whose emptiest page is fullest.
function balance(root, src, pageHeight) {
  const greedy = paginateOne(root, src, 0);
  const count = greedy.pages.length;
  if (count < 2) return greedy.pages;
  // Page count is not strictly monotonic in capacity (atomic blocks), so sample
  // the whole range rather than trusting one bound.
  let best = greedy;
  let bestSlack = 0;
  const score = (plan) => Math.min(...plan.used);
  const SAMPLES = 24;
  const range = pageHeight * 0.6;
  for (let i = 1; i <= SAMPLES; i++) {
    const slack = (range * i) / SAMPLES;
    const plan = paginateOne(root, src, slack);
    if (plan.pages.length === count && score(plan) > score(best)) {
      best = plan;
      bestSlack = slack;
    }
  }
  // A short tail (say, the credits alone) can only be fed from the page before
  // it: lower just that page's capacity so its last block moves forward.
  const last = count - 1;
  if (best.used[last] === score(best)) {
    for (let i = 1; i <= SAMPLES; i++) {
      const extra = (range * i) / SAMPLES;
      const plan = paginateOne(root, src, (p) => (p === last - 1 ? bestSlack + extra : bestSlack));
      if (plan.pages.length === count && score(plan) > score(best)) best = plan;
    }
  }
  return best.pages;
}
