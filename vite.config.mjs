import { defineConfig } from 'vite';

export default defineConfig({
  root: 'app',
  base: '/eduresources/',
  publicDir: false,
  build: { outDir: '../dist', emptyOutDir: true, sourcemap: false, target: 'es2022' },
  worker: { format: 'es' },
});
