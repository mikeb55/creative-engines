import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../composer-os-desktop');
const require = createRequire(path.join(desktopDir, 'package.json'));
const { build } = require('esbuild');
const { composerOsExcludeTestFilesPlugin } = require(path.join(desktopDir, 'scripts/esbuild-exclude-test-files-plugin.js'));
const { composerOsMdStubPlugin } = require(path.join(desktopDir, 'scripts/esbuild-md-stub-plugin.js'));
const { composerOsMosaicSliceRequirePlugin } = require(path.join(desktopDir, 'scripts/esbuild-mosaic-slice-require-plugin.js'));

const stubAssetPlugin = {
  name: 'stub-non-js-assets',
  setup(build) {
    build.onLoad({ filter: /\.(musicxml|xml|DS_Store)$/ }, () => ({ contents: 'module.exports = {};', loader: 'js' }));
  },
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['electron', '@napi-rs/canvas'],
  logLevel: 'info',
  plugins: [composerOsExcludeTestFilesPlugin, composerOsMdStubPlugin, composerOsMosaicSliceRequirePlugin, stubAssetPlugin],
};

await build({
  ...shared,
  entryPoints: [path.join(root, 'electron/main.ts')],
  outfile: path.join(root, 'main.js'),
});
await build({
  ...shared,
  entryPoints: [path.join(root, 'electron/preload.ts')],
  outfile: path.join(root, 'preload.js'),
});
console.log('pentatonic-options-v2 bundle ready');
