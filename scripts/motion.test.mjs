import test from 'node:test';
import assert from 'node:assert/strict';
import { animateSpring, makeSpring, rubberband, unRubberband, rubberbandVelocity } from '../src/spring.js';
import { enterPage, flipLabel, spinCupcake, swapContent } from '../src/motion.js';

function mockGlobal(t, name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  });
}

test('catching a rebound keeps its screen position at both book edges', () => {
  for (const width of [320, 360, 390, 577]) {
    for (const offset of [-100, -24, -1, 0, 1, 24, 100]) {
      assert.ok(Math.abs(rubberband(unRubberband(offset, width), width) - offset) < 1e-8);
    }
  }
});

test('edge velocity matches the visible motion and weakens further into resistance', () => {
  for (const distance of [-240, -40, 0, 40, 240]) {
    const velocity = -600;
    const dt = 0.00001;
    const measured = (rubberband(distance + velocity * dt, 390) - rubberband(distance, 390)) / dt;
    assert.ok(Math.abs(rubberbandVelocity(distance, velocity, 390) - measured) < 0.01);
  }
  assert.ok(rubberbandVelocity(200, 600, 390) < rubberbandVelocity(20, 600, 390));
});

test('edge spring carries an outward flick before settling, and can stop mid-flight', (t) => {
  let clock = 0;
  let frame;
  let cancelled = false;
  t.mock.method(performance, 'now', () => clock);
  mockGlobal(t, 'requestAnimationFrame', (cb) => { frame = cb; return 1; });
  mockGlobal(t, 'cancelAnimationFrame', () => { cancelled = true; });
  const values = [];
  let done = false;
  const spring = animateSpring({ from: 20, to: 0, velocity: 800,
    spring: makeSpring({ response: 0.3, damping: 1 }),
    restDelta: 0.15, restSpeed: 2,
    onUpdate: (x) => values.push(x), onDone: () => { done = true; } });
  clock += 8;
  frame(clock);
  assert.ok(values[0] > 20, 'release must retain outward momentum');
  const caught = spring.stop();
  assert.equal(caught.value, values.at(-1));
  assert.ok(caught.velocity > 0);
  assert.equal(cancelled, true);
  assert.equal(done, false);
  const returning = animateSpring({ from: caught.value, to: 0, velocity: caught.velocity,
    spring: makeSpring({ response: 0.3, damping: 1 }),
    restDelta: 0.15, restSpeed: 2,
    onUpdate: (x) => values.push(x), onDone: () => { done = true; } });
  for (let i = 0; i < 120 && !done; i++) { clock += 8; frame(clock); }
  assert.equal(done, true);
  assert.equal(returning.value, 0);
});

// Minimal WAAPI surface; no browser, layout simulation or server required.
function entranceRoot(count = 5) {
  const calls = [];
  const listeners = new Map();
  const element = () => ({ animate: (frames, options) => {
    const animation = { frames, options, finished: new Promise(() => {}),
      cancelled: false, cancel() { this.cancelled = true; } };
    calls.push(animation);
    return animation;
  } });
  const root = { querySelector: element, querySelectorAll: () => Array.from({ length: count }, element),
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name) };
  return { root, calls, listeners };
}

function motionEnvironment(t, reduce = false) {
  mockGlobal(t, 'matchMedia', () => ({ matches: reduce }));
  mockGlobal(t, 'getComputedStyle', () => ({ getPropertyValue: () => 'cubic-bezier(0.23, 1, 0.32, 1)' }));
}

test('cover entrance stays under 300ms, leaves the tilted ornament transform intact and yields to input', (t) => {
  motionEnvironment(t);
  const { root, calls, listeners } = entranceRoot();
  enterPage(root, 'cover');
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map(({ options }) => options.delay), [0, 65, 115]);
  assert.ok(calls.every(({ options }) => options.delay + options.duration <= 300));
  assert.equal('transform' in calls[1].frames[0], false);
  listeners.get('pointerdown')();
  assert.ok(calls.every((animation) => animation.cancelled));
  assert.equal(listeners.size, 0);
});

test('contents stagger is bounded even when recipes are added and yields to keyboard focus', (t) => {
  motionEnvironment(t);
  const { root, calls, listeners } = entranceRoot(20);
  enterPage(root, 'contents');
  assert.ok(calls.every(({ options }) => options.delay + options.duration <= 300));
  assert.ok(calls.every(({ frames }) => frames.every((frame) => Object.keys(frame).every((key) => ['transform', 'opacity'].includes(key)))));
  listeners.get('focusin')();
  assert.ok(calls.every((animation) => animation.cancelled));
});

test('reduced motion leaves all entrance content at its static visible state', (t) => {
  motionEnvironment(t, true);
  const { root, calls, listeners } = entranceRoot();
  enterPage(root, 'cover');
  enterPage(root, 'contents');
  assert.equal(calls.length, 0);
  assert.equal(listeners.size, 0);
});

test('cupcake spin uses transform only, overshoots, settles in 500-700ms and chains rapid taps', (t) => {
  let clock = 0;
  let frame = null;
  let cancelled = false;
  t.mock.method(performance, 'now', () => clock);
  mockGlobal(t, 'requestAnimationFrame', (cb) => { frame = cb; return 1; });
  mockGlobal(t, 'cancelAnimationFrame', () => { cancelled = true; });
  motionEnvironment(t, false);

  const el = { style: { transform: '' } };
  const ref = { current: null };
  spinCupcake(el, ref);
  assert.ok(ref.current, 'spin starts');
  assert.match(el.style.transform, /^rotate\(/);

  let maxDeg = 0;
  let settledAt = 0;
  for (let i = 0; i < 120 && ref.current; i++) {
    clock += 8;
    frame(clock);
    const m = el.style.transform.match(/rotate\(([-0-9.]+)deg\)/);
    if (m) maxDeg = Math.max(maxDeg, Number(m[1]));
    if (!ref.current) settledAt = clock;
  }
  assert.equal(ref.current, null);
  assert.equal(el.style.transform, '');
  assert.ok(maxDeg > 365, `expected spring overshoot past 360deg, got ${maxDeg}`);
  assert.ok(settledAt >= 500 && settledAt <= 700, `expected settle in 500-700ms, got ${settledAt}ms`);

  // Rapid double-tap preserves live angle and targets +720deg without snapping back to 0.
  spinCupcake(el, ref);
  clock += 80;
  frame(clock);
  const midDeg = Number(el.style.transform.match(/rotate\(([-0-9.]+)deg\)/)[1]);
  spinCupcake(el, ref);
  assert.equal(cancelled, true);
  assert.equal(ref.current.target, 720);
  assert.ok(Math.abs(ref.current.rx - midDeg) < 0.01);
});

test('cupcake spin switches instantly under reduced motion', (t) => {
  motionEnvironment(t, true);
  let requested = false;
  mockGlobal(t, 'requestAnimationFrame', () => { requested = true; return 1; });
  const el = { style: { transform: 'rotate(12deg)' } };
  const ref = { current: null };
  assert.equal(spinCupcake(el, ref), null);
  assert.equal(requested, false);
  assert.equal(el.style.transform, '');
});

test('flipLabel rolls and squashes with transform/opacity only, cleans up outgoing text, cancels on rapid tap, and stays static under reduced motion', async (t) => {
  motionEnvironment(t, false);
  const makeTarget = (role) => ({
    role,
    hidden: true,
    textContent: '',
    calls: [],
    animate(frames, options) {
      let resolve;
      const finished = new Promise((r) => { resolve = r; });
      const anim = {
        role,
        frames,
        options,
        finished,
        cancelled: false,
        finish() { resolve(); },
        cancel() {
          this.cancelled = true;
          resolve();
        },
      };
      this.calls.push(anim);
      return anim;
    },
  });

  const incoming = makeTarget('incoming');
  const outgoing = makeTarget('outgoing');
  const button = makeTarget('button');
  const ref = { current: null };

  const first = flipLabel(incoming, { button, outgoing, outgoingText: 'EN', animRef: ref });
  assert.ok(first);
  assert.equal(ref.current, first);
  assert.equal(outgoing.hidden, false);
  assert.equal(outgoing.textContent, 'EN');
  assert.equal(incoming.calls.length, 1);
  assert.equal(outgoing.calls.length, 1);
  assert.equal(button.calls.length, 1);

  assert.ok(first.duration >= 250 && first.duration <= 400, `expected 250-400ms, got ${first.duration}`);
  for (const anim of first.animations) {
    assert.ok(anim.options.duration >= 100 && anim.options.duration <= 400);
    assert.ok(anim.frames.every((f) => Object.keys(f).every((k) => ['transform', 'opacity', 'offset', 'easing'].includes(k))));
  }
  const inAnim = incoming.calls[0];
  const outAnim = outgoing.calls[0];
  const btnAnim = button.calls[0];
  assert.ok(inAnim.frames.some((f) => /translateY/.test(f.transform) && /rotateX/.test(f.transform) && /scale\(/.test(f.transform)));
  assert.ok(outAnim.frames.some((f) => /translateY\(-/.test(f.transform) && /rotateX/.test(f.transform)));
  assert.ok(btnAnim.frames.some((f) => /scale\(1\.06, 0\.9\)/.test(f.transform)));

  // Rapid tap cancels all first animations and replaces outgoing text without letting first cleanup hide it.
  const second = flipLabel(incoming, { button, outgoing, outgoingText: 'DE', animRef: ref });
  assert.ok(first.animations.every((a) => a.cancelled));
  assert.equal(ref.current, second);
  assert.equal(outgoing.hidden, false);
  assert.equal(outgoing.textContent, 'DE');

  // Wait a microtask to ensure cancelled first animation's finally did not hide the active outgoing text.
  await Promise.resolve();
  assert.equal(outgoing.hidden, false);
  assert.equal(outgoing.textContent, 'DE');

  // Finishing the active outgoing animation hides and clears it.
  outgoing.calls[1].finish();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(outgoing.hidden, true);
  assert.equal(outgoing.textContent, '');

  // Finishing remaining animations clears animRef.
  second.animations.forEach((a) => a.finish());
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(ref.current, null);

  // Reduced motion: cancels any active animation, keeps outgoing hidden, and skips WAAPI.
  const third = flipLabel(incoming, { button, outgoing, outgoingText: 'EN', animRef: ref });
  motionEnvironment(t, true);
  assert.equal(flipLabel(incoming, { button, outgoing, outgoingText: 'DE', animRef: ref }), null);
  assert.ok(third.animations.every((a) => a.cancelled));
  assert.equal(outgoing.hidden, true);
  assert.equal(outgoing.textContent, '');
  assert.equal(incoming.calls.length, 3);
});

test('swapContent animates visible units and language blocks with transform/opacity in 200-350ms, cancels rapid taps, and respects reduced motion', async (t) => {
  motionEnvironment(t, false);
  const makeNode = ({ top = 100, bottom = 140, height = 40, children = {} } = {}) => {
    const calls = [];
    return {
      calls,
      getBoundingClientRect: () => ({ top, bottom, height }),
      querySelector: (sel) => children[sel] || null,
      animate(frames, options) {
        let resolve;
        const finished = new Promise((r) => { resolve = r; });
        const anim = {
          frames,
          options,
          finished,
          cancelled: false,
          finish() { resolve(); },
          cancel() { this.cancelled = true; resolve(); },
        };
        calls.push(anim);
        return anim;
      },
    };
  };

  const makeUnitItem = (top) => {
    const amt = makeNode({ top, bottom: top + 20, height: 20 });
    const met = makeNode({ top: top + 20, bottom: top + 34, height: 14 });
    return makeNode({
      top,
      bottom: top + 34,
      height: 34,
      children: { '.ing-amount': amt, '.ing-metric': met },
    });
  };

  const visibleItems = Array.from({ length: 12 }, (_, i) => makeUnitItem(80 + i * 40));
  const offscreenItem = makeUnitItem(1400);
  const rollNodes = Array.from({ length: 10 }, (_, i) => makeNode({ top: 100 + i * 30, bottom: 124 + i * 30, height: 24 }));
  const fadeNodes = [makeNode({ top: 150, bottom: 174, height: 24 })];
  const face = {
    querySelector: (sel) => (sel === '.face-scroll'
      ? { getBoundingClientRect: () => ({ top: 0, bottom: 800, height: 800 }) }
      : null),
    querySelectorAll: (sel) => {
      if (sel === '[data-swappable="true"]') return [...visibleItems, offscreenItem];
      if (sel.includes('.tagline')) return [...rollNodes, ...fadeNodes];
      if (sel === '.tagline, .scaler-chip--custom, .credits .btn') return fadeNodes;
      return rollNodes;
    },
  };

  const ref = { current: null };
  const unitsCtrl = swapContent([face], 'units', ref);
  assert.ok(unitsCtrl);
  assert.equal(ref.current, unitsCtrl);
  assert.equal(offscreenItem.querySelector('.ing-amount').calls.length, 0);
  assert.ok(unitsCtrl.duration >= 200 && unitsCtrl.duration <= 350, `expected 200-350ms, got ${unitsCtrl.duration}`);
  for (const anim of unitsCtrl.animations) {
    assert.ok(anim.options.delay + anim.options.duration <= 350);
    assert.ok(anim.frames.every((f) => Object.keys(f).every((k) => ['transform', 'opacity'].includes(k))));
  }

  // Rapid tap cancels the previous swap before launching the next.
  const langCtrl = swapContent([face], 'lang', ref);
  assert.ok(unitsCtrl.animations.every((a) => a.cancelled));
  assert.ok(langCtrl);
  assert.ok(langCtrl.duration >= 200 && langCtrl.duration <= 350, `expected 200-350ms, got ${langCtrl.duration}`);
  for (const anim of langCtrl.animations) {
    assert.ok(anim.options.delay + anim.options.duration <= 350);
    assert.ok(anim.frames.every((f) => Object.keys(f).every((k) => ['transform', 'opacity'].includes(k))));
  }

  langCtrl.animations.forEach((a) => a.finish());
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(ref.current, null);

  // Reduced motion cancels active swaps and produces no WAAPI animations.
  const active = swapContent([face], 'units', ref);
  motionEnvironment(t, true);
  assert.equal(swapContent([face], 'lang', ref), null);
  assert.ok(active.animations.every((a) => a.cancelled));
  assert.equal(ref.current, null);
});
