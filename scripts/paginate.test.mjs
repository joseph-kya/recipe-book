import test from 'node:test';
import assert from 'node:assert/strict';
import { paginate } from '../src/paginate.js';

// A deterministic measuring DOM isolates page-break decisions from fonts/CSS.
// Viewport and typography checks still require a real browser.
class Block {
  constructor(className = '', height = 0, dataset = {}) {
    this.className = className;
    this.height = height;
    this.dataset = dataset;
    this.children = [];
    this.classList = { add: (name) => { this.className += ` ${name}`; } };
  }
  append(...nodes) {
    for (const node of nodes) { node.parentElement = this; this.children.push(node); }
  }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((node) => node !== this);
  }
  cloneNode(deep = false) {
    const clone = new Block(this.className, this.height, { ...this.dataset });
    if (deep) clone.append(...this.children.map((node) => node.cloneNode(true)));
    return clone;
  }
  matches(selector) {
    if (selector.startsWith('.')) return this.className.split(' ').includes(selector.slice(1));
    const [, key, value] = selector.match(/^\[data-([\w-]+)(?:="([^"]+)")?\]$/) || [];
    return key && key in this.dataset && (value === undefined || this.dataset[key] === value);
  }
  querySelectorAll(selector) {
    const direct = selector.startsWith(':scope > ');
    selector = selector.replace(':scope > ', '');
    return this.children.flatMap((node) => [
      ...(node.matches(selector) ? [node] : []),
      ...(direct ? [] : node.querySelectorAll(selector)),
    ]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector); }
  get offsetHeight() {
    const inset = this.className.split(' ').includes('page-pad') ? 40 : this.className.includes('checkers--top') ? 14 : 0;
    return inset + this.height + this.children.reduce((sum, node) => sum + node.offsetHeight, 0);
  }
  get clientHeight() { return this.parentElement?.clientHeight ?? 700; }
}

globalThis.document = { createElement: () => new Block() };

function recipe({ hero = 240, groups = [9], row = 50, stepHeights = [90, 90, 90, 90], tipHeights = [], credits = 100, ornament } = {}) {
  const root = new Block();
  const src = new Block('', 0, { src: 'recipe' });
  const running = new Block('', 25, { unit: 'running' });
  const header = new Block('', hero, { unit: 'hero' });
  const menu = new Block('menu', 0, { card: 'menu' });
  menu.append(new Block('menu-title', 30, { head: 'normal' }), new Block('menu-title', 30, { head: 'cont' }));
  groups.forEach((count, gi) => {
    const group = new Block('ing-group');
    const list = new Block('ing-list');
    for (let ii = 0; ii < count; ii++) list.append(new Block('ing', row, { item: `${gi}:${ii}` }));
    group.append(list);
    menu.append(group);
  });
  const method = new Block('ticket', 0, { card: 'ticket' });
  method.append(new Block('', 30, { head: 'normal' }), new Block('', 30, { head: 'cont' }));
  const steps = new Block('steps');
  stepHeights.forEach((height, i) => steps.append(new Block('step', height, { step: String(i) })));
  method.append(steps);
  const tips = new Block('tips', 0, { card: 'tips' });
  tipHeights.forEach((height, i) => tips.append(new Block('tip', height, { tip: String(i) })));
  src.append(running, header, menu, method, tips, new Block('credits', credits, { unit: 'credits' }));
  if (ornament) src.append(new Block('closing-cupcake', ornament));
  root.append(src);
  return paginate(root).recipe;
}

const ingredients = (plan) => plan.flatMap((page) => page.filter((seg) => seg.kind === 'menu'));

test('a nine-row group leaves three continuing rows and fills the left page with six', () => {
  const parts = ingredients(recipe());
  assert.deepEqual(parts.map((part) => part.items.length), [6, 3]);
  assert.deepEqual(parts.flatMap((part) => part.items), Array.from({ length: 9 }, (_, i) => [0, i]));
});

test('a later group boundary cannot steal a fitting sixth row from the first page', () => {
  // Six rows fit below the hero. Greedy placement then puts just one row of
  // the final group on page two; moving that group fixes it locally. The old
  // first-page-only search instead chose five rows to avoid that later split.
  const parts = ingredients(recipe({ hero: 210, groups: [9, 6, 4], row: 59 }));
  assert.deepEqual(parts.map((part) => part.items.length), [6, 9, 4]);
  assert.deepEqual(parts[1].items, [
    ...Array.from({ length: 3 }, (_, i) => [0, i + 6]),
    ...Array.from({ length: 6 }, (_, i) => [1, i]),
  ]);
});

test('fitting tips stay beneath the last steps instead of filling a credits closing page', () => {
  const plan = recipe({ hero: 100, groups: [3], stepHeights: [180, 180, 180, 150, 150],
    tipHeights: [100, 100], credits: 300, ornament: 72 });
  assert.equal(plan.length, 4);
  assert.deepEqual(plan[2].map((seg) => [seg.kind, seg.items]), [
    ['ticket', [3, 4]], ['tips', [0, 1]],
  ]);
  assert.deepEqual(plan[3].map((seg) => seg.kind), ['ornament', 'credits']);
});

test('a card that fits stays whole on the left', () => {
  const plan = recipe({ hero: 100 });
  assert.equal(ingredients(plan).length, 1);
  assert.equal(plan[0].find((seg) => seg.kind === 'menu').items.length, 9);
  assert.equal(plan[1][0].kind, 'ticket');
});

test('whole short ingredient groups can continue without being treated as widows', () => {
  const parts = ingredients(recipe({ groups: [6, 2] }));
  assert.deepEqual(parts.map((part) => part.items.length), [6, 2]);
  assert.deepEqual(parts[1].items, [[1, 0], [1, 1]]);
});

test('all ingredients and method steps survive pagination at different capacities', () => {
  for (const row of [30, 40, 50, 65]) {
    const plan = recipe({ groups: [9, 6, 4], row });
    assert.deepEqual(ingredients(plan).flatMap((part) => part.items),
      [9, 6, 4].flatMap((count, gi) => Array.from({ length: count }, (_, ii) => [gi, ii])));
    assert.deepEqual(plan.flatMap((page) => page.filter((seg) => seg.kind === 'ticket').flatMap((seg) => seg.items)), [0, 1, 2, 3]);
    assert.equal(plan.flat().filter((seg) => seg.kind === 'credits').length, 1);
  }
});

test('a closing ornament is included only when its measured height fits', () => {
  const options = { hero: 100, groups: [3], stepHeights: [500], credits: 300 };
  assert.equal(recipe({ ...options, ornament: 72 }).at(-1)[0].kind, 'ornament');
  assert.equal(recipe({ ...options, ornament: 600 }).at(-1)[0].kind, 'credits');
});
