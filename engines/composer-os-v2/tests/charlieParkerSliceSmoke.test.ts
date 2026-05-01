/**
 * Smoke — Charlie Parker (bebop ii–V–I) songwriter slice (symbol-level harmony + golden path).
 *
 * Uses **32-bar** custom_locked progressions so `songModeHookFirstIdentity` matches bar-25 hook validation (same pattern as other songwriter slice smokes).
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';

/** Simplified B♭ blues — one 8-bar cycle (I → IV → I turnaround pocket); ×4 → 32 bars. */
const BLUES_BB_8 = ['Bb7', 'Eb7', 'Bb7', 'Bb7', 'Eb7', 'Eb7', 'Bb7', 'Bb7'] as const;

const BLUES_BB_32: string[] = [
  ...BLUES_BB_8,
  ...BLUES_BB_8,
  ...BLUES_BB_8,
  ...BLUES_BB_8,
];

export function runCharlieParkerSliceSmokeTests(): { name: string; ok: boolean }[] {
  const out: { name: string; ok: boolean }[] = [];

  const iiViOneCycle = ['Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'];
  const iiVi32 = [...iiViOneCycle, ...iiViOneCycle, ...iiViOneCycle, ...iiViOneCycle];
  const iiViText = iiVi32.join('|');

  const r1 = runGoldenPathOnce(54102, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'charlie_parker',
    harmonyMode: 'custom_locked',
    chordProgressionText: iiViText,
    parsedChordBars: [...iiVi32],
    lockedHarmonyBarsRaw: [...iiVi32],
  });

  const md1 = r1.context?.generationMetadata;
  const diag1 = md1?.charlieParkerDiagnostics;
  const eff1 = md1?.charlieParkerEffectiveHarmonyBars;
  const receipt1 = md1?.charlieParkerSliceReceipt ?? '';

  out.push({
    ok:
      r1.success &&
      md1?.songwriterStyleId === 'charlie_parker' &&
      diag1?.songwriterId === 'charlie_parker' &&
      (diag1?.barsConsidered ?? 0) >= 32 &&
      Array.isArray(eff1) &&
      eff1.length === 32 &&
      receipt1.includes('Charlie Parker (bebop ii-V-I slice)'),
    name: 'Charlie Parker slice: ii–V–I in C (32 bars tiled, custom_locked) + diagnostics receipt',
  });

  const bluesText = BLUES_BB_32.join('|');

  const r2 = runGoldenPathOnce(54103, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'charlie_parker',
    harmonyMode: 'custom_locked',
    chordProgressionText: bluesText,
    parsedChordBars: [...BLUES_BB_32],
    lockedHarmonyBarsRaw: [...BLUES_BB_32],
  });

  const md2 = r2.context?.generationMetadata;
  const eff2 = md2?.charlieParkerEffectiveHarmonyBars;

  out.push({
    ok:
      r2.success &&
      md2?.songwriterStyleId === 'charlie_parker' &&
      Array.isArray(eff2) &&
      eff2.length === 32,
    name: 'Charlie Parker slice: B♭ blues (32 bars, custom_locked)',
  });

  const rhythmOne16 = [
    'Bbmaj7',
    'Bbmaj7',
    'Cm7',
    'Cm7',
    'Cm7',
    'F7',
    'Bbmaj7',
    'Bbmaj7',
    'Dm7',
    'G7',
    'Cm7',
    'F7',
    'Fm7',
    'Bb7',
    'Ebmaj7',
    'Ab7',
  ];
  const rhythmBb32 = [...rhythmOne16, ...rhythmOne16];
  const rhythmText = rhythmBb32.join('|');

  const r3 = runGoldenPathOnce(54104, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: 'charlie_parker',
    harmonyMode: 'custom_locked',
    chordProgressionText: rhythmText,
    parsedChordBars: [...rhythmBb32],
    lockedHarmonyBarsRaw: [...rhythmBb32],
  });

  const md3 = r3.context?.generationMetadata;
  const eff3 = md3?.charlieParkerEffectiveHarmonyBars;

  out.push({
    ok:
      r3.success &&
      md3?.songwriterStyleId === 'charlie_parker' &&
      Array.isArray(eff3) &&
      eff3.length === 32,
    name: 'Charlie Parker slice: rhythm changes in B♭ (32 bars = AABA fragment ×2, custom_locked)',
  });

  return out;
}
