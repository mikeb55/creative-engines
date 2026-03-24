/**
 * Bundle the Composer OS API for desktop packaging.
 * Output: resources/api.bundle.js
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '../../..');
const apiEntry = path.join(repoRoot, 'scripts', 'startComposerOsAppApi.ts');
const outDir = path.join(__dirname, '..', 'resources');
const outFile = path.join(outDir, 'api.bundle.js');

fs.mkdirSync(outDir, { recursive: true });

esbuild
  .build({
    entryPoints: [apiEntry],
    bundle: true,
    platform: 'node',
    outfile: outFile,
    target: 'node18',
    format: 'cjs',
  })
  .then(() => console.log('API bundle built:', outFile))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
