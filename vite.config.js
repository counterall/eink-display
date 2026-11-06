import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: { manualChunks: { calendar: ['lunar-javascript'] } },
    },
  },
  plugins: [
    react(),
    legacy({ targets: ['Safari >= 9', 'Chrome >= 49'], modernPolyfills: true }),
  ],
});
