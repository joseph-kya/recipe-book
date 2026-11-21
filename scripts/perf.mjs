import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { transformSync } from 'esbuild';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const DIST = join(ROOT, 'dist');
const CPU_RATE = Number(process.env.PERF_CPU_RATE || 6);
const JSON_OUT = process.argv.includes('--json');
const REBUILD = process.argv.includes('--build') || !existsSync(join(DIST, 'index.html'));

function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
}

function auditDist() {
  const assetsDir = join(DIST, 'assets');
  const assetFiles = walkFiles(assetsDir);
  let jsRaw = 0;
  let jsGzip = 0;
  let cssRaw = 0;
  let cssGzip = 0;
  const syntaxCounts = {
    optionalChaining: 0,
    nullishCoalescing: 0,
    logicalAssign: 0,
    topLevelAwait: 0,
  };

  for (const file of assetFiles) {
    const buf = readFileSync(file);
    if (file.endsWith('.js')) {
      jsRaw += buf.length;
      jsGzip += gzipSync(buf).length;
      const src = buf.toString('utf8');
      syntaxCounts.optionalChaining += (src.match(/\?\.(?!\d)/g) || []).length;
      syntaxCounts.nullishCoalescing += (src.match(/\?\?/g) || []).length;
      syntaxCounts.logicalAssign += (src.match(/(\|\|=|&&=|\?\?=)/g) || []).length;
      try {
        transformSync(src, { loader: 'js', target: 'es2017' });
      } catch (err) {
        if (/Top-level await/i.test(err.message)) syntaxCounts.topLevelAwait += 1;
      }
    } else if (file.endsWith('.css')) {
      cssRaw += buf.length;
      cssGzip += gzipSync(buf).length;
    }
  }

  let swPrecacheCount = 0;
  let swPrecacheBytes = 0;
  let swHasModernSyntax = false;
  const swPath = join(DIST, 'sw.js');
  if (existsSync(swPath)) {
    const sw = readFileSync(swPath, 'utf8');
    swHasModernSyntax = /\?\.|\?\?/.test(sw);
    const m = sw.match(/const PRECACHE_URLS = (\[[\s\S]*?\]);/);
    if (m) {
      const urls = JSON.parse(m[1]);
      swPrecacheCount = urls.length;
      const seen = new Set();
      for (const rel of urls) {
        const clean = rel === './' ? 'index.html' : rel.replace(/^\.\//, '');
        if (seen.has(clean)) continue;
        seen.add(clean);
        const full = join(DIST, clean);
        if (existsSync(full)) swPrecacheBytes += statSync(full).size;
      }
    }
  }

  return {
    jsRaw,
    jsGzip,
    cssRaw,
    cssGzip,
    swPrecacheCount,
    swPrecacheBytes,
    swHasModernSyntax,
    syntaxCounts,
  };
}

function installPerfHooks() {
  window.__perf = {
    longTasks: [],
    rafDeltas: [],
    rafActive: false,
    rafId: 0,
    lastTs: 0,
    startRaf() {
      this.rafDeltas = [];
      this.rafActive = true;
      this.lastTs = 0;
      const tick = (ts) => {
        if (!this.rafActive) return;
        if (this.lastTs) this.rafDeltas.push(ts - this.lastTs);
        this.lastTs = ts;
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    },
    stopRaf() {
      this.rafActive = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      return this.rafDeltas.slice();
    },
    drainLongTasks() {
      const out = this.longTasks.slice();
      this.longTasks.length = 0;
      return out;
    },
  };
  try {
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__perf.longTasks.push({
          start: entry.startTime,
          duration: entry.duration,
        });
      }
    });
    obs.observe({ type: 'longtask', buffered: true });
  } catch {
    // longtask observer unsupported
  }
}

function summarizeFrames(deltas) {
  if (!deltas.length) {
    return { frames: 0, dropped: 0, jank34: 0, jank50: 0, p50: 0, p95: 0, max: 0 };
  }
  const sorted = [...deltas].sort((a, b) => a - b);
  const pick = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  return {
    frames: deltas.length,
    dropped: deltas.filter((d) => d > 20).length,
    jank34: deltas.filter((d) => d > 34).length,
    jank50: deltas.filter((d) => d > 50).length,
    p50: Number(pick(0.5).toFixed(1)),
    p95: Number(pick(0.95).toFixed(1)),
    max: Number(sorted[sorted.length - 1].toFixed(1)),
  };
}

function summarizeLongTasks(tasks) {
  const count = tasks.length;
  const max = count ? Math.max(...tasks.map((t) => t.duration)) : 0;
  const tbt = tasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0);
  return {
    count,
    maxMs: Number(max.toFixed(1)),
    tbtMs: Number(tbt.toFixed(1)),
  };
}

async function waitForRest(page) {
  await page.waitForFunction(
    () => document.querySelectorAll('.face--rest').length > 0 && !document.querySelector('.face--front'),
    null,
    { timeout: 15000 },
  );
}

async function pageMarker(page) {
  return page.evaluate(() => {
    const hash = location.hash || '#/';
    const k = history.state && typeof history.state.k === 'number' ? history.state.k : '';
    const count = document.querySelector('.ctl-count')?.textContent?.trim() || '';
    return `${hash}|${k}|${count}`;
  });
}

async function getSwipeCoords(page, direction) {
  return page.evaluate((dir) => {
    const faces = [...document.querySelectorAll('.face--rest')].map((el) => el.getBoundingClientRect());
    const box = faces.length
      ? {
          left: Math.min(...faces.map((r) => r.left)),
          right: Math.max(...faces.map((r) => r.right)),
          top: Math.min(...faces.map((r) => r.top)),
          bottom: Math.max(...faces.map((r) => r.bottom)),
        }
      : { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
    const w = box.right - box.left;
    const h = box.bottom - box.top;
    const startX = Math.round(dir === 'next' ? box.right - w * 0.06 : box.left + w * 0.06);
    const endX = Math.round(dir === 'next' ? box.left + w * 0.06 : box.right - w * 0.06);
    const candidates = [0.5, 0.3, 0.7, 0.2, 0.8].map((f) => Math.round(box.top + h * f));
    let y = Math.round(box.top + h * 0.5);
    for (const cy of candidates) {
      const el = document.elementFromPoint(startX, cy);
      if (!el || !el.closest('button, input, select, textarea, [contenteditable]')) {
        y = cy;
        break;
      }
    }
    return { startX, endX, y };
  }, direction);
}

async function swipeOnce(page, cdp, direction, viewport) {
  const fromMarker = await pageMarker(page);
  const fromHash = fromMarker.split('|')[0];
  const { startX, endX, y } = await getSwipeCoords(page, direction);

  await page.evaluate(() => {
    window.__perf.drainLongTasks();
    window.__perf.startRaf();
  });

  const t0 = performance.now();
  const steps = 10;
  if (viewport.hasTouch) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: startX, y, id: 1 }],
    });
    for (let i = 1; i <= steps; i++) {
      const x = Math.round(startX + ((endX - startX) * i) / steps);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y, id: 1 }],
      });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  } else {
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(endX, y, { steps });
    await page.mouse.up();
  }

  await page.waitForFunction(
    (prev) => {
      const hash = location.hash || '#/';
      const k = history.state && typeof history.state.k === 'number' ? history.state.k : '';
      const count = document.querySelector('.ctl-count')?.textContent?.trim() || '';
      const cur = `${hash}|${k}|${count}`;
      return (
        cur !== prev &&
        document.querySelectorAll('.face--rest').length > 0 &&
        !document.querySelector('.face--front')
      );
    },
    fromMarker,
    { timeout: 15000 },
  );
  // Let any post-settle entrance/layout settle briefly.
  await page.waitForTimeout(120);
  const durationMs = Number((performance.now() - t0).toFixed(1));

  const { deltas, tasks, toHash } = await page.evaluate(() => ({
    deltas: window.__perf.stopRaf(),
    tasks: window.__perf.drainLongTasks(),
    toHash: location.hash || '#/',
  }));

  return {
    direction,
    from: fromHash,
    to: toHash,
    durationMs,
    frames: summarizeFrames(deltas),
    longTasks: summarizeLongTasks(tasks),
  };
}

async function runScenario(browser, baseURL, label, viewport, swipePlan) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    deviceScaleFactor: viewport.deviceScaleFactor,
    locale: 'en-US',
  });
  await context.addInitScript(installPerfHooks);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });

  const errors = [];
  let requests = 0;
  let bytes = 0;
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', async (res) => {
    requests += 1;
    try {
      const headers = res.headers();
      const len = Number(headers['content-length'] || 0);
      if (len > 0) bytes += len;
    } catch {
      // ignore
    }
  });

  const navStart = performance.now();
  await page.goto(`${baseURL}#/`, { waitUntil: 'load' });
  await waitForRest(page);
  await page.evaluate(() => document.fonts.ready);
  const readyMs = Number((performance.now() - navStart).toFixed(1));

  // Wait briefly so Service Worker install/precache activity is observable.
  await page.waitForTimeout(800);
  const loadTasks = await page.evaluate(() => window.__perf.drainLongTasks());

  const swipes = [];
  for (const dir of swipePlan) {
    swipes.push(await swipeOnce(page, cdp, dir, viewport));
  }

  await context.close();

  const allFrames = swipes.reduce((sum, s) => sum + s.frames.frames, 0);
  const allDropped = swipes.reduce((sum, s) => sum + s.frames.dropped, 0);
  const allJank34 = swipes.reduce((sum, s) => sum + s.frames.jank34, 0);
  const allJank50 = swipes.reduce((sum, s) => sum + s.frames.jank50, 0);
  const worstFrameMs = Math.max(0, ...swipes.map((s) => s.frames.max));
  const totalSwipeLongTasks = swipes.reduce((sum, s) => sum + s.longTasks.count, 0);
  const totalSwipeTbt = Number(swipes.reduce((sum, s) => sum + s.longTasks.tbtMs, 0).toFixed(1));
  const maxSwipeLongTask = Math.max(0, ...swipes.map((s) => s.longTasks.maxMs));

  return {
    label,
    viewport: `${viewport.width}x${viewport.height}`,
    cpuThrottle: `${CPU_RATE}x`,
    coldLoad: {
      readyMs,
      requests,
      kbTransferred: Number((bytes / 1024).toFixed(1)),
      longTasks: summarizeLongTasks(loadTasks),
    },
    swipeSummary: {
      count: swipes.length,
      totalFrames: allFrames,
      droppedFrames: allDropped,
      droppedPct: allFrames ? Number(((allDropped / allFrames) * 100).toFixed(1)) : 0,
      jank34Frames: allJank34,
      jank50Frames: allJank50,
      worstFrameMs,
      longTaskCount: totalSwipeLongTasks,
      maxLongTaskMs: maxSwipeLongTask,
      tbtMs: totalSwipeTbt,
    },
    swipes,
    errors,
  };
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  if (REBUILD) {
    await build({ root: ROOT, logLevel: 'silent' });
  }
  const distAudit = auditDist();
  const server = await preview({
    root: ROOT,
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
    logLevel: 'silent',
  });
  const addr = server.httpServer.address();
  const baseURL = `http://127.0.0.1:${addr.port}/`;
  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());

  try {
    const phone = await runScenario(
      browser,
      baseURL,
      'Phone (390x844)',
      { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
      ['next', 'next', 'next', 'next', 'next', 'next', 'next', 'prev', 'prev'],
    );
    const ipad = await runScenario(
      browser,
      baseURL,
      'iPad Landscape (1024x768)',
      { width: 1024, height: 768, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
      ['next', 'next', 'next', 'prev'],
    );

    const report = { distAudit, scenarios: [phone, ipad] };
    if (JSON_OUT) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(`\n=== Joseph's Recipe Book Perf Report (CPU ${CPU_RATE}x) ===`);
    console.log(
      `Bundle: JS ${kb(distAudit.jsRaw)} (${kb(distAudit.jsGzip)} gz) | CSS ${kb(distAudit.cssRaw)} (${kb(distAudit.cssGzip)} gz)`,
    );
    console.log(
      `SW Precache: ${distAudit.swPrecacheCount} URLs, ${kb(distAudit.swPrecacheBytes)} raw | SW modern syntax (?. / ??): ${distAudit.swHasModernSyntax}`,
    );
    console.log(
      `Built JS modern syntax: ?.:${distAudit.syntaxCounts.optionalChaining} ??:${distAudit.syntaxCounts.nullishCoalescing} assign:${distAudit.syntaxCounts.logicalAssign} TLA:${distAudit.syntaxCounts.topLevelAwait}`,
    );

    for (const sc of report.scenarios) {
      console.log(`\n--- ${sc.label} @ ${sc.cpuThrottle} CPU ---`);
      console.log(
        `Cold load: ${sc.coldLoad.readyMs} ms | ${sc.coldLoad.requests} reqs (${sc.coldLoad.kbTransferred} KB) | long tasks: ${sc.coldLoad.longTasks.count} (max ${sc.coldLoad.longTasks.maxMs} ms, TBT ${sc.coldLoad.longTasks.tbtMs} ms)`,
      );
      const s = sc.swipeSummary;
      console.log(
        `Swipes (${s.count}): ${s.totalFrames} frames | dropped >20ms: ${s.droppedFrames} (${s.droppedPct}%) | jank >34ms: ${s.jank34Frames} | severe >50ms: ${s.jank50Frames} | worst frame: ${s.worstFrameMs} ms`,
      );
      console.log(
        `Swipe long tasks: ${s.longTaskCount} (max ${s.maxLongTaskMs} ms, TBT ${s.tbtMs} ms) | errors: ${sc.errors.length}`,
      );
      for (const sw of sc.swipes) {
        console.log(
          `  ${sw.direction.padEnd(4)} ${sw.from.padEnd(32)} -> ${sw.to.padEnd(32)} | ${String(sw.durationMs).padStart(6)} ms | frames ${String(sw.frames.frames).padStart(2)} (drop ${sw.frames.dropped}, p95 ${sw.frames.p95}ms, max ${sw.frames.max}ms) | LT ${sw.longTasks.count} (TBT ${sw.longTasks.tbtMs}ms)`,
        );
      }
      if (sc.errors.length) {
        console.log('  ERRORS:', sc.errors);
      }
    }
  } finally {
    await browser.close();
    server.httpServer.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
