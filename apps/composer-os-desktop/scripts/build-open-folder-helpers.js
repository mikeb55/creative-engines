/**
 * Bundle open-folder IPC helpers for packaged desktop (no loose engines/ path at runtime).
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '../../..');
const entry = path.join(repoRoot, 'apps', 'composer-os-desktop', 'electron', 'openFolderHelpersBundleEntry.ts');
const outFile = path.join(__dirname, '..', 'resources', 'open-folder-helpers.cjs');

fs.mkdirSync(path.dirname(outFile), { recursive: true });

esbuild
  .build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    outfile: outFile,
    target: 'node18',
    format: 'cjs',
  })
  .then(() => console.log('open-folder-helpers bundle built:', outFile))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
