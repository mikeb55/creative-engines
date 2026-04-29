/**
 * Smoke — Wayne Shorter post-bop songwriter slice (chord vocabulary + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runWayneShorterSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50200, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'wayne_shorter',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.wayneShorterDiagnostics;
  const receipt = md?.wayneShorterSliceReceipt ?? '';
  const eff = md?.wayneShorterEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'wayne_shorter' &&
      diag?.songwriterId === 'wayne_shorter' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Wayne Shorter (post-bop slice)'),
    name: 'Wayne Shorter slice: golden path + post-bop diagnostics receipt',
  });

  return out;
}
