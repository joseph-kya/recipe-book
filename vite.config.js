import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so dist/ works from any static host or subfolder.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // PDFs must stay files (never inlined as data URLs).
    assetsInlineLimit: 0,
  },
});
