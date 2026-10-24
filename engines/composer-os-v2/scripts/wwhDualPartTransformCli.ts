/**
 * WWH dual-part MusicXML transformation CLI.
 *
 * Run from creative-engines:
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/wwhDualPartTransformCli.ts \
 *     --source <duo.musicxml> --out <outdir> \
 *     [--profiles harmonic,contrapuntal,rhythmic] \
 *     [--motif-bars 1,2] [--expected-sha <hex>] [--title "Piece"] \
 *     [--seed 24024] [--bhl-world F]
 *
 * Bass-only (DTE V1.1):
 *   ... --mode bassOnly --lock-guitar --preserve-harmony \
 *       [--bass-profiles lyrical,contrapuntal,rhythmic]
 *
 * Does not modify the source. No GUI.
 */

import type { BhlWorldId } from '../core/bhl/bhlWorlds';
import { parseCliArgs, runDualPartTransform } from '../core/duo/wwhDualPartTransform';

const USAGE = `Usage:
  npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/wwhDualPartTransformCli.ts \\
    --source <duo.musicxml> --out <outdir> [options]

Options:
  --mode dual|bassOnly                        (default: dual)
  --profiles harmonic,contrapuntal,rhythmic   dual mode (default: all three)
  --bass-profiles lyrical,contrapuntal,rhythmic  bassOnly mode
  --lock-guitar                               required for bassOnly
  --preserve-harmony                          required for bassOnly
  --motif-bars 1,2[,33,34]                    guitar bars left identical (default: 1,2)
  --expected-sha <hex>                        optional source integrity gate
  --title <name>                              work title on candidates
  --stem <name>                               output filename stem
  --seed <n>                                  BHL / bass-only seed
  --bhl-world F                               BHL world for harmonic profile
  --exchange-bars FROM-TO                     contrapuntal exchange window
  --displace-bars FROM-TO                     rhythmic displace window
  --displace-tail-bars FROM-TO
  --phrase-accent-bars FROM-TO
`;

function main(): void {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help || !args.source || !args.out) {
    console.error(USAGE);
    process.exit(args.help ? 0 : 2);
  }

  const result = runDualPartTransform({
    sourcePath: args.source,
    outDir: args.out,
    mode: args.mode,
    profiles: args.profiles,
    bassOnlyProfiles: args.bassOnlyProfiles,
    lockGuitar: args.lockGuitar,
    preserveHarmony: args.preserveHarmony,
    motifBars: args.motifBars?.length ? args.motifBars : undefined,
    expectedSha256: args.expectedSha,
    title: args.title,
    stem: args.stem,
    seed: args.seed,
    bhlWorld: args.bhlWorld as BhlWorldId | undefined,
    exchangeBars: args.exchangeBars,
    displaceBars: args.displaceBars,
    displaceTailBars: args.displaceTailBars,
    phraseAccentBars: args.phraseAccentBars,
  });

  console.log(
    JSON.stringify(
      {
        sourcePath: result.sourcePath,
        sourceSha256: result.sourceSha256,
        barCount: result.barCount,
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

  if (result.validation.length > 0 || !result.motifOk) {
    process.exit(1);
  }
}

main();
