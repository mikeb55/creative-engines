/**
 * Smoke — Debussy impressionist songwriter slice (golden path + harmony diagnostics).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runDebussySliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(91502, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'debussy',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.debussyDiagnostics;
  const receipt = md?.debussySliceReceipt ?? '';
  const eff = md?.debussyEffectiveHarmonyBars;
  const fp = md?.debussyFingerprintReceipts;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'debussy' &&
      diag?.songwriterId === 'debussy' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Debussy (impressionist slice):') &&
      receipt.includes('formPeriod=') &&
      receipt.includes('orchTags=') &&
      receipt.includes('fpTags=') &&
      Array.isArray(fp) &&
      fp.length >= 4 &&
      (diag?.fingerprintReceipts?.length ?? 0) >= 4 &&
      (diag?.formReceipts?.length ?? 0) >= 4 &&
      (diag?.orchestrationReceipts?.length ?? 0) >= 7 &&
      typeof diag?.vocalColourOrchestral === 'boolean' &&
      !!diag?.programPeriod,
    name: 'Debussy slice: golden path + impressionist harmony diagnostics receipt',
  });

  return out;
}
