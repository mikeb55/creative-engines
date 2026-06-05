/**
 * Smoke — Allan Holdsworth scale-derived fusion songwriter slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  countMajorTwoFiveOneChains,
  minHoldsworthSectionSpan,
  scaleDerivedSurfaceRate,
} from '../core/song-mode/holdsworthScaleSlice';
import { inferTonicPitchClassFromBar1 } from '../core/song-mode/brianWilsonPetSoundsSlice';

export function runHoldsworthScaleSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(96001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'allan_holdsworth',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.holdsworthDiagnostics;
  const receipt = md?.holdsworthSliceReceipt ?? '';
  const eff = md?.holdsworthEffectiveHarmonyBars;
  const devices = md?.holdsworthDeviceReceipts ?? [];
  const plan = md?.holdsworthScalePlan;
  const params = md?.holdsworthSliceParams;
  const tonicPc = r.context ? (inferTonicPitchClassFromBar1(r.context) ?? 4) : 4;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'allan_holdsworth' &&
      diag?.songwriterId === 'allan_holdsworth' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Allan Holdsworth (scale-derived fusion slice)') &&
      devices.some((d) => d.startsWith('AH:')),
    name: 'Holdsworth slice: golden path + scale-derived diagnostics receipt',
  });

  out.push({
    ok: (params?.scaleMembershipPriority ?? 0) >= 0.88 && devices.some((d) => d.startsWith('AH:scale_membership@')),
    name: 'Holdsworth slice: scaleMembershipPriority fires (AH:scale_membership receipts)',
  });

  out.push({
    ok:
      (params?.scaleFamilyPersistence ?? 0) >= 0.78 &&
      devices.some((d) => d.startsWith('AH:scale_hold@')),
    name: 'Holdsworth slice: scaleFamilyPersistence active (AH:scale_hold receipts)',
  });

  out.push({
    ok: countMajorTwoFiveOneChains(eff ?? [], tonicPc) === 0,
    name: 'Holdsworth slice: no ii–V–I closure chains',
  });

  out.push({
    ok: scaleDerivedSurfaceRate(eff ?? []) >= 0.55 && (diag?.scaleDerivedTouches ?? 0) >= 4,
    name: 'Holdsworth slice: scale-derived chord surface present',
  });

  out.push({
    ok: minHoldsworthSectionSpan(plan) >= 2,
    name: 'Holdsworth slice: scale-family sections span at least 2 bars',
  });

  out.push({
    ok:
      devices.some((d) => d.startsWith('AH:interval_subset@')) ||
      devices.some((d) => d.startsWith('AH:chromatic_vl@')),
    name: 'Holdsworth slice: interval-subset / chromatic VL receipts present',
  });

  return out;
}
