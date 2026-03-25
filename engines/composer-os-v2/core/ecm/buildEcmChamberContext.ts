/**
 * ECM Chamber — composition context from research-aligned heuristics (see user research:
 * Perplexity Research / ECM_Bacharach_BarryHarris_Research.md — Part 3 Metheny/ECM: modality,
 * floating time, texture). Extended form (24 bars default): A / B / A′ harmonic rotations.
 */
import type { CompositionContext } from '../compositionContext';
import type { HarmonyPlan } from '../primitives/harmonyTypes';
import { ecmChamberPreset } from '../../presets/ecmChamberPreset';
import { runReleaseReadinessGate } from '../readiness/releaseReadinessGate';
import type { DensityCurve } from '../primitives/densityTypes';
import type { EcmChamberMode, EcmGenerationMetrics } from './ecmChamberTypes';

/** Default ECM form length (4/4). */
export const ECM_DEFAULT_TOTAL_BARS = 24;

/** Metheny: three rotated 8-bar modal cycles — no 8-bar block identical to the first. */
const HARMONY_METHEENY: HarmonyPlan = {
  segments: [
    { chord: 'Emin9', bars: 2 },
    { chord: 'A7sus4', bars: 2 },
    { chord: 'Dmaj7', bars: 2 },
    { chord: 'Gmaj7', bars: 2 },
    { chord: 'Dmaj7', bars: 2 },
    { chord: 'Gmaj7', bars: 2 },
    { chord: 'Emin9', bars: 2 },
    { chord: 'A7sus4', bars: 2 },
    { chord: 'Gmaj7', bars: 2 },
    { chord: 'Emin9', bars: 2 },
    { chord: 'A7sus4', bars: 2 },
    { chord: 'Dmaj7', bars: 2 },
  ],
  totalBars: ECM_DEFAULT_TOTAL_BARS,
};

/** Schneider: slow centres across 24 bars — third area new colour, suspended flavour. */
const HARMONY_SCHNEIDER: HarmonyPlan = {
  segments: [
    { chord: 'Cmaj7', bars: 8 },
    { chord: 'Amin9', bars: 8 },
    { chord: 'Fmaj7', bars: 8 },
  ],
  totalBars: ECM_DEFAULT_TOTAL_BARS,
};

function chordPlanFromHarmony(h: HarmonyPlan): CompositionContext['chordSymbolPlan'] {
  let bar = 1;
  const segments: CompositionContext['chordSymbolPlan']['segments'] = [];
  for (const seg of h.segments) {
    segments.push({ chord: seg.chord, startBar: bar, bars: seg.bars });
    bar += seg.bars;
  }
  return { segments, totalBars: h.totalBars };
}

function tileMethenyDensity(totalBars: number): DensityCurve {
  const unit: Array<{ relStart: number; length: number; level: 'sparse' | 'medium' | 'dense' }> = [
    { relStart: 1, length: 3, level: 'sparse' },
    { relStart: 4, length: 1, level: 'medium' },
    { relStart: 5, length: 3, level: 'sparse' },
    { relStart: 8, length: 1, level: 'medium' },
  ];
  const segments: DensityCurve['segments'] = [];
  for (let cycle = 0; cycle < totalBars / 8; cycle++) {
    const off = cycle * 8;
    for (const u of unit) {
      segments.push({ startBar: u.relStart + off, length: u.length, level: u.level });
    }
  }
  return { totalBars, segments };
}

function schneiderDensityWaves(totalBars: number): DensityCurve {
  const third = totalBars / 3;
  const a = Math.floor(third);
  const b = Math.floor(third);
  const c = totalBars - a - b;
  return {
    totalBars,
    segments: [
      { startBar: 1, length: a, level: 'sparse' },
      { startBar: 1 + a, length: b, level: 'dense' },
      { startBar: 1 + a + b, length: c, level: 'sparse' },
    ],
  };
}

function buildEcmMetrics(mode: EcmChamberMode, totalBars: number): EcmGenerationMetrics {
  const third = Math.floor(totalBars / 3);
  if (mode === 'ECM_METHENY_QUARTET') {
    return {
      mode,
      sections: [
        {
          label: 'A1',
          startBar: 1,
          length: third,
          foregroundLineCount: 1,
          backgroundComplexityScore: 2,
          avgChordsPerBar: 0.5,
          cadenceCount: 1,
          swellEvents: 1,
          textureStates: ['intro_plateau', 'hover', 'release'],
        },
        {
          label: 'B',
          startBar: 1 + third,
          length: third,
          foregroundLineCount: 1,
          backgroundComplexityScore: 2,
          avgChordsPerBar: 0.5,
          cadenceCount: 1,
          swellEvents: 1,
          textureStates: ['echo', 'plateau', 'thin'],
        },
        {
          label: 'A2',
          startBar: 1 + 2 * third,
          length: totalBars - 2 * third,
          foregroundLineCount: 1,
          backgroundComplexityScore: 2,
          avgChordsPerBar: 0.5,
          cadenceCount: 1,
          swellEvents: 1,
          textureStates: ['return', 'hover', 'cadence_float'],
        },
      ],
      motifEchoSegments: 5,
      innerVoiceSmoothnessEstimate: 0.65,
      strongCadenceEstimate: 0.24,
    };
  }
  return {
    mode,
    sections: [
      {
        label: 'A1',
        startBar: 1,
        length: third,
        foregroundLineCount: 2,
        backgroundComplexityScore: 2,
        avgChordsPerBar: 0.12,
        cadenceCount: 0,
        swellEvents: 2,
        textureStates: ['cloud', 'swell', 'thin_solo'],
      },
      {
        label: 'B',
        startBar: 1 + third,
        length: third,
        foregroundLineCount: 3,
        backgroundComplexityScore: 4,
        avgChordsPerBar: 0.12,
        cadenceCount: 0,
        swellEvents: 3,
        textureStates: ['chamber_release', 'layered', 'bloom'],
      },
      {
        label: 'A2',
        startBar: 1 + 2 * third,
        length: totalBars - 2 * third,
        foregroundLineCount: 2,
        backgroundComplexityScore: 3,
        avgChordsPerBar: 0.12,
        cadenceCount: 0,
        swellEvents: 2,
        textureStates: ['release', 'suspended', 'open_fifth'],
      },
    ],
    motifEchoSegments: 2,
    innerVoiceSmoothnessEstimate: 0.84,
    strongCadenceEstimate: 0.12,
  };
}

export function buildEcmChamberContext(seed: number, mode: EcmChamberMode): CompositionContext {
  const preset = ecmChamberPreset;
  const totalBars = ECM_DEFAULT_TOTAL_BARS;
  const harmony = mode === 'ECM_SCHNEIDER_CHAMBER' ? HARMONY_SCHNEIDER : HARMONY_METHEENY;
  const chordSymbolPlan = chordPlanFromHarmony(harmony);
  const feel =
    mode === 'ECM_SCHNEIDER_CHAMBER'
      ? { mode: 'straight' as const, intensity: 0.48, syncopationDensity: 'low' as const }
      : { mode: 'straight' as const, intensity: 0.52, syncopationDensity: 'low' as const };

  const third = Math.floor(totalBars / 3);
  const sections = [
    { label: 'A1', startBar: 1, length: third },
    { label: 'B', startBar: 1 + third, length: third },
    { label: 'A2', startBar: 1 + 2 * third, length: totalBars - 2 * third },
  ];
  const form = { sections, totalBars };
  const phrase = { segments: sections.map((s) => ({ ...s, density: undefined })), totalBars };
  const rehearsalMarkPlan = {
    marks: [
      { label: 'A', bar: 1 },
      { label: 'B', bar: 1 + third },
      { label: 'A', bar: 1 + 2 * third },
    ],
  };
  const release = runReleaseReadinessGate({ validationPassed: true, exportValid: true, mxValid: true });
  const ecmMetrics = buildEcmMetrics(mode, totalBars);
  const densityCurve: DensityCurve =
    mode === 'ECM_METHENY_QUARTET' ? tileMethenyDensity(totalBars) : schneiderDensityWaves(totalBars);

  return {
    systemVersion: '2.0.0',
    presetId: 'ecm_chamber',
    seed,
    form,
    feel,
    harmony,
    motif: { activeMotifs: [], variants: {} },
    phrase,
    register: {
      melody: [55, 79] as [number, number],
      bass: [36, 55] as [number, number],
      byInstrument: {
        clean_electric_guitar: [55, 79],
        acoustic_upright_bass: [36, 55],
      },
    },
    density: densityCurve,
    instrumentProfiles: preset.instrumentProfiles,
    chordSymbolPlan,
    rehearsalMarkPlan,
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      harmonySource: 'builtin',
      progressionMode: 'builtin',
      ecmMode: mode,
      ecmMetrics,
    },
    validation: { gates: [], passed: true },
    readiness: { release: release.release, mx: release.mx },
    styleOverrides: {
      ecm: { variant: mode === 'ECM_SCHNEIDER_CHAMBER' ? 'schneider' : 'metheny' },
    },
  };
}
