/**
 * Smoke — Kenny Wheeler lyrical ECM / chamber-jazz songwriter slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runWheelerLyricSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(88123, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'kenny_wheeler',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.kennyWheelerDiagnostics;
  const receipt = md?.kennyWheelerSliceReceipt ?? '';
  const eff = md?.kennyWheelerEffectiveHarmonyBars;
  const devices = md?.kennyWheelerDeviceReceipts ?? [];

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'kenny_wheeler' &&
      diag?.songwriterId === 'kenny_wheeler' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Kenny Wheeler (lyrical ECM slice)') &&
      devices.some((d) => d.startsWith('kw:')),
    name: 'Kenny Wheeler slice: golden path + lyrical ECM diagnostics receipt',
  });

  return out;
}
