/**
 * Bundle the Composer OS API for desktop packaging.
 * Output: resources/api.bundle.js
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const { copyNapiCanvasToResources } = require('./copy-napi-canvas-resources');
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
    external: ['@napi-rs/canvas'],
    plugins: [
      composerOsExcludeWpsBaselineWinPlugin,
      composerOsExcludeTestFilesPlugin,
      composerOsMdStubPlugin,
      composerOsMosaicSliceRequirePlugin,
    ],
    // Resolved at runtime; native binary is packaged via package.json `build.extraResources` (canvas.node).
  })
  .then(() => {
    console.log('API bundle built:', outFile);
    copyNapiCanvasToResources();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
