/**
 * Smoke — Barry Harris bebop / sixth–diminished songwriter slice (chord vocabulary + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runBarryHarrisSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50201, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'barry_harris',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.barryHarrisDiagnostics;
  const receipt = md?.barryHarrisSliceReceipt ?? '';
  const eff = md?.barryHarrisEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'barry_harris' &&
      diag?.songwriterId === 'barry_harris' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Barry Harris (bebop / sixth–dim slice)'),
    name: 'Barry Harris slice: golden path + bebop/sixth–dim diagnostics receipt',
  });

  return out;
}
