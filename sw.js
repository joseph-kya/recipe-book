// Offline-first service worker for Joseph's Recipe Book.
// Written in Safari 12+ compatible ES2017 (no optional chaining or nullish coalescing) because public/sw.js is not transpiled.
// During `vite build`, vite.config.js injects CACHE_VERSION (content hash) and
// a slim PRECACHE_URLS (app shell, EN/DE/FR recipe chunks, CSS, and fonts).
// Photos, PDFs, and secondary PWA icons are cached on demand by cacheFirstAsset.
const CACHE_PREFIX = 'recipe-book-';
const CACHE_VERSION = 'b14a3278';
// Epoch invalidates every pre-revert cache while preserving offline support.
const CACHE_NAME = `${CACHE_PREFIX}v2-${CACHE_VERSION}`;
const HTML_NETWORK_TIMEOUT_MS = 3000;
const PRECACHE_CONCURRENCY = 4;
const PRECACHE_URLS = [
  "./",
  "./assets/FeedbackSheet-CSRJfvtH.js",
  "./assets/FeedbackSheet-D1yA3WRD.css",
  "./assets/Kalam-Bold-BtpgmbEl.woff2",
  "./assets/Kalam-Regular-jvftF10c.woff2",
  "./assets/LilitaOne-Regular-D7nIaIyc.woff2",
  "./assets/Nunito-Italic-VariableFont_wght-DmgITMWk.woff2",
  "./assets/Nunito-VariableFont_wght-BEAd3XN2.woff2",
  "./assets/ProfilePanel-ytTVbfiE.js",
  "./assets/Settings-CGgqML0Z.css",
  "./assets/Settings-FAkYwxlK.js",
  "./assets/Shrikhand-Regular-BEzUR0JX.woff2",
  "./assets/de-Brh_KxIM.js",
  "./assets/en-CDSBfP4B.js",
  "./assets/fr-CjL0pfqf.js",
  "./assets/index-7ynzu7Bn.js",
  "./assets/index-B1AMQcph.css",
  "./assets/react-BsRzY1GF.js",
  "./assets/sync-9S08KM6k.js",
  "./favicon.svg",
  "./index.html",
  "./manifest.webmanifest"
];

function scopeUrl(rel) {
  return new URL(rel, self.registration.scope).href;
}

function isImmutableAsset(rel) {
  return rel.startsWith('./assets/');
}

async function precacheAll() {
  const cache = await caches.open(CACHE_NAME);
  const oldKeys = (await caches.keys()).filter(
    (k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME,
  );
  const oldCaches = await Promise.all(oldKeys.map((k) => caches.open(k)));

  async function findInOldCaches(url) {
    for (const old of oldCaches) {
      const hit = await old.match(url);
      if (hit && hit.status === 200) return hit;
    }
    return null;
  }

  // Bound concurrent fetches/writes so slow devices do not stall during install.
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < PRECACHE_URLS.length) {
      const rel = PRECACHE_URLS[nextIndex++];
      const url = scopeUrl(rel);
      if (isImmutableAsset(rel)) {
        const reused = await findInOldCaches(url);
        if (reused) {
          await cache.put(url, reused.clone());
          continue;
        }
      }
      const req = isImmutableAsset(rel)
        ? new Request(url)
        : new Request(url, { cache: 'reload' });
      const res = await fetch(req);
      if (!res || !res.ok || res.status !== 200) {
        const status = res ? res.status : 'network';
        throw new Error(`Precache failed (${status}) for ${rel}`);
      }
      await cache.put(url, res);
    }
  }

  const workers = [];
  const count = Math.min(PRECACHE_CONCURRENCY, PRECACHE_URLS.length);
  for (let i = 0; i < count; i++) workers.push(worker());
  await Promise.all(workers);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAll().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isHtmlRequest(request, url) {
  if (url.pathname.endsWith('.pdf')) return false;
  if (request.mode === 'navigate' || request.destination === 'document') return true;
  const accept = request.headers.get('accept');
  return accept ? accept.indexOf('text/html') !== -1 : false;
}

async function fetchWithTimeout(request, ms) {
  if (typeof AbortController === 'undefined') return fetch(request, { cache: 'no-store' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(request, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

async function matchCachedHtml(request) {
  const cache = await caches.open(CACHE_NAME);
  return (
    (await cache.match(request, { ignoreSearch: true })) ||
    (await cache.match(scopeUrl('./index.html'))) ||
    (await cache.match(scopeUrl('./'))) ||
    (await caches.match(request, { ignoreSearch: true })) ||
    (await caches.match(scopeUrl('./index.html'))) ||
    (await caches.match(scopeUrl('./'))) ||
    Response.error()
  );
}

async function networkFirstHtml(request) {
  try {
    const response = await fetchWithTimeout(request, HTML_NETWORK_TIMEOUT_MS);
    if (response && response.ok && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
      return response;
    }
  } catch (e) {
    /* offline or timed out: serve cached shell below */
  }
  return matchCachedHtml(request);
}

async function sliceRangeResponse(cached, rangeHeader) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2])) return cached;
  const buf = await cached.arrayBuffer();
  const total = buf.byteLength;

  let start = match[1] === '' ? null : Number(match[1]);
  let end = match[2] === '' ? null : Number(match[2]);
  if (start === null && end !== null) {
    start = Math.max(0, total - end);
    end = total - 1;
  } else {
    if (start === null) start = 0;
    if (end === null || end >= total) end = total - 1;
  }
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${total}` },
    });
  }

  const chunk = buf.slice(start, end + 1);
  const headers = new Headers(cached.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
  headers.set('Content-Length', String(chunk.byteLength));
  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers,
  });
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = request.url;
  const cached = (await cache.match(url)) || (await caches.match(url));
  if (cached) {
    const range = request.headers.get('range');
    return range ? sliceRangeResponse(cached, range) : cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok && response.status === 200) {
      cache.put(url, response.clone()).catch(() => {});
    }
    return response;
  } catch (e) {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(self.registration.scope)) return;

  if (isHtmlRequest(request, url)) {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  event.respondWith(cacheFirstAsset(request));
});
