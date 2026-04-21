/**
 * Song Mode A/B inspection harness v1.
 * Runs compact deterministic A/B and prints one-line diagnostics per seed/arm.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import { buildSongModeReadableSummaryLine, renderSongModeAbTable, type SongModeAbRow } from './eval/readableEvalSummary';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function parseSeeds(argv: string[]): number[] {
  const idx = argv.findIndex((a) => a === '--seeds');
  if (idx >= 0 && argv[idx + 1]) {
    const parsed = argv[idx + 1]!
      .split(/[,\s]+/)
      .map((x) => parseInt(x, 10))
      .filter((n) => !Number.isNaN(n));
    if (parsed.length > 0) return parsed;
  }
  return [97000, 97001, 97002];
}

function outDirFromArgs(argv: string[]): string {
  const idx = argv.findIndex((a) => a === '--out');
  if (idx >= 0 && argv[idx + 1]) {
    const raw = argv[idx + 1]!;
    return path.isAbsolute(raw) ? raw : path.resolve(REPO_ROOT, raw);
  }
  return path.join(REPO_ROOT, 'output', 'songmode-ab-inspect');
}

function run(): void {
  const seeds = parseSeeds(process.argv);
  const outDir = outDirFromArgs(process.argv);
  const runsDir = path.join(outDir, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const rows: SongModeAbRow[] = [];

  const arms = [
    { id: 'A_bacharach', primarySongwriterStyle: 'bacharach' },
    { id: 'B_neutral', primarySongwriterStyle: 'carole_king' },
  ] as const;

  for (const seed of seeds) {
    for (const arm of arms) {
      const res = runAppGeneration(
        {
          presetId: 'song_mode',
          styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
          seed,
          totalBars: 32,
          longFormEnabled: true,
          styleProfile: 'STYLE_ECM',
          creativeControlLevel: 'stable',
          primarySongwriterStyle: arm.primarySongwriterStyle,
          title: `Song Mode A/B ${arm.id} ${seed}`,
        },
        runsDir
      );
      const manifest = (res.runManifest ?? {}) as Record<string, unknown>;
      rows.push({
        seed,
        arm: arm.id,
        summaryLine: buildSongModeReadableSummaryLine(manifest, `${arm.id}`),
      });
    }
  }

  const table = renderSongModeAbTable(rows);
  fs.writeFileSync(path.join(outDir, 'songmode-ab-inspect.txt'), table, 'utf-8');
  console.log(table);
  console.log(`Wrote: ${path.join(outDir, 'songmode-ab-inspect.txt')}`);
}

run();
