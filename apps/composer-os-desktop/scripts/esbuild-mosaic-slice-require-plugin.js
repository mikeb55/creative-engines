/**
 * mosaicComposerDispatch loadMod uses require(`../${relativePath}`) without .ts.
 * esbuild glob maps keys as ../path/to/module.ts — rewrite loadMod at bundle time only.
 */
const LOAD_MOD_NEEDLE =
  'return require(`../${relativePath}`) as Record<string, unknown>;';
const LOAD_MOD_REPLACEMENT =
  'return require(`../${relativePath}.ts`) as Record<string, unknown>;';

const composerOsMosaicSliceRequirePlugin = {
  name: 'composer-os-mosaic-slice-require',
  setup(build) {
    build.onLoad({ filter: /mosaicComposerDispatch\.ts$/ }, async (args) => {
      if (!args.path.replace(/\\/g, '/').includes('mosaic-mode/mosaicComposerDispatch.ts')) {
        return null;
      }
      const fs = require('fs');
      let contents = await fs.promises.readFile(args.path, 'utf8');
      if (contents.includes(LOAD_MOD_REPLACEMENT)) {
        return null;
      }
      if (!contents.includes(LOAD_MOD_NEEDLE)) {
        throw new Error(
          'composer-os-mosaic-slice-require: expected loadMod require pattern not found in mosaicComposerDispatch.ts'
        );
      }
      contents = contents.replace(LOAD_MOD_NEEDLE, LOAD_MOD_REPLACEMENT);
      return { contents, loader: 'ts' };
    });
  },
};

module.exports = { composerOsMosaicSliceRequirePlugin };