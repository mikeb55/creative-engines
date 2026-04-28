/**
 * Pat Metheny slice — eligibility counts per seed + optional bar-by-bar diagnostics (seed 50200).
 *
 * Usage (from repo root):
 *   npm run probe:pat-metheny-eligibility
 */

import * as fs from 'fs';
import * as path from 'path';
import { runAppGeneration } from '../app-api/composerOsAppGeneration';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { mapAppStyleStackToEngine } from '../app-api/mapStyleStack';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import {
  formatPatMethenyEligibilityDiagnostics,
  type PatMethenyEligibilityStats,
} from '../core/song-mode/patMethenySlice';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SEEDS = [50200, 77123, 90444] as const;
const TARGET_D2 = 6;
const TARGET_D4 = 8;
const TARGET_D5 = 6;
const DIAG_SEED = 50200;

function buildRequest(seed: number): GenerateRequest {
  return {
    presetId: 'song_mode',
    styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
    seed,
    title: `Pat Metheny eligibility probe ${seed}`,
    totalBars: 32,
    longFormEnabled: true,
    styleProfile: 'STYLE_ECM',
    creativeControlLevel: 'stable',
    blendStrength: 'medium',
    primarySongwriterStyle: 'pat_metheny',
  };
}

function parseManifest(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function main(): void {
  const outDir = path.join(REPO_ROOT, 'output', 'pat-metheny-eligibility-probe');
  fs.mkdirSync(outDir, { recursive: true });

  let allOk = true;

  for (const seed of SEEDS) {
    const req = buildRequest(seed);
    const res = runAppGeneration(req, outDir);
    const manifestPath = res.manifestPath;
    const manifestRaw =
      manifestPath && fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf-8') : '';
    const j = parseManifest(manifestRaw ?? '');
    const stats = j?.patMethenyEligibilityStats as PatMethenyEligibilityStats | undefined;
    const bars = j?.parsedChordBarsSnapshot as string[] | undefined;
    const manifestSeed = typeof j?.seed === 'number' && Number.isFinite(j.seed) ? j.seed : seed;

    console.log(`\n=== seed ${seed} ===`);
    console.log('success:', res.success, res.error ?? '');
    console.log('patMethenyEligibilityStats:', JSON.stringify(stats));
    if (!stats) {
      allOk = false;
      continue;
    }
    const ok =
      stats.d2EligibleBars >= TARGET_D2 &&
      stats.d4EligibleBars >= TARGET_D4 &&
      stats.d5EligibleBars >= TARGET_D5;
    console.log(
      `targets: d2>=${TARGET_D2} d4>=${TARGET_D4} d5>=${TARGET_D5} -> ${ok ? 'PASS' : 'FAIL'}`
    );
    if (!ok) allOk = false;

    if (seed === DIAG_SEED && bars && bars.length === 32) {
      const gp = runGoldenPath(manifestSeed, {
        presetId: 'guitar_bass_duo',
        harmonyMode: 'custom_locked',
        lockedHarmonyBarsRaw: bars,
        parsedChordBars: bars,
        chordProgressionText: bars.join('|'),
        songModeHookFirstIdentity: true,
        styleProfile: 'STYLE_ECM',
        primarySongwriterStyle: 'pat_metheny',
        totalBars: 32,
        longFormEnabled: true,
        blendStrength: 'medium',
        creativeControlLevel: 'stable',
        styleStack: mapAppStyleStackToEngine({ primary: 'barry_harris', weights: { primary: 1 } }),
      });
      const text = formatPatMethenyEligibilityDiagnostics(gp.context);
      const diagPath = path.join(outDir, `pat-metheny-diagnostics-${DIAG_SEED}.txt`);
      const hdr =
        `requestedSeed=${seed} manifestEchoSeed=${manifestSeed} goldenPathContextSeed=${gp.context.seed}` +
        (gp.context.seed !== manifestSeed
          ? ' (runGoldenPath candidate sweep — modal reservations use the winning context.seed)\n'
          : '\n');
      fs.writeFileSync(diagPath, hdr + text, 'utf-8');
      console.log(`Wrote bar diagnostics: ${diagPath}`);
    }
  }

  console.log(`\nOverall eligibility targets met: ${allOk}`);
  if (!allOk) process.exitCode = 1;
}

main();
