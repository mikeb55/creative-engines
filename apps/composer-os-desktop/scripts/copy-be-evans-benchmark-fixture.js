/**
 * Evans Musician bridge - copy lyrical benchmark into desktop resources next to IPC bundle.
 * resolveBeBenchmarkFixturePath() expects: __dirname/test-fixtures/BE_Benchmark_LyricalBallad.musicxml
 */
const fs = require('fs');
const path = require('path');

const BE_MUSICIAN_BENCHMARK_FIXTURE_NAME = 'BE_Benchmark_LyricalBallad.musicxml';

function copyBeEvansBenchmarkFixtureToResources() {
  const repoRoot = path.resolve(__dirname, '../../..');
  const src = path.join(
    repoRoot,
    'engines',
    'composer-os-v2',
    'core',
    'bill-evans',
    'test-fixtures',
    BE_MUSICIAN_BENCHMARK_FIXTURE_NAME
  );
  const destDir = path.join(__dirname, '..', 'resources', 'test-fixtures');
  const dest = path.join(destDir, BE_MUSICIAN_BENCHMARK_FIXTURE_NAME);

  if (!fs.existsSync(src)) {
    console.error('[copy-be-evans-benchmark] missing source fixture:', src);
    process.exit(1);
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('[copy-be-evans-benchmark]', dest);
}

if (require.main === module) {
  copyBeEvansBenchmarkFixtureToResources();
}

module.exports = { copyBeEvansBenchmarkFixtureToResources, BE_MUSICIAN_BENCHMARK_FIXTURE_NAME };
