import test from 'node:test';
import assert from 'node:assert/strict';
import { animateSpring, makeSpring, rubberband, unRubberband, rubberbandVelocity } from '../src/spring.js';
import { enterPage, spinCupcake } from '../src/motion.js';

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
