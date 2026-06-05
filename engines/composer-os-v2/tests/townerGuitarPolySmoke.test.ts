/**
 * Smoke — Ralph Towner guitar-born polyphonic ECM songwriter slice.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import {
  countMajorTwoFiveOneChains,
  maxTownerPhraseArcLength,
  minTownerSectionSpan,
} from '../core/song-mode/ralphTownerSlice';
import { inferTonicPitchClassFromBar1 } from '../core/song-mode/brianWilsonPetSoundsSlice';

export function runTownerGuitarPolySmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r = runGoldenPathOnce(98001, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'ralph_towner',
  });

  const md = r.context?.generationMetadata;
  const diag = md?.ralphTownerDiagnostics;
  const receipt = md?.ralphTownerSliceReceipt ?? '';
  const eff = md?.ralphTownerEffectiveHarmonyBars;
  const devices = md?.ralphTownerDeviceReceipts ?? [];
  const plan = md?.townerPolyphonicPlan;
  const params = md?.ralphTownerSliceParams;
  const tonicPc = r.context ? (inferTonicPitchClassFromBar1(r.context) ?? 4) : 4;

  out.push({
    ok:
      r.success &&
      md?.songwriterStyleId === 'ralph_towner' &&
      diag?.songwriterId === 'ralph_towner' &&
      (diag?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff) &&
      eff.length === 32 &&
      receipt.includes('Ralph Towner (guitar-born polyphonic ECM slice)') &&
      devices.some((d) => d.startsWith('rt:')),
    name: 'Ralph Towner slice: golden path + guitar polyphony ECM diagnostics receipt',
  });

  out.push({
    ok: (params?.guitarBornVoicing ?? 0) >= 0.7 && devices.some((d) => d.startsWith('rt:guitar_voicing@')),
    name: 'Ralph Towner slice: guitarBornVoicing fires (rt:guitar_voicing receipts)',
  });

  out.push({
    ok:
      (params?.melodyFromVoicing ?? 0) >= 0.65 &&
      devices.some((d) => d.startsWith('rt:melody_from_voicing@')),
    name: 'Ralph Towner slice: melodyFromVoicing active (rt:melody_from_voicing receipts)',
  });

  out.push({
    ok: countMajorTwoFiveOneChains(eff ?? [], tonicPc) === 0,
    name: 'Ralph Towner slice: no ii–V–I closure chains',
  });

  out.push({
    ok:
      (diag?.openStringTouches ?? 0) >= 4 &&
      devices.some((d) => d.startsWith('rt:open_string@')),
    name: 'Ralph Towner slice: open-string resonance parameters present',
  });

  out.push({
    ok: minTownerSectionSpan(plan) >= 6,
    name: 'Ralph Towner slice: slow harmonic field sections span at least 6 bars',
  });

  out.push({
    ok: maxTownerPhraseArcLength(plan) >= 4 && maxTownerPhraseArcLength(plan) <= 8,
    name: 'Ralph Towner slice: phrase arcs 4–8 bars',
  });

  return out;
}
