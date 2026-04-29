/**
 * Smoke — Donald Fagen jazz-rock songwriter slice (symbol-level harmony + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runDonaldFagenSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50208, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'donald_fagen',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.donaldFagenDiagnostics;
  const receipt = md?.donaldFagenSliceReceipt ?? '';
  const eff = md?.donaldFagenEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'donald_fagen' &&
      diag?.songwriterId === 'donald_fagen' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Donald Fagen (jazz-rock harmony slice)'),
    name: 'Donald Fagen slice: golden path + jazz-rock harmony diagnostics receipt',
  });

  return out;
}
