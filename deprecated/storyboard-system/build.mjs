import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [join(root, 'src', 'material-web.js')],
  bundle: true,
  format: 'esm',
  target: ['es2022'],
  minify: true,
  sourcemap: false,
  legalComments: 'linked',
  outfile: join(root, 'static', 'vendor', 'material-web.js')
});

for (const [source, name] of [
  ['@material/web/LICENSE', 'material-web-LICENSE.txt'],
  ['lit/LICENSE', 'lit-LICENSE.txt'],
  ['lit-html/LICENSE', 'lit-html-LICENSE.txt'],
  ['lit-element/LICENSE', 'lit-element-LICENSE.txt'],
  ['@lit/reactive-element/LICENSE', 'reactive-element-LICENSE.txt']
]) await copyFile(`${root}/node_modules/${source}`, `${root}/static/vendor/${name}`);

console.log('Built static/vendor/material-web.js');

await build({
  entryPoints: [join(root, 'src', 'three-bundle.js')],
  bundle: true,
  format: 'iife',
  globalName: 'THREEBundle',
  target: ['es2022'],
  minify: true,
  sourcemap: false,
  legalComments: 'linked',
  outfile: join(root, 'static', 'vendor', 'three-bundle.js')
});
console.log('Built static/vendor/three-bundle.js');

await build({
  entryPoints: [join(root, 'src', 'workspace', 'index.tsx')], bundle: true,
  format: 'iife', target: ['es2022'], minify: true, legalComments: 'linked',
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: join(root, 'static', 'workspace-v73.js')
});
execFileSync(process.execPath, [`${root}/node_modules/@tailwindcss/cli/dist/index.mjs`,
  '-i', 'src/workspace/theme.css', '-o', 'static/workspace-v73.css', '--minify'], {cwd:root, stdio:'inherit'});
console.log('Built unified workspace UI');
