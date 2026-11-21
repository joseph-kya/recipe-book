import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { addSafariCssFallbacks, shouldPrecache } from '../vite.config.js';

test('public/sw.js is Safari 12+ ES2017 compatible (no optional chaining, nullish coalescing, or TLA)', () => {
  const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.doesNotMatch(sw, /\?\.(?!\d)/, 'sw.js should not use optional chaining');
  assert.doesNotMatch(sw, /\?\?/, 'sw.js should not use nullish coalescing');
  assert.doesNotThrow(() => {
    transformSync(sw, { loader: 'js', target: 'es2017' });
  });
});

test('index.html Safari 12-15 runtime shims polyfill missing APIs cleanly', async () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length >= 2, 'expected pre-paint theme script followed by Safari compat shim script');
  const shimScript = scripts[1];

  // Must parse as plain ES5/ES2017.
  assert.doesNotThrow(() => transformSync(shimScript, { loader: 'js', target: 'es2017' }));

  const FakeArray = function () {};
  // Safari already has slice/map; omit only the newer API being tested.
  FakeArray.prototype = { slice: Array.prototype.slice };
  const FakeString = function () {};
  FakeString.prototype = {};
  const FakeObject = {
    prototype: { hasOwnProperty: Object.prototype.hasOwnProperty },
  };
  const listeners = [];
  const FakeMQL = function () {};
  FakeMQL.prototype = {
    addListener(fn) {
      listeners.push(fn);
    },
    removeListener(fn) {
      const i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    },
  };
  const FakeElement = function () {};
  FakeElement.prototype = {};
  const FakePromise = function (fn) {
    return new Promise(fn);
  };
  FakePromise.resolve = (v) => Promise.resolve(v);
  FakePromise.all = (ps) => Promise.all(ps);

  const resizeHandlers = [];
  const fakeWindow = {
    addEventListener(type, fn) {
      if (type === 'resize') resizeHandlers.push(fn);
    },
    removeEventListener(type, fn) {
      const i = resizeHandlers.indexOf(fn);
      if (i !== -1) resizeHandlers.splice(i, 1);
    },
  };
  const fakeDocument = {
    addEventListener() {},
    documentElement: { classList: { add() {} } },
  };

  new Function(
    'window',
    'document',
    'navigator',
    'Array',
    'String',
    'Object',
    'Promise',
    'MediaQueryList',
    'Element',
    shimScript,
  )(
    fakeWindow,
    fakeDocument,
    { userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X)' },
    FakeArray,
    FakeString,
    FakeObject,
    FakePromise,
    FakeMQL,
    FakeElement,
  );

  // Array.prototype.at & String.prototype.at
  assert.equal(FakeArray.prototype.at.call([10, 20, 30], -1), 30);
  assert.equal(FakeArray.prototype.at.call([10, 20, 30], -4), undefined);
  assert.equal(FakeString.prototype.at.call('abc', -1), 'c');

  // Object.hasOwn
  assert.equal(FakeObject.hasOwn({ a: 1 }, 'a'), true);
  assert.equal(FakeObject.hasOwn({ a: 1 }, 'toString'), false);

  // Promise.allSettled
  const settled = await FakePromise.allSettled([Promise.resolve('ok'), Promise.reject('err')]);
  assert.deepEqual(settled, [
    { status: 'fulfilled', value: 'ok' },
    { status: 'rejected', reason: 'err' },
  ]);

  // MediaQueryList addEventListener / removeEventListener
  const mql = new FakeMQL();
  const cb = () => {};
  mql.addEventListener('change', cb);
  assert.equal(listeners.length, 1);
  mql.removeEventListener('change', cb);
  assert.equal(listeners.length, 0);

  // ResizeObserver fallback
  let roCalls = 0;
  const ro = new fakeWindow.ResizeObserver(() => {
    roCalls++;
  });
  ro.observe({});
  assert.equal(roCalls, 1);
  assert.equal(resizeHandlers.length, 1);
  ro.disconnect();
  assert.equal(resizeHandlers.length, 0);

  // Element.prototype.animate fallback
  const anim = FakeElement.prototype.animate();
  await anim.finished;
  assert.equal(anim.playState, 'finished');
});

test('addSafariCssFallbacks emits valid CSS fallbacks with zero syntax warnings', () => {
  const sample =
    '.a{--ph:min(calc(100dvh - 7.5rem),60rem);height:100dvh;inset-inline:-1.5rem;inset-block:0;padding-inline:1rem;margin-block:2px 4px;user-select:none}' +
    '.b{background:color-mix(in srgb,var(--shadow) 12%,var(--btn-primary,var(--cherry)))}' +
    '.c{background:linear-gradient(to right,color-mix(in srgb,var(--shadow) 65%,transparent),color-mix(in srgb,var(--shadow) 12%,transparent) 70%)}';
  const out = addSafariCssFallbacks(sample);
  const parsed = transformSync(out, { loader: 'css' });
  assert.equal(parsed.warnings.length, 0, `unexpected CSS warnings: ${JSON.stringify(parsed.warnings)}`);
  assert.match(out, /--ph:min\(calc\(100vh - 7\.5rem\),60rem\);--ph:min\(calc\(100dvh - 7\.5rem\),60rem\)/);
  assert.match(out, /height:100vh;height:100dvh/);
  assert.match(out, /left:-1\.5rem;right:-1\.5rem;inset-inline:-1\.5rem/);
  assert.match(out, /top:0;bottom:0;inset-block:0/);
  assert.match(out, /padding-left:1rem;padding-right:1rem;padding-inline:1rem/);
  assert.match(out, /margin-top:2px;margin-bottom:4px;margin-block:2px 4px/);
  assert.match(out, /-webkit-user-select:none;user-select:none/);
  assert.match(out, /background:var\(--btn-primary,var\(--cherry\)\);background:color-mix\(/);
  assert.match(out, /rgba\(0,0,0,\.45\),rgba\(0,0,0,\.08\) 70%\)/);
  assert.match(out, /html\.no-flex-gap/);
});

test('shouldPrecache keeps core shell/chunks/fonts and defers photos, PDFs, and secondary icons', () => {
  assert.equal(shouldPrecache('index.html'), true);
  assert.equal(shouldPrecache('manifest.webmanifest'), true);
  assert.equal(shouldPrecache('favicon.svg'), true);
  assert.equal(shouldPrecache('assets/index-abc.js'), true);
  assert.equal(shouldPrecache('assets/react-abc.js'), true);
  assert.equal(shouldPrecache('assets/en-abc.js'), true);
  assert.equal(shouldPrecache('assets/de-abc.js'), true);
  assert.equal(shouldPrecache('assets/fr-abc.js'), true);
  assert.equal(shouldPrecache('assets/index-abc.css'), true);
  assert.equal(shouldPrecache('assets/Nunito-VariableFont_wght-abc.woff2'), true);

  assert.equal(shouldPrecache('sw.js'), false);
  assert.equal(shouldPrecache('photos/fudge-brownies-400.webp'), false);
  assert.equal(shouldPrecache('photos/fudge-brownies-800.webp'), false);
  assert.equal(shouldPrecache('assets/fudge-brownies-abc.pdf'), false);
  assert.equal(shouldPrecache('icon-512.png'), false);
  assert.equal(shouldPrecache('icon-512-maskable.png'), false);
  assert.equal(shouldPrecache('apple-touch-icon.png'), false);
});
