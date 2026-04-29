/**
 * Smoke — Bacharach theatre-pop songwriter slice (symbol-level harmony + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runBacharachSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50205, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'bacharach',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.bacharachDiagnostics;
  const receipt = md?.bacharachSliceReceipt ?? '';
  const eff = md?.bacharachEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'bacharach' &&
      diag?.songwriterId === 'bacharach' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Bacharach (theatre-pop harmony slice)'),
    name: 'Bacharach slice: golden path + theatre-pop harmony diagnostics receipt',
  });

  return out;
}
