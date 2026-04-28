/**
 * Smoke — Sonic Youth dual-guitar / noise-harmony songwriter slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

function deviceFamiliesFromSyReceipts(receipts: string[] | undefined): Set<string> {
  const s = new Set<string>();
  for (const r of receipts ?? []) {
    const m = /^sy:([^@]+)@/.exec(r);
    if (m?.[1]) s.add(m[1]);
  }
  return s;
}

export function runSonicYouthSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50301, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'sonic_youth',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.sonicYouthDiagnostics;
  const receipt = md?.sonicYouthSliceReceipt ?? '';
  const eff = md?.sonicYouthEffectiveHarmonyBars;
  const devReceipts = md?.sonicYouthDeviceReceipts;
  const families = deviceFamiliesFromSyReceipts(devReceipts);

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'sonic_youth' &&
      diag?.songwriterId === 'sonic_youth' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Sonic Youth') &&
      families.size >= 3,
    name: 'Sonic Youth slice: golden path + device receipts (sy:*)',
  });

  return out;
}
