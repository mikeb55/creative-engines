/**
 * Smoke — Billy Strayhorn chromatic song-form slice (golden path).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runBillyStrayhornSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(50202, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'billy_strayhorn',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.billyStrayhornDiagnostics;
  const receipt = md?.billyStrayhornSliceReceipt ?? '';
  const eff = md?.billyStrayhornEffectiveHarmonyBars;
  const devices = md?.billyStrayhornDeviceReceipts ?? [];
  const hasBsReceipt = devices.some((d) => d.startsWith('bs:'));

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'billy_strayhorn' &&
      diag?.songwriterId === 'billy_strayhorn' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Billy Strayhorn (chromatic song slice)') &&
      hasBsReceipt,
    name: 'Billy Strayhorn slice: golden path + chromatic song diagnostics receipt',
  });

  return out;
}
