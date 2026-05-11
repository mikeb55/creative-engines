/**
 * Smoke — Count Basie swing/riff slice (golden path + diagnostics).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runBasieSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50231, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'count_basie',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.basieDiagnostics;
  const receipt = md?.basieSliceReceipt ?? '';
  const eff = md?.basieEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'count_basie' &&
      diag?.songwriterId === 'count_basie' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Count Basie'),
    name: 'Count Basie slice: golden path + swing diagnostics receipt',
  });

  return out;
}
