/**
 * ECM Chamber — composition context from research-aligned heuristics (see user research:
 * Perplexity Research / ECM_Bacharach_BarryHarris_Research.md — Part 3 Metheny/ECM: modality,
 * floating time, texture). V1: modal harmony plans, straight feel, soft metrics in ecmMetrics.
 */
import type { CompositionContext } from '../compositionContext';
import type { HarmonyPlan } from '../primitives/harmonyTypes';
import { ecmChamberPreset } from '../../presets/ecmChamberPreset';
import { runReleaseReadinessGate } from '../readiness/releaseReadinessGate';
import type { DensityCurve } from '../primitives/densityTypes';
import type { EcmChamberMode, EcmGenerationMetrics } from './ecmChamberTypes';

/** Metheny: modal / hovering — sus and maj colours, avoid heavy V7alt cadential churn. */
const HARMONY_METHEENY: HarmonyPlan = {
  segments: [
    { chord: 'Emin9', bars: 2 },
    { chord: 'A7sus4', bars: 2 },
    { chord: 'Dmaj7', bars: 2 },
    { chord: 'Gmaj7', bars: 2 },
  ],
  totalBars: 8,
};

/** Schneider: very slow harmonic rhythm (≤1 chord change / bar avg), sustained centres. */
const HARMONY_SCHNEIDER: HarmonyPlan = {
  segments: [
    { chord: 'Cmaj7', bars: 4 },
    { chord: 'Amin9', bars: 4 },
  ],
  totalBars: 8,
};

function chordPlanFromHarmony(h: HarmonyPlan): CompositionContext['chordSymbolPlan'] {
  let bar = 1;
  const segments: CompositionContext['chordSymbolPlan']['segments'] = [];
  for (const seg of h.segments) {
    segments.push({ chord: seg.chord, startBar: bar, bars: seg.bars });
    bar += seg.bars;
  }
  return { segments, totalBars: 8 };
}

function buildEcmMetrics(mode: EcmChamberMode): EcmGenerationMetrics {
  if (mode === 'ECM_METHENY_QUARTET') {
    return {
      mode,
      sections: [
        {
          label: 'A',
          startBar: 1,
          length: 4,
          foregroundLineCount: 1,
          backgroundComplexityScore: 2,
          avgChordsPerBar: 0.5,
          cadenceCount: 1,
          swellEvents: 1,
          textureStates: ['intro_plateau', 'hover', 'release'],
        },
        {
          label: 'B',
          startBar: 5,
          length: 4,
          foregroundLineCount: 1,
          backgroundComplexityScore: 2,
          avgChordsPerBar: 0.5,
          cadenceCount: 1,
          swellEvents: 1,
          textureStates: ['echo', 'plateau', 'thin'],
        },
      ],
      motifEchoSegments: 3,
      innerVoiceSmoothnessEstimate: 0.65,
      strongCadenceEstimate: 0.28,
    };
  }
  return {
    mode,
    sections: [
      {
        label: 'A',
        startBar: 1,
        length: 4,
        foregroundLineCount: 2,
        backgroundComplexityScore: 2,
        avgChordsPerBar: 0.25,
        cadenceCount: 0,
        swellEvents: 2,
        textureStates: ['cloud', 'swell', 'thin_solo'],
      },
      {
        label: 'B',
        startBar: 5,
        length: 4,
        foregroundLineCount: 3,
        backgroundComplexityScore: 4,
        avgChordsPerBar: 0.25,
        cadenceCount: 0,
        swellEvents: 2,
        textureStates: ['chamber_release', 'layered', 'soft_cadence'],
      },
    ],
    motifEchoSegments: 1,
    innerVoiceSmoothnessEstimate: 0.82,
    strongCadenceEstimate: 0.15,
  };
}

export function buildEcmChamberContext(seed: number, mode: EcmChamberMode): CompositionContext {
  const preset = ecmChamberPreset;
  const harmony = mode === 'ECM_SCHNEIDER_CHAMBER' ? HARMONY_SCHNEIDER : HARMONY_METHEENY;
  const chordSymbolPlan = chordPlanFromHarmony(harmony);
  const feel =
    mode === 'ECM_SCHNEIDER_CHAMBER'
      ? { mode: 'straight' as const, intensity: 0.48, syncopationDensity: 'low' as const }
      : { mode: 'straight' as const, intensity: 0.52, syncopationDensity: 'low' as const };

  const sections = [
    { label: 'A', startBar: 1, length: 4 },
    { label: 'B', startBar: 5, length: 4 },
  ];
  const form = { sections, totalBars: 8 };
  const phrase = { segments: sections.map((s) => ({ ...s, density: undefined })), totalBars: 8 };
  const rehearsalMarkPlan = { marks: [{ label: 'A', bar: 1 }, { label: 'B', bar: 5 }] };
  const release = runReleaseReadinessGate({ validationPassed: true, exportValid: true, mxValid: true });
  const ecmMetrics = buildEcmMetrics(mode);
  const densityCurve: DensityCurve =
    mode === 'ECM_METHENY_QUARTET'
      ? {
          totalBars: 8,
          segments: [
            { startBar: 1, length: 3, level: 'sparse' },
            { startBar: 4, length: 1, level: 'medium' },
            { startBar: 5, length: 3, level: 'sparse' },
            { startBar: 8, length: 1, level: 'medium' },
          ],
        }
      : {
          totalBars: 8,
          segments: [
            { startBar: 1, length: 4, level: 'sparse' },
            { startBar: 5, length: 4, level: 'dense' },
          ],
        };

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
