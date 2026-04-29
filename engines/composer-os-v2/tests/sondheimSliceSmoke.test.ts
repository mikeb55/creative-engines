/**
 * Smoke — Stephen Sondheim (dramatic musical theatre tonality) songwriter slice (symbol-level harmony + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runSondheimSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50229, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'stephen_sondheim',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.sondheimDiagnostics;
  const receipt = md?.sondheimSliceReceipt ?? '';
  const eff = md?.sondheimEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'stephen_sondheim' &&
      diag?.songwriterId === 'stephen_sondheim' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Stephen Sondheim (dramatic tonality slice)'),
    name: 'Sondheim slice: golden path + dramatic tonality diagnostics receipt',
  });

  return out;
}
