/**
 * Smoke — ECM Chamber (Song Mode primary) songwriter slice (symbol-level harmony + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runEcmChamberSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50211, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'ecm_chamber',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.ecmChamberDiagnostics;
  const receipt = md?.ecmChamberSliceReceipt ?? '';
  const eff = md?.ecmChamberEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'ecm_chamber' &&
      diag?.songwriterId === 'ecm_chamber' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('ECM Chamber (modal sparse harmony slice)'),
    name: 'ECM Chamber slice: golden path + modal sparse harmony diagnostics receipt',
  });

  return out;
}
