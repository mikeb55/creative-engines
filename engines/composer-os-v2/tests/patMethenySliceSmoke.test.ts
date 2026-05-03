/**
 * Smoke — Pat Metheny (ECM / PMG) songwriter slice (chord vocabulary + golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

function deviceFamiliesFromPmReceipts(receipts: string[] | undefined): Set<string> {
  const s = new Set<string>();
  for (const r of receipts ?? []) {
    const m = /^pm:([^@]+)@/.exec(r);
    if (m?.[1]) s.add(m[1]);
  }
  return s;
}

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
  const devReceipts = md?.patMethenyDeviceReceipts;
  const pmFamilies = deviceFamiliesFromPmReceipts(devReceipts);

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'pat_metheny' &&
      diag?.songwriterId === 'pat_metheny' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Pat Metheny (ECM') &&
      pmFamilies.size >= 2,
    name: 'Pat Metheny slice: golden path + ECM/PMG diagnostics receipt',
  });

  return out;
}
