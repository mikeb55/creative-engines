/**
 * Stage 5.2 - standing vault re-snap regression (seeds 50021, 50213).
 *
 * Final-pass re-snap is a safety net: correctionsNeeded > 0 signals an upstream guard gap.
 */

import assert from 'assert';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';

const STANDING_SEEDS = [50021, 50213] as const;

function assertZeroFinalResnapCorrections(seed: number, hookOn: boolean): void {
  const label = `seed ${seed} ${hookOn ? 'hook-on' : 'hook-off'}`;
  const r = runGoldenPath(seed, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    songModeHookFirstIdentity: hookOn,
  });
  assert.strictEqual(r.success, true, label);
  const reSnap = r.context.generationMetadata?.duoVaultMotifSurvivalTelemetry?.reSnap;
  assert.ok(reSnap, `${label}: missing reSnap telemetry`);
  assert.strictEqual(
    reSnap.correctionsNeeded,
    0,
    `${label}: re-snap corrected ${reSnap.correctionsNeeded} receipt/declined notes - upstream guard gap` +
      ` (byBar=${JSON.stringify(reSnap.byBar.filter((b) => b.correctionsNeeded > 0))})`,
  );
}

export function runSongModeVaultReSnapStandingTests(): void {
  for (const seed of STANDING_SEEDS) {
    assertZeroFinalResnapCorrections(seed, true);
    assertZeroFinalResnapCorrections(seed, false);
  }
  console.log(
    `songModeVaultReSnapStanding: PASS zero final re-snap corrections on seeds ${STANDING_SEEDS.join(', ')} (hook-on + hook-off)`,
  );
}

if (require.main === module) {
  runSongModeVaultReSnapStandingTests();
}