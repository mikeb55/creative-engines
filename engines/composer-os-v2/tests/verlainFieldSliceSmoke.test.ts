/**
 * Smoke — Tom Verlaine suspended modal field art-rock songwriter slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  countMajorTwoFiveOneChains,
  minVerlaineSectionSpan,
  slashChordRate,
} from '../core/song-mode/verlainFieldSlice';
import { inferTonicPitchClassFromBar1 } from '../core/song-mode/brianWilsonPetSoundsSlice';

export function runVerlainFieldSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(95001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'verlaine',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.verlaineDiagnostics;
  const receipt = md?.verlaineSliceReceipt ?? '';
  const eff = md?.verlaineEffectiveHarmonyBars;
  const devices = md?.verlaineDeviceReceipts ?? [];
  const plan = md?.verlaineFieldPlan;
  const params = md?.verlaineSliceParams;
  const tonicPc = r.context ? (inferTonicPitchClassFromBar1(r.context) ?? 4) : 4;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'verlaine' &&
      diag?.songwriterId === 'verlaine' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Tom Verlaine (suspended modal field slice)') &&
      devices.some((d) => d.startsWith('tv:')),
    name: 'Verlaine slice: golden path + suspended field diagnostics receipt',
  });

  out.push({
    ok: (params?.modalFieldPersistence ?? 0) >= 0.78 && devices.some((d) => d.startsWith('tv:modal_field@')),
    name: 'Verlaine slice: modalFieldPersistence fires (tv:modal_field receipts)',
  });

  out.push({
    ok:
      (params?.bassDisplacementRate ?? 0) >= 0.68 &&
      devices.some((d) => d.startsWith('tv:bass_displace@')),
    name: 'Verlaine slice: bassDisplacementRate active (tv:bass_displace receipts)',
  });

  out.push({
    ok: countMajorTwoFiveOneChains(eff ?? [], tonicPc) === 0,
    name: 'Verlaine slice: no ii–V–I closure chains',
  });

  out.push({
    ok: slashChordRate(eff ?? []) >= 0.25 && (diag?.bassDisplacementTouches ?? 0) >= 4,
    name: 'Verlaine slice: slash/bass displacement surface present',
  });

  out.push({
    ok: minVerlaineSectionSpan(plan) >= 4,
    name: 'Verlaine slice: modal field sections span at least 4 bars',
  });

  out.push({
    ok:
      devices.some((d) => d.startsWith('tv:suspended_surface@')) ||
      devices.some((d) => d.startsWith('tv:extension_hold@')),
    name: 'Verlaine slice: suspended/extension retention receipts present',
  });

  return out;
}
