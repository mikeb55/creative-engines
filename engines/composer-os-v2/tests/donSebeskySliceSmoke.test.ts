/**
 * Smoke — Don Sebesky CTI production-orchestra slice (golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runDonSebeskySliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50303, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'don_sebesky',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.donSebeskyDiagnostics;
  const receipt = md?.donSebeskySliceReceipt ?? '';
  const eff = md?.donSebeskyEffectiveHarmonyBars;
  const devices = md?.donSebeskyDeviceReceipts ?? [];
  const hasDsReceipt = devices.some((d) => d.startsWith('ds:'));
  const liftCount = md?.donSebeskyLiftEventCount ?? 0;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'don_sebesky' &&
      diag?.songwriterId === 'don_sebesky' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Don Sebesky (CTI production slice)') &&
      hasDsReceipt &&
      liftCount >= 2,
    name: 'Don Sebesky slice: golden path + CTI production diagnostics receipt',
  });

  return out;
}
