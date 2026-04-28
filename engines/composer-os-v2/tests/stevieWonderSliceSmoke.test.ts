/**
 * Smoke — Stevie Wonder (1972–76) songwriter slice (chord vocabulary + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runStevieWonderSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50100, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'stevie_wonder',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.stevieWonderDiagnostics;
  const receipt = md?.stevieWonderSliceReceipt ?? '';
  const eff = md?.stevieWonderEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'stevie_wonder' &&
      diag?.songwriterId === 'stevie_wonder' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Stevie Wonder (1972–76 slice)'),
    name: 'Stevie Wonder slice: golden path + classic-period diagnostics receipt',
  });

  return out;
}
