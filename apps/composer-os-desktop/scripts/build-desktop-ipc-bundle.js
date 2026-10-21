/**
 * Bundle Electron IPC handlers + Composer OS app-api core (no Express).
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const { copyNapiCanvasToResources } = require('./copy-napi-canvas-resources');
const { copyBeEvansBenchmarkFixtureToResources } = require('./copy-be-evans-benchmark-fixture');
const { composerOsExcludeTestFilesPlugin } = require('./esbuild-exclude-test-files-plugin');
const { composerOsMdStubPlugin } = require('./esbuild-md-stub-plugin');
const { composerOsMosaicSliceRequirePlugin } = require('./esbuild-mosaic-slice-require-plugin');

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
    external: ['electron', '@napi-rs/canvas'],
    plugins: [
      composerOsExcludeWpsBaselineWinPlugin,
      composerOsExcludeTestFilesPlugin,
      composerOsMdStubPlugin,
      composerOsMosaicSliceRequirePlugin,
    ],
  })
  .then(() => {
    console.log('desktop-ipc bundle built:', outFile);
    copyNapiCanvasToResources();
    copyBeEvansBenchmarkFixtureToResources();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
