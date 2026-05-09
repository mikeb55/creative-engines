/**
 * Smoke — Steve Reich pitch-field process slice (golden path + diagnostics).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runSteveReichSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50211, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'steve_reich',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.steveReichDiagnostics;
  const receipt = md?.steveReichSliceReceipt ?? '';
  const eff = md?.steveReichEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'steve_reich' &&
      diag?.songwriterId === 'steve_reich' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Steve Reich (pitch-field process slice)'),
    name: 'Steve Reich slice: golden path + process diagnostics receipt',
  });

  return out;
}
