/**
 * Smoke — Thad Jones big-band extended common-practice slice (golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runThadJonesSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50201, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'thad_jones',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.thadJonesDiagnostics;
  const receipt = md?.thadJonesSliceReceipt ?? '';
  const eff = md?.thadJonesEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'thad_jones' &&
      diag?.songwriterId === 'thad_jones' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Thad Jones (big-band slice)'),
    name: 'Thad Jones slice: golden path + big-band diagnostics receipt',
  });

  return out;
}
