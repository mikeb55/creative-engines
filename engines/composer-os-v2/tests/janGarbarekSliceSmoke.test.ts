/**
 * Smoke — Jan Garbarek ritual modal ECM songwriter slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runJanGarbarekSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(75001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'jan_garbarek',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.janGarbarekDiagnostics;
  const receipt = md?.janGarbarekSliceReceipt ?? '';
  const eff = md?.janGarbarekEffectiveHarmonyBars;
  const devices = md?.janGarbarekDeviceReceipts ?? [];

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'jan_garbarek' &&
      diag?.songwriterId === 'jan_garbarek' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Jan Garbarek (ritual modal ECM slice)') &&
      devices.some((d) => d.startsWith('jg:')),
    name: 'Jan Garbarek slice: golden path + ritual modal ECM diagnostics receipt',
  });

  return out;
}
