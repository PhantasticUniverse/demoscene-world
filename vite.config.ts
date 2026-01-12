import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    target: 'esnext',
    sourcemap: true,
  },
  server: {
    open: true,
  },
});
