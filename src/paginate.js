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

function newPageBox(root, src, pageIndex) {
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
    fits: () => body.offsetHeight <= face.clientHeight + 0.5,
  };
}

function paginateOne(root, src) {
  const pages = [];
  let segs = [];
  let box = newPageBox(root, src, 0);

  const nextPage = () => {
    pages.push(segs);
    box.face.remove();
    segs = [];
    box = newPageBox(root, src, pages.length);
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

  placeAtom(src.querySelector('[data-unit="tips"]'), { kind: 'tips' });
  placeAtom(src.querySelector('[data-unit="credits"]'), { kind: 'credits' });

  pages.push(segs);
  box.face.remove();
  return pages;
}

export function paginate(root) {
  const plans = {};
  for (const src of root.querySelectorAll('[data-src]')) {
    plans[src.dataset.src] = paginateOne(root, src);
  }
  return plans;
}
