// Offline support for the recipe book. During `vite build`, vite.config.js
// replaces CACHE_VERSION and PRECACHE_URLS with the hashed app-shell assets
// (excluding PDFs, which are cached here on first open instead).
const CACHE_VERSION = '8cf07eb5';
const CACHE_NAME = `recipe-book-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  "./",
  "./apple-touch-icon.png",
  "./assets/Kalam-Bold-BtpgmbEl.woff2",
  "./assets/Kalam-Regular-jvftF10c.woff2",
  "./assets/LilitaOne-Regular-D7nIaIyc.woff2",
  "./assets/Nunito-Italic-VariableFont_wght-DmgITMWk.woff2",
  "./assets/Nunito-VariableFont_wght-BEAd3XN2.woff2",
  "./assets/Shrikhand-Regular-BEzUR0JX.woff2",
  "./assets/index-CBZlAnAn.js",
  "./assets/index-CijAa0Wk.css",
  "./favicon.svg",
  "./index.html",
  "./manifest.webmanifest",
  "./photos/berry-quark-bake-400.webp",
  "./photos/berry-quark-bake-800.webp",
  "./photos/best-classic-cinnamon-rolls-400.webp",
  "./photos/best-classic-cinnamon-rolls-800.webp",
  "./photos/fudge-brownies-400.webp",
  "./photos/fudge-brownies-800.webp",
  "./photos/protein-cloud-cheesecake-400.webp",
  "./photos/protein-cloud-cheesecake-800.webp",
  "./photos/topfenschmarren-400.webp",
  "./photos/topfenschmarren-800.webp"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isHtmlRequest(request, url) {
  if (url.pathname.endsWith('.pdf')) return false;
  if (request.mode === 'navigate' || request.destination === 'document') return true;
  return request.headers.get('accept')?.includes('text/html') ?? false;
}

async function networkFirstHtml(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (
      (await caches.match(request, { ignoreSearch: true })) ||
      (await caches.match('./index.html')) ||
      (await caches.match('./')) ||
      Response.error()
    );
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.status === 200) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isHtmlRequest(request, url)) {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  event.respondWith(cacheFirstAsset(request));
});
