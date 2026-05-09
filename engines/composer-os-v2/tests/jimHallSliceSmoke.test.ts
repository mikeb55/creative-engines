/**
 * Smoke — Jim Hall interval-first guitar songwriter slice (golden path + diagnostics).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runJimHallSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50201, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'jim_hall',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.jimHallDiagnostics;
  const receipt = md?.jimHallSliceReceipt ?? '';
  const eff = md?.jimHallEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'jim_hall' &&
      diag?.songwriterId === 'jim_hall' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Jim Hall (interval-first guitar slice)'),
    name: 'Jim Hall slice: golden path + interval-first diagnostics receipt',
  });

  return out;
}
