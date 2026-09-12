import { copyFile, cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
// Only generated HTML and assets are copied. Existing resources, including every
// audio recording, are deliberately left untouched. Old assets remain for rollback.
await mkdir(new URL('assets/', root), { recursive: true });
await cp(new URL('dist/assets/', root), new URL('assets/', root), { recursive: true });
await copyFile(new URL('dist/index.html', root), new URL('index.html', root));
console.log(`Published build to ${fileURLToPath(root)} (resources unchanged).`);
