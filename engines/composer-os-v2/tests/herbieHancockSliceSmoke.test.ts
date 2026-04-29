/**
 * Smoke — Herbie Hancock (Blue Note post-bop) songwriter slice (symbol-level harmony + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runHerbieHancockSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50214, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'herbie_hancock',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.herbieHancockDiagnostics;
  const receipt = md?.herbieHancockSliceReceipt ?? '';
  const eff = md?.herbieHancockEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'herbie_hancock' &&
      diag?.songwriterId === 'herbie_hancock' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Herbie Hancock (Blue Note harmony slice)'),
    name: 'Herbie Hancock slice: golden path + Blue Note harmony diagnostics receipt',
  });

  return out;
}
