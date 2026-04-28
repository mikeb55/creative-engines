/**
 * Smoke — Radiohead (OK Computer–era) songwriter slice (chord vocabulary + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runRadioheadSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50100, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'radiohead',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.radioheadDiagnostics;
  const receipt = md?.radioheadSliceReceipt ?? '';
  const eff = md?.radioheadEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'radiohead' &&
      diag?.songwriterId === 'radiohead' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Radiohead (OK Computer'),
    name: 'Radiohead slice: golden path + OK Computer–era diagnostics receipt',
  });

  return out;
}
