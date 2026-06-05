/**
 * Smoke — Bill Holman chart-first linear counterpoint songwriter slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runBillHolmanSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(76001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'bill_holman',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.billHolmanDiagnostics;
  const receipt = md?.billHolmanSliceReceipt ?? '';
  const eff = md?.billHolmanEffectiveHarmonyBars;
  const devices = md?.billHolmanDeviceReceipts ?? [];

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'bill_holman' &&
      diag?.songwriterId === 'bill_holman' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Holman (slice): chart-first linear counterpoint') &&
      devices.some((d) => d.startsWith('bh:')),
    name: 'Bill Holman slice: golden path + chart-first linear diagnostics receipt',
  });

  return out;
}
