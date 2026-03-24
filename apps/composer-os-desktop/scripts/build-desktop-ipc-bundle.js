/**
 * Bundle Electron IPC handlers + Composer OS app-api core (no Express).
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '../../..');
const entry = path.join(repoRoot, 'apps', 'composer-os-desktop', 'electron', 'ipcEntry.ts');
const outFile = path.join(__dirname, '..', 'resources', 'desktop-ipc.bundle.cjs');

fs.mkdirSync(path.dirname(outFile), { recursive: true });

esbuild
  .build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    outfile: outFile,
    target: 'node18',
    format: 'cjs',
    external: ['electron'],
  })
  .then(() => console.log('desktop-ipc bundle built:', outFile))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
