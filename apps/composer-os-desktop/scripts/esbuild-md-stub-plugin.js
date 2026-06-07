/**
 * esbuild: stub .md imports pulled in via mosaic dynamic require() graph.
 * Dev/desktop bundles only — avoids "No loader is configured for .md" without touching engine code.
 */
const composerOsMdStubPlugin = {
  name: 'composer-os-md-stub',
  setup(build) {
    build.onLoad({ filter: /\.md$/ }, () => ({
      contents: 'module.exports = {};',
      loader: 'js',
    }));
  },
};

module.exports = { composerOsMdStubPlugin };