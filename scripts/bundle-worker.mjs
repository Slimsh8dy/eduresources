// Bundles the Cloudflare Worker into one file (worker/dist/tutor.js) so it can be
// pasted into a Worker created in the Cloudflare dashboard, without any tooling.
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../worker/', import.meta.url));
await build({
  configFile: false,
  root,
  logLevel: 'warn',
  build: {
    ssr: 'src/index.js',
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    target: 'es2022',
    rollupOptions: { output: { entryFileNames: 'tutor.js', format: 'es' } },
  },
  ssr: { noExternal: true, target: 'webworker' },
});
console.log('Bundled worker to worker/dist/tutor.js');
