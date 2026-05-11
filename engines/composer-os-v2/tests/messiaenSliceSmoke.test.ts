/**
 * Smoke — Olivier Messiaen limited-transposition / colour harmony slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

export function runMessiaenSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(59201, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'messiaen',
    messiaenPeriodMode: 'middle_messiaen',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.messiaenDiagnostics;
  const receipt = md?.messiaenSliceReceipt ?? '';
  const eff = md?.messiaenEffectiveHarmonyBars;
  const dev = md?.messiaenDeviceReceipts ?? [];

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'messiaen' &&
      diag?.songwriterId === 'messiaen' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      md?.colourTag != null &&
      md?.periodMode != null &&
      typeof md?.birdsongSpecies === 'string' &&
      dev.some((x) => x.startsWith('om:')) &&
      receipt.includes('Messiaen'),
    name: 'Messiaen slice: golden path + colour diagnostics + om receipts',
  });

  return out;
}
