/**
 * esbuild: stub co-located *.test.ts swept by mosaic dynamic require() graph.
 * Desktop bundles only — avoids vitest resolution during bundle without moving tests.
 */
function pathEndsWithTestTs(filePath) {
  return filePath.replace(/\\/g, '/').endsWith('.test.ts');
}

const composerOsExcludeTestFilesPlugin = {
  name: 'composer-os-exclude-test-files',
  setup(build) {
    build.onResolve({ filter: /\.test\.ts$/ }, (args) => {
      if (!pathEndsWithTestTs(args.path)) {
        return null;
      }
      return { path: args.path, namespace: 'composer-os-excluded-test-ts' };
    });
    build.onLoad({ filter: /.*/, namespace: 'composer-os-excluded-test-ts' }, () => ({
      contents: 'module.exports = {};',
      loader: 'js',
    }));
    build.onLoad({ filter: /\.test\.ts$/ }, (args) => {
      if (!pathEndsWithTestTs(args.path)) {
        return null;
      }
      return {
        contents: 'module.exports = {};',
        loader: 'js',
      };
    });
  },
};

module.exports = { composerOsExcludeTestFilesPlugin };