/**
 * Smoke — Fripp / King Crimson songwriter slice (asymmetric meter map + effective harmony row).
 *
 * Uses an **8/8** (two×4 eighths) custom additive cycle so duo **`finalizeAndSealDuoScoreBarMath`** stays stable with Wyble/voice-2 — uniform **7/8** maps from **`frame_by_frame`** remain valid for experiments/API but can trip odd-meter bar math on this guitar–bass path until quantiser parity improves.
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import type { AsymmetricRhythmRequest } from '../core/rhythm/asymmetricPresets';

/** Four quarter-note beats per bar via additive eighth grid ([4+4]), MusicXML meter **8/8**. */
const SMOKE_DUO_STABLE_CYCLE: AsymmetricRhythmRequest = {
  custom: {
    pulsesPerCycle: 8,
    grouping: [4, 4],
    accentMap: ['strong', 'halfStrong'],
    pulseUnit: 'eighth',
  },
};

export function runFrippKingCrimsonSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const r1 = runGoldenPathOnce(77102, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'fripp_king_crimson',
    harmonyMode: 'builtin',
    asymmetricRhythm: SMOKE_DUO_STABLE_CYCLE,
  });

  const md1 = r1.context?.generationMetadata;
  const eff1 = md1?.frippKingCrimsonEffectiveHarmonyBars;
  const receipt1 = md1?.frippKingCrimsonSliceReceipt ?? '';
  const diag1 = md1?.frippKingCrimsonDiagnostics;
  const bm = md1?.barMeterMap ?? {};
  const bar1 = bm[1];

  out.push({
    ok:
      r1.success &&
      md1?.songwriterStyleId === 'fripp_king_crimson' &&
      diag1?.songwriterId === 'fripp_king_crimson' &&
      Array.isArray(eff1) &&
      eff1.length === 32 &&
      receipt1.includes('fk:preset@custom:8p') &&
      receipt1.includes('fk:bars@32') &&
      bar1?.numerator === 8 &&
      bar1?.denominator === 8,
    name: 'Fripp/KC slice: builtin duo + custom 8/8 cycle, effective bars (32)',
  });

  const r2 = runGoldenPathOnce(77103, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'fripp_king_crimson',
    harmonyMode: 'builtin',
    asymmetricRhythm: SMOKE_DUO_STABLE_CYCLE,
    frippPolymeterSecondaryPreset: 'red',
  });

  const md2 = r2.context?.generationMetadata;
  const poly = md2?.frippKingCrimsonPolymeterReceipt;

  out.push({
    ok:
      r2.success &&
      md2?.songwriterStyleId === 'fripp_king_crimson' &&
      (md2?.frippKingCrimsonDiagnostics?.polymeterLcmSixteenths ?? 0) > 0 &&
      typeof poly === 'string' &&
      poly.length > 0,
    name: 'Fripp/KC slice: 8/8 primary + red polymeter receipt + LCM sixteenths',
  });

  return out;
}
