/**
 * Smoke — Beatles songwriter slice (golden path + Merseybeat-era harmony diagnostics).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runBeatlesSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(91501, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'beatles',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.beatlesDiagnostics;
  const receipt = md?.beatlesSliceReceipt ?? '';
  const eff = md?.beatlesEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'beatles' &&
      diag?.songwriterId === 'beatles' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Beatles (slice):'),
    name: 'Beatles slice: golden path + harmony diagnostics receipt',
  });

  return out;
}
