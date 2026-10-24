/**
 * Thin Phase 2A convenience wrapper for The Mirror Duo Leadsheet V2.0.
 * Prefer the portable CLI: wwhDualPartTransformCli.ts
 *
 * Pass --source and --out explicitly. No hard-coded album paths.
 *
 * Example:
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runMirrorV20DualPartTransform.ts \
 *     --source path/to/03-The-Mirror-Duo-Leadsheet-V2.0.musicxml \
 *     --out path/to/out-dir
 */

import {
  parseCliArgs,
  runDualPartTransform,
} from '../core/duo/wwhDualPartTransform';

const MIRROR_V20_SHA =
  '1c46974e70aa7323cb933a6d4e7bc463470643db4d416b5e6f58b55fc6be9adf';

function main(): void {
  const args = parseCliArgs(process.argv.slice(2));
  if (!args.source || !args.out) {
    console.error(
      'Usage: runMirrorV20DualPartTransform.ts --source <Mirror-V2.0.musicxml> --out <dir> [--expected-sha <hex>]',
    );
    process.exit(2);
  }

  const result = runDualPartTransform({
    sourcePath: args.source,
    outDir: args.out,
    profiles: args.profiles ?? ['harmonic', 'contrapuntal', 'rhythmic'],
    motifBars: args.motifBars?.length ? args.motifBars : [1, 2, 33, 34],
    expectedSha256: args.expectedSha ?? MIRROR_V20_SHA,
    title: args.title ?? 'The Mirror',
    stem: args.stem ?? 'Mirror-V2.0',
    seed: args.seed ?? 24024,
    bhlWorld: (args.bhlWorld ?? 'F') as import('../core/bhl/bhlWorlds').BhlWorldId,
    exchangeBars: args.exchangeBars ?? { from: 9, to: 24 },
    displaceBars: args.displaceBars ?? { from: 9, to: 32 },
    displaceTailBars: args.displaceTailBars ?? { from: 37, to: 40 },
    phraseAccentBars: args.phraseAccentBars ?? { from: 17, to: 24 },
  });

  console.log(
    JSON.stringify(
      {
        sourceSha: result.sourceSha256,
        outDir: result.outDir,
        files: result.outputs.map((o) => o.file),
        validationIssues: result.validation.length,
        validation: result.validation,
        motifOk: result.motifOk,
      },
      null,
      2,
    ),
  );

  if (result.validation.length > 0 || !result.motifOk) process.exit(1);
}

main();
