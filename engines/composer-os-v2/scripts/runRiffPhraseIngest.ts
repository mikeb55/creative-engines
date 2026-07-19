/**
 * CLI: Phase-1 riff phrase GPX/GP5 ingest -> derived/phrases.jsonl + audit.csv
 *
 * Examples:
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runRiffPhraseIngest.ts --categories sax_inspired,diminished_lines,jazz_rock
 *   npm --prefix engines/composer-os-v2 run ingest:riff-phrases -- --categories sax_inspired,diminished_lines,jazz_rock
 *
 * Ingest-only: does not import melody-path modules.
 */

import {
  parseCategoryListArg,
  runRiffPhraseIngest,
} from '../core/riff-generator/riffPhraseLibraryIngest';

function argValue(flag: string): string | undefined {
  const argv = process.argv.slice(2);
  const eq = argv.find((a) => a.startsWith(flag + '='));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith('-')) return argv[i + 1];
  return undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

function main(): void {
  const categories = parseCategoryListArg(argValue('--categories'));
  const dryRun = hasFlag('--dry-run');
  const result = runRiffPhraseIngest({ categories, dryRun });

  const byCat = new Map<string, number>();
  for (const p of result.phrases) {
    byCat.set(p.category, (byCat.get(p.category) ?? 0) + 1);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        categories: categories ?? 'ALL',
        filesScanned: result.filesScanned,
        filesOk: result.filesOk,
        filesFail: result.filesFail,
        phrasesValid: result.phrasesValid,
        phrasesInvalid: result.phrasesInvalid,
        phrasesByCategory: Object.fromEntries(byCat),
        phrasesPath: result.phrasesPath,
        auditPath: result.auditPath,
      },
      null,
      2
    )
  );

  if (result.filesFail > 0 || result.phrasesInvalid > 0) {
    process.exitCode = 1;
  }
}

main();