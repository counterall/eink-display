import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

// One browser target list, shared with stylelint via package.json "browserslist".
const { browserslist } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: { manualChunks: { calendar: ['lunar-javascript'] } },
    },
  },
  plugins: [
    react(),
    legacy({ targets: browserslist, modernPolyfills: true }),
  ],
});
