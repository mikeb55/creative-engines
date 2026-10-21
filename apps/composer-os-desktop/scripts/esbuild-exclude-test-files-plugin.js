/**
 * esbuild: stub files swept by mosaic dynamic require() that are not runtime modules.
 * Desktop bundles only — avoids vitest resolution and frozen snapshot import paths
 * without moving those sources.
 *
 * WPS V1.1 under core/wwh/wps/baseline/ keeps imports written for core/wwh/wps/.
 * Nested copies do not resolve. Live WPS modules stay in the bundle.
 */
function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function pathEndsWithTestTs(filePath) {
  return normalizePath(filePath).endsWith('.test.ts');
}

function pathIsFrozenWpsBaseline(filePath) {
  return normalizePath(filePath).includes('/wps/baseline/');
}

function shouldStubFromBundle(filePath) {
  return pathEndsWithTestTs(filePath) || pathIsFrozenWpsBaseline(filePath);
}

/** Match .test.ts and wps/baseline (or wps\baseline) on Windows and Mac. */
const EXCLUDE_PATH_FILTER = /(?:\.test\.ts$|[\/\\]wps[\/\\]baseline[\/\\])/;

const composerOsExcludeTestFilesPlugin = {
  name: 'composer-os-exclude-test-files',
  setup(build) {
    build.onResolve({ filter: EXCLUDE_PATH_FILTER }, (args) => {
      if (!shouldStubFromBundle(args.path)) {
        return null;
      }
      return { path: args.path, namespace: 'composer-os-excluded-test-ts' };
    });
    build.onLoad({ filter: /.*/, namespace: 'composer-os-excluded-test-ts' }, () => ({
      contents: 'module.exports = {};',
      loader: 'js',
    }));
    build.onLoad({ filter: EXCLUDE_PATH_FILTER }, (args) => {
      if (!shouldStubFromBundle(args.path)) {
        return null;
      }
      return {
        contents: 'module.exports = {};',
        loader: 'js',
      };
    });
  },
};

module.exports = {
  composerOsExcludeTestFilesPlugin,
  pathIsFrozenWpsBaseline,
  shouldStubFromBundle,
};
