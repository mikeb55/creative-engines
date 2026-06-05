/**
 * Smoke — Carla Bley formal irony ECM songwriter slice (`cbl:*`).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runCarlaBleySliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(77001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'carla_bley',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.carlaBleyDiagnostics;
  const receipt = md?.carlaBleySliceReceipt ?? '';
  const eff = md?.carlaBleyEffectiveHarmonyBars;
  const devices = md?.carlaBleyDeviceReceipts ?? [];

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'carla_bley' &&
      diag?.songwriterId === 'carla_bley' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Carla Bley (formal irony ECM slice)') &&
      devices.some((d) => d.startsWith('cbl:')),
    name: 'Carla Bley slice: golden path + formal irony diagnostics receipt',
  });

  return out;
}
