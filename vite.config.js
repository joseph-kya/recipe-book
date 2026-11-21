import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {
  RECIPE_LANGS,
  normalizeRecipe,
  slugFromFile,
  sortAndNumberRecipes,
  splitRecipesByLang,
} from './src/recipe-data.js';
import { offeredFactors } from './src/scale.js';

function walkFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
}

function readOptionalJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

const VIRTUAL_BASE = 'virtual:recipes-base';
const VIRTUAL_LANG_PREFIX = 'virtual:recipes-lang/';

// Build-time recipe loader: validates and slims content/recipes/*.json,
// precomputes offered portion factors, strips unused nutrition/PDF metadata,
// wires matching PDFs and photos automatically, and splits translations into
// per-language chunks so initial load only ships the active language.
export function loadRecipeBundle(root) {
  const recipesDir = join(root, 'content', 'recipes');
  const pdfsDir = join(root, 'content', 'pdfs');
  const publicPhotosDir = join(root, 'public', 'photos');
  const nutritionIndex = readOptionalJson(join(root, 'content', 'nutrition.json'), { recipes: {} });
  const photoIndex = readOptionalJson(join(root, 'content', 'photos.json'), {});

  const files = existsSync(recipesDir)
    ? readdirSync(recipesDir).filter((f) => f.endsWith('.json')).sort()
    : [];

  const normalized = files.map((fileName) => {
    const filePath = join(recipesDir, fileName);
    let raw;
    try {
      raw = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (err) {
      throw new Error(`Invalid JSON in content/recipes/${fileName}: ${err.message}`);
    }
    const slug = raw?.slug || slugFromFile(fileName);
    const pdf = existsSync(join(pdfsDir, `${slug}.pdf`)) ? `/content/pdfs/${slug}.pdf` : null;
    const gramsPdf = existsSync(join(pdfsDir, `${slug}.grams.pdf`)) ? `/content/pdfs/${slug}.grams.pdf` : null;
    const photo =
      photoIndex[slug] ||
      (existsSync(join(publicPhotosDir, `${slug}-400.webp`)) ? { photo: `photos/${slug}` } : null);
    const nutrition = nutritionIndex.recipes?.[slug] ?? null;
    return normalizeRecipe(raw, {
      fileName: `content/recipes/${fileName}`,
      pdf,
      gramsPdf,
      photo,
      nutrition,
      offered: offeredFactors(raw),
    });
  });

  return splitRecipesByLang(sortAndNumberRecipes(normalized));
}

function recipeContent() {
  let root = process.cwd();
  let cache = null;
  const getBundle = () => (cache ||= loadRecipeBundle(root));

  return {
    name: 'recipe-content',
    configResolved(config) {
      root = config.root;
    },
    buildStart() {
      cache = null;
      const contentDir = join(root, 'content');
      if (existsSync(contentDir)) {
        for (const f of walkFiles(contentDir)) this.addWatchFile(f);
      }
    },
    configureServer(server) {
      const contentDir = join(root, 'content');
      const reload = (file) => {
        if (!file.startsWith(contentDir)) return;
        cache = null;
        for (const id of [VIRTUAL_BASE, ...RECIPE_LANGS.map((l) => `${VIRTUAL_LANG_PREFIX}${l}`)]) {
          const mod = server.moduleGraph.getModuleById(`\0${id}`);
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', reload);
      server.watcher.on('change', reload);
      server.watcher.on('unlink', reload);
    },
    resolveId(id) {
      if (id === VIRTUAL_BASE || id.startsWith(VIRTUAL_LANG_PREFIX)) return `\0${id}`;
      return null;
    },
    load(id) {
      if (id === `\0${VIRTUAL_BASE}`) {
        const { base } = getBundle();
        const imports = [];
        const items = base.map((r, i) => {
          const { pdf, gramsPdf, ...rest } = r;
          let pdfRef = 'null';
          let gramsRef = 'null';
          if (pdf) {
            pdfRef = `pdf_${i}`;
            imports.push(`import ${pdfRef} from ${JSON.stringify(`${pdf}?url`)};`);
          }
          if (gramsPdf) {
            gramsRef = `gramsPdf_${i}`;
            imports.push(`import ${gramsRef} from ${JSON.stringify(`${gramsPdf}?url`)};`);
          }
          const json = JSON.stringify(rest).slice(0, -1);
          return `${json},"pdf":${pdfRef},"gramsPdf":${gramsRef}}`;
        });
        return `${imports.join('\n')}\nexport default [${items.join(',')}];\n`;
      }
      if (id.startsWith(`\0${VIRTUAL_LANG_PREFIX}`)) {
        const lang = id.slice(`\0${VIRTUAL_LANG_PREFIX}`.length);
        const { byLang } = getBundle();
        return `export default ${JSON.stringify(byLang[lang] || {})};\n`;
      }
      return null;
    },
  };
}

// Build-time compatibility layer for old iOS Safari (12-15) without touching
// component sources owned by other workstreams:
// 1. Eliminates top-level await in src/content.js (unsupported before Safari 15)
//    so build.target ['es2017', 'safari12'] compiles cleanly into one lean bundle.
// 2. Injects cascade-preserving CSS fallbacks (vh before dvh, physical before
//    inset-inline/block & padding/margin-inline/block, -webkit-user-select,
//    opaque base colors before color-mix, and html.no-flex-gap spacing) that
//    modern browsers override identically while Safari 12-15 avoids broken layout.
export function addSafariCssFallbacks(css) {
  let out = css;

  // 1. dvh/svh/lvh -> emit vh fallback declaration before it (Safari < 15.4).
  out = out.replace(
    /([;{])((?:--)?[a-z-]+)\s*:\s*([^;{}]*?\d(?:d|s|l)vh[^;{}]*)/g,
    (match, sep, prop, val) => {
      const fallback = val.replace(/(\d)(?:d|s|l)vh\b/g, '$1vh');
      return `${sep}${prop}:${fallback};${prop}:${val}`;
    },
  );

  // 2. inset-inline / inset-block -> physical left/right or top/bottom before it (Safari < 14.1).
  out = out.replace(/([;{])inset-inline\s*:\s*([^;{}]+)/g, (_, sep, val) => {
    const parts = splitCssValues(val);
    const l = parts[0];
    const r = parts[1] || parts[0];
    return `${sep}left:${l};right:${r};inset-inline:${val}`;
  });
  out = out.replace(/([;{])inset-block\s*:\s*([^;{}]+)/g, (_, sep, val) => {
    const parts = splitCssValues(val);
    const t = parts[0];
    const b = parts[1] || parts[0];
    return `${sep}top:${t};bottom:${b};inset-block:${val}`;
  });

  // 3. padding/margin-inline/block shorthands -> physical fallbacks before them (Safari < 14.1).
  out = out.replace(/([;{])(padding|margin)-(inline|block)\s*:\s*([^;{}]+)/g, (_, sep, prop, axis, val) => {
    const parts = splitCssValues(val);
    const a = parts[0];
    const b = parts[1] || parts[0];
    const [p1, p2] = axis === 'inline' ? [`${prop}-left`, `${prop}-right`] : [`${prop}-top`, `${prop}-bottom`];
    return `${sep}${p1}:${a};${p2}:${b};${prop}-${axis}:${val}`;
  });

  // 4. user-select:none -> ensure -webkit-user-select:none precedes it.
  out = out.replace(/([;{])user-select\s*:\s*none(?![^;{}]*-webkit-user-select)/g, '$1-webkit-user-select:none;user-select:none');

  // 5. Opaque color-mix backgrounds mixed with a solid theme token -> keep base token on Safari < 16.2.
  out = out.replace(
    /([;{])background\s*:\s*(color-mix\(\s*in srgb\s*,\s*var\(--[a-z0-9-]+\)\s+\d+%\s*,\s*(var\((?:[^()]|\([^()]*\))*\))\s*\))/g,
    '$1background:$3;background:$2',
  );

  // 6. Page-turn .shade gradient color-mix -> neutral translucent shadow fallback on Safari < 16.2.
  out = out.replace(
    /([;{])background\s*:\s*(linear-gradient\(to (left|right),\s*color-mix\(in srgb,\s*var\(--shadow\) 65%,\s*transparent\),\s*color-mix\(in srgb,\s*var\(--shadow\) 12%,\s*transparent\) 70%\))/g,
    '$1background:linear-gradient(to $3,rgba(0,0,0,.45),rgba(0,0,0,.08) 70%);background:$2',
  );

  // 7. Flex-gap fallback for Safari < 14.1 (only active when index.html sets html.no-flex-gap).
  const noFlexGap =
    'html.no-flex-gap .controls-group>*+*,html.no-flex-gap .ctl-middle>*+*,html.no-flex-gap .stats>*+*,html.no-flex-gap .scaler-chips>*+*,html.no-flex-gap .hero-actions>*+*,html.no-flex-gap .method-actions>*+*,html.no-flex-gap .cook-nav>*+*,html.no-flex-gap .recipe-glance>*+*{margin-left:.45rem}' +
    'html.no-flex-gap .toc-list>*+*{margin-top:.35rem}';

  return `${out}\n${noFlexGap}\n`;
}

function splitCssValues(val) {
  const parts = [];
  let cur = '';
  let depth = 0;
  for (const ch of val.trim()) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (/\s/.test(ch) && depth === 0) {
      if (cur) {
        parts.push(cur);
        cur = '';
      }
    } else {
      cur += ch;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

function safariCompat() {
  return {
    name: 'safari-compat',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      const normalized = id.replace(/\\/g, '/');
      if (normalized.endsWith('/src/content.js')) {
        const replaced = code.replace(
          /await\s+ensureRecipeLang\(detectInitialLang\(\)\);/,
          'export const initialLangReady = ensureRecipeLang(detectInitialLang());',
        );
        if (replaced === code) {
          throw new Error('safari-compat: expected top-level await in src/content.js');
        }
        return { code: replaced, map: null };
      }
      if (normalized.endsWith('/src/main.jsx')) {
        const target = "createRoot(document.getElementById('root')).render(<App />);";
        if (!code.includes(target)) {
          throw new Error('safari-compat: expected root render call in src/main.jsx');
        }
        const replaced =
          "import { initialLangReady } from './content.js';\n" +
          code.replace(
            target,
            "initialLangReady.catch(() => {}).then(() => {\n  createRoot(document.getElementById('root')).render(<App />);\n});",
          );
        return { code: replaced, map: null };
      }
      return null;
    },
    generateBundle(_, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type === 'asset' && item.fileName.endsWith('.css') && typeof item.source === 'string') {
          item.source = addSafariCssFallbacks(item.source);
        }
      }
    },
  };
}

// Keep the SW precache small: app shell, JS/CSS bundles (including EN/DE/FR chunks),
// and fonts. Photos, PDFs, and secondary install icons cache on demand via cacheFirstAsset
// so old iPads do not stall downloading ~850 KB of unused media on first open.
export function shouldPrecache(relPath) {
  if (relPath === 'sw.js' || relPath.startsWith('.') || relPath.includes('/.')) return false;
  if (relPath.startsWith('photos/')) return false;
  if (relPath.endsWith('.pdf')) return false;
  if (/^(apple-touch-icon|icon-\d+).*\.png$/.test(relPath)) return false;
  return true;
}

function serviceWorkerPrecache() {
  let outDir = 'dist';
  return {
    name: 'service-worker-precache',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = join(outDir, 'sw.js');
      if (!existsSync(swPath)) return;
      const swSource = readFileSync(swPath, 'utf8');
      const allFiles = walkFiles(outDir)
        .map((f) => relative(outDir, f).replace(/\\/g, '/'))
        .filter((f) => f !== 'sw.js' && !f.startsWith('.') && !f.includes('/.'))
        .sort();
      const precacheFiles = allFiles.filter(shouldPrecache);
      const precacheUrls = ['./', ...precacheFiles.map((f) => `./${f}`)];

      const hash = createHash('sha256');
      hash.update(swSource);
      for (const f of allFiles) {
        hash.update(f);
        hash.update(readFileSync(join(outDir, f)));
      }
      const version = hash.digest('hex').slice(0, 8);

      const out = swSource
        .replace("const CACHE_VERSION = 'dev';", `const CACHE_VERSION = '${version}';`)
        .replace(
          /const PRECACHE_URLS = \[[\s\S]*?\];/,
          `const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};`,
        );
      if (out === swSource) {
        throw new Error('Failed to inject precache manifest into dist/sw.js');
      }
      writeFileSync(swPath, out);
    },
  };
}

// Start fetching the active language's recipe chunk alongside the app bundle
// (avoiding a waterfall on src/content.js's top-level await), preload Nunito
// on deep links straight to contents/recipes, and silently check for SW updates
// when returning to an installed PWA in the background.
function preloadHints() {
  return {
    name: 'preload-hints',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx?.bundle) return html;
        const langChunks = {};
        let bodyFont = null;
        for (const [fileName, item] of Object.entries(ctx.bundle)) {
          if (item.type === 'chunk' && RECIPE_LANGS.includes(item.name)) {
            langChunks[item.name] = `./${fileName}`;
          } else if (
            item.type === 'asset' &&
            /^assets\/Nunito-VariableFont_wght-.*\.woff2$/.test(fileName)
          ) {
            bodyFont = `./${fileName}`;
          }
        }
        const script = [
          '(function(){try{',
          `var langs=${JSON.stringify(langChunks)};`,
          'var saved=localStorage.getItem("recipe-book:lang");',
          'var nav=(navigator.language||"").toLowerCase();',
          'var l=langs[saved]?saved:nav.indexOf("de")===0?"de":nav.indexOf("fr")===0?"fr":"en";',
          'function hint(rel,href,as,type){if(!href)return;var el=document.createElement("link");el.rel=rel;el.href=href;el.crossOrigin="";if(as)el.as=as;if(type)el.type=type;document.head.appendChild(el);}',
          'hint("modulepreload",langs[l]);',
          bodyFont
            ? `if(location.hash&&location.hash!=="#"&&location.hash!=="#/"){hint("preload",${JSON.stringify(bodyFont)},"font","font/woff2");}`
            : '',
          'if("serviceWorker"in navigator){',
          'var last=Date.now();',
          'document.addEventListener("visibilitychange",function(){if(document.visibilityState!=="visible"||Date.now()-last<300000)return;last=Date.now();navigator.serviceWorker.getRegistration().then(function(r){if(r)r.update().catch(function(){});}).catch(function(){});});',
          '}',
          '}catch(e){}})();',
        ].join('');
        return [
          {
            tag: 'script',
            children: script,
            injectTo: 'head',
          },
        ];
      },
    },
  };
}

// base './' so dist/ works under GitHub Pages (/recipe-book/) and any static host.
export default defineConfig({
  base: './',
  plugins: [react(), recipeContent(), safariCompat(), preloadHints(), serviceWorkerPrecache()],
  build: {
    // Support older iPad/iOS Safari (12+) in one lean ES module bundle without
    // duplicating chunks via plugin-legacy.
    target: ['es2017', 'safari12'],
    cssTarget: ['safari12'],
    // PDFs must stay files (never inlined as data URLs).
    assetsInlineLimit: 0,
    // Modern browsers support <link rel="modulepreload">; older Safari ignores it cleanly.
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[/\\](react|react-dom|scheduler)[/\\]/.test(id)) return 'react';
        },
      },
    },
  },
});
