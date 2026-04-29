/**
 * Smoke — Kate Bush (tonal-modal / drone-aware texture) songwriter slice (symbol-level harmony + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runKateBushSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(51847, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'kate_bush',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.kateBushDiagnostics;
  const receipt = md?.kateBushSliceReceipt ?? '';
  const eff = md?.kateBushEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'kate_bush' &&
      diag?.songwriterId === 'kate_bush' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Kate Bush (modal texture slice)'),
    name: 'Kate Bush slice: golden path + modal texture diagnostics receipt',
  });

  return out;
}
