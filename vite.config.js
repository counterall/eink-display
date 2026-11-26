import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Modern desktop and tablet browsers only: Vite's default build target. The
// package.json "browserslist" is what stylelint checks the CSS against.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: { manualChunks: { calendar: ['lunar-javascript'] } },
    },
  },
  plugins: [react()],
});
