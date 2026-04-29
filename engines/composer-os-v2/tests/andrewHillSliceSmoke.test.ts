/**
 * Smoke — Andrew Hill (angular non-functional) songwriter slice (symbol-level harmony + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runAndrewHillSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(53081, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'andrew_hill',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.andrewHillDiagnostics;
  const receipt = md?.andrewHillSliceReceipt ?? '';
  const eff = md?.andrewHillEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'andrew_hill' &&
      diag?.songwriterId === 'andrew_hill' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Andrew Hill (angular non-functional slice)'),
    name: 'Andrew Hill slice: golden path + angular non-functional diagnostics receipt',
  });

  return out;
}
