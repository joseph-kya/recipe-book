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

// Inject the built app-shell URLs and content hash into dist/sw.js so hashed
// assets, fonts and photos are precached while recipe PDFs stay on-demand.
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
      const files = walkFiles(outDir)
        .map((f) => relative(outDir, f).replace(/\\/g, '/'))
        .filter((f) => f !== 'sw.js' && !f.endsWith('.pdf') && !f.startsWith('.'))
        .sort();
      const precacheUrls = ['./', ...files.map((f) => `./${f}`)];

      const hash = createHash('sha256');
      hash.update(swSource);
      for (const f of files) {
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

// base './' so dist/ works from any static host or subfolder.
export default defineConfig({
  base: './',
  plugins: [react(), recipeContent(), serviceWorkerPrecache()],
  build: {
    // PDFs must stay files (never inlined as data URLs).
    assetsInlineLimit: 0,
    // Baseline target browsers natively support <link rel="modulepreload">.
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
