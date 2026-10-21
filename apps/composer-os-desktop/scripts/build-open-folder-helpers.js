/**
 * Bundle open-folder IPC helpers for packaged desktop (no loose engines/ path at runtime).
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const composerOsExcludeWpsBaselineWinPlugin = {
  name: 'composer-os-exclude-wps-baseline-win',
  setup(build) {
    const isBaseline = (p) => (p || '').replace(/\\/g, '/').includes('/wps/baseline/');
    build.onResolve({ filter: /.*/ }, (args) => {
      if (isBaseline(args.path) || isBaseline(args.importer)) {
        return { path: args.path, namespace: 'composer-os-wps-baseline-stub' };
      }
    });
    build.onLoad({ filter: /.*/ }, (args) =>
      isBaseline(args.path) ? { contents: 'module.exports = {};', loader: 'js' } : null
    );
  },
};

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
    plugins: [composerOsExcludeWpsBaselineWinPlugin],
  })
  .then(() => console.log('open-folder-helpers bundle built:', outFile))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
