/**
 * Smoke — Pat Metheny (ECM / PMG) songwriter slice (chord vocabulary + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runPatMethenySliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50200, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'pat_metheny',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.patMethenyDiagnostics;
  const receipt = md?.patMethenySliceReceipt ?? '';
  const eff = md?.patMethenyEffectiveHarmonyBars;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'pat_metheny' &&
      diag?.songwriterId === 'pat_metheny' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Pat Metheny (ECM'),
    name: 'Pat Metheny slice: golden path + ECM/PMG diagnostics receipt',
  });

  return out;
}
