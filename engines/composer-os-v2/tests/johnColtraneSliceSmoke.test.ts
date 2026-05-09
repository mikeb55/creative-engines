/**
 * Smoke — John Coltrane (three-tonic cycle) songwriter slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runJohnColtraneSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(77201, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'john_coltrane',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.johnColtraneDiagnostics;
  const receipt = md?.johnColtraneSliceReceipt ?? '';
  const eff = md?.johnColtraneEffectiveHarmonyBars;
  const sp = diag?.sliceParameters;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'john_coltrane' &&
      diag?.songwriterId === 'john_coltrane' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('John Coltrane (three-tonic slice)') &&
      sp?.tritoneRate === 0.15 &&
      sp?.susBias === 0.5 &&
      sp?.chromaticMediantBias === 0.95 &&
      sp?.staticDominantBias === 0.1,
    name: 'John Coltrane slice: golden path + three-tonic diagnostics receipt',
  });

  return out;
}
