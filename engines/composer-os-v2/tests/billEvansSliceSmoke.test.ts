/**
 * Smoke — Bill Evans impressionist / modal jazz songwriter slice (chord vocabulary + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runBillEvansSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50203, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'bill_evans',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.billEvansDiagnostics;
  const receipt = md?.billEvansSliceReceipt ?? '';
  const eff = md?.billEvansEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'bill_evans' &&
      diag?.songwriterId === 'bill_evans' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Bill Evans (rootless / modal slice)'),
    name: 'Bill Evans slice: golden path + rootless/modal diagnostics receipt',
  });

  return out;
}
