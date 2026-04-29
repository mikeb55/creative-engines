/**
 * Smoke — Thelonious Monk (angular / b9-dominant) songwriter slice (symbol-level harmony + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runTheloniousMonkSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(52901, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'thelonious_monk',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.theloniousMonkDiagnostics;
  const receipt = md?.theloniousMonkSliceReceipt ?? '';
  const eff = md?.theloniousMonkEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'thelonious_monk' &&
      diag?.songwriterId === 'thelonious_monk' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Thelonious Monk (angular harmony slice)'),
    name: 'Thelonious Monk slice: golden path + angular harmony diagnostics receipt',
  });

  return out;
}
