import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function walkFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
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
  plugins: [react(), serviceWorkerPrecache()],
  build: {
    // PDFs must stay files (never inlined as data URLs).
    assetsInlineLimit: 0,
  },
});
