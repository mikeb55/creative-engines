/**
 * Smoke — Antônio Carlos Jobim (bossa / Brazilian jazz harmony) songwriter slice (symbol-level harmony + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runJobimSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50213, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'antonio_carlos_jobim',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.jobimDiagnostics;
  const receipt = md?.jobimSliceReceipt ?? '';
  const eff = md?.jobimEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'antonio_carlos_jobim' &&
      diag?.songwriterId === 'antonio_carlos_jobim' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Jobim (bossa harmony slice)'),
    name: 'Jobim slice: golden path + bossa harmony diagnostics receipt',
  });

  return out;
}
