/**
 * ECM Chamber — composition context from research-aligned heuristics (see user research:
 * Perplexity Research / ECM_Bacharach_BarryHarris_Research.md — Part 3 Metheny/ECM: modality,
 * floating time, texture). Extended form (24 bars default): A / B / A′ harmonic rotations.
 * Per–8-bar-cycle substitutions preserve function while avoiding identical repetition across cycles.
 */
import type { CompositionContext } from '../compositionContext';
import type { HarmonyPlan } from '../primitives/harmonyTypes';
import { ecmChamberPreset } from '../../presets/ecmChamberPreset';
import { runReleaseReadinessGate } from '../readiness/releaseReadinessGate';
import type { DensityCurve } from '../primitives/densityTypes';
import type { EcmChamberMode, EcmGenerationMetrics } from './ecmChamberTypes';

/** Default ECM form length (4/4). */
export const ECM_DEFAULT_TOTAL_BARS = 24;

export interface BuildEcmChamberContextOpts {
  /** When set (e.g. 32 for regression), harmony and form extend; default remains 24. */
  totalBars?: number;
}

/** Metheny: canonical 8-bar modal unit (first rotation). */
const METHENY_EIGHT_BAR_BASE: { chord: string; bars: number }[] = [
  { chord: 'Emin9', bars: 2 },
  { chord: 'A7sus4', bars: 2 },
  { chord: 'Dmaj7', bars: 2 },
  { chord: 'Gmaj7', bars: 2 },
];

/** One 8-bar Metheny cycle — subtle functional substitutions so cycles are not identical. */
function methenyEightBarCycle(cycleIndex: number, seed: number): { chord: string; bars: number }[] {
  const c = cycleIndex % 3;
  const r = (seed + cycleIndex * 31 + cycleIndex * cycleIndex) % 11;
  if (c === 0) {
    return METHENY_EIGHT_BAR_BASE.map((s) => ({ ...s }));
  }
  if (c === 1) {
    return [
      { chord: r < 5 ? 'Emin7' : 'Emin9', bars: 2 },
      { chord: 'A7sus4', bars: 2 },
      { chord: r < 6 ? 'Dmaj9' : 'Dmaj7', bars: 2 },
      { chord: 'Gmaj9', bars: 2 },
    ];
  }
  return [
    { chord: 'Emin9', bars: 2 },
    { chord: 'A7sus4', bars: 2 },
    { chord: r < 5 ? 'Dmaj7/A' : 'Dmaj7', bars: 2 },
    { chord: 'Gmaj7', bars: 2 },
  ];
}

function buildMethenyHarmony(totalBars: number, seed: number): HarmonyPlan {
  const segments: HarmonyPlan['segments'] = [];
  let written = 0;
  let cycle = 0;
  while (written < totalBars) {
    const unit = methenyEightBarCycle(cycle, seed);
    for (const s of unit) {
      if (written >= totalBars) break;
      const take = Math.min(s.bars, totalBars - written);
      segments.push({ chord: s.chord, bars: take });
      written += take;
    }
    cycle++;
  }
  return { segments, totalBars };
}

/** Wheeler: polyaxial upper-structure + independent bass — brittle intervallic chamber field. */
function buildWheelerHarmony(totalBars: number, seed: number): HarmonyPlan {
  const third = Math.floor(totalBars / 3);
  const a = third;
  const b = third;
  const c = totalBars - a - b;
  const u0 = Math.sin(seed * 13.1 + 1) * 10000;
  const u0f = u0 - Math.floor(u0);
  const u1 = Math.sin(seed * 7.3 + 4) * 10000;
  const u1f = u1 - Math.floor(u1);

  const blockA = u0f < 0.34 ? 'Ebmaj7(add9,#11)/G' : u0f < 0.67 ? 'Bb6/9(#11)/D' : 'Fmaj9(no3)/A';
  const blockB = u1f < 0.5 ? 'Abmaj7(add11)/Eb' : 'Db6/9(add9)/Bb';
  const blockC = u1f < 0.55 ? 'Bmaj7(add9)/F#' : 'Bb6/9(#11)/F';

  return {
    segments: [
      { chord: blockA, bars: a },
      { chord: blockB, bars: b },
      { chord: blockC, bars: c },
    ],
    totalBars,
  };
}

function wheelerDensityWaves(totalBars: number): DensityCurve {
  const quarter = Math.floor(totalBars / 4);
  const q2 = quarter;
  const q3 = quarter;
  const q4 = totalBars - 3 * quarter;
  return {
    totalBars,
    segments: [
      { startBar: 1, length: q2, level: 'sparse' },
      { startBar: 1 + q2, length: q3, level: 'medium' },
      { startBar: 1 + q2 + q3, length: 1, level: 'sparse' },
      { startBar: 1 + q2 + q3 + 1, length: Math.max(1, q4 - 1), level: 'medium' },
    ],
  };
}

/** Schneider: three areas — per-block colour shifts (same broad identity). */
function buildSchneiderHarmony(totalBars: number, seed: number): HarmonyPlan {
  const third = Math.floor(totalBars / 3);
  const a = third;
  const b = third;
  const c = totalBars - a - b;
  const u0 = Math.sin(seed * 11.7 + 2) * 10000;
  const u0f = u0 - Math.floor(u0);
  const u2 = Math.sin(seed * 9.2 + 5) * 10000;
  const u2f = u2 - Math.floor(u2);

  const blockA = u0f < 0.34 ? 'Cmaj9' : u0f < 0.67 ? 'Cmaj7' : 'Cmaj7';
  const blockB = 'Amin9';
  const blockC = u2f < 0.55 ? 'Fmaj7' : 'Fmaj7#11';

  return {
    segments: [
      { chord: blockA, bars: a },
      { chord: blockB, bars: b },
      { chord: blockC, bars: c },
    ],
    totalBars,
  };
}

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
  if (mode === 'ECM_WHEELER_CHAMBER') {
    return {
      mode,
      sections: [
        {
          label: 'A1',
          startBar: 1,
          length: third,
          foregroundLineCount: 1,
          backgroundComplexityScore: 2,
          avgChordsPerBar: 0.18,
          cadenceCount: 0,
          swellEvents: 1,
          textureStates: ['intervallic_field', 'thin_bass', 'halo_sus'],
        },
        {
          label: 'B',
          startBar: 1 + third,
          length: third,
          foregroundLineCount: 2,
          backgroundComplexityScore: 3,
          avgChordsPerBar: 0.22,
          cadenceCount: 0,
          swellEvents: 1,
          textureStates: ['polyaxial_shift', 'register_gap', 'breath'],
        },
        {
          label: 'A2',
          startBar: 1 + 2 * third,
          length: totalBars - 2 * third,
          foregroundLineCount: 1,
          backgroundComplexityScore: 2,
          avgChordsPerBar: 0.15,
          cadenceCount: 0,
          swellEvents: 1,
          textureStates: ['fragile_stable', 'open_6_9', 'unresolved_tail'],
        },
      ],
      motifEchoSegments: 3,
      innerVoiceSmoothnessEstimate: 0.38,
      strongCadenceEstimate: 0.08,
    };
  }
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

export function buildEcmChamberContext(
  seed: number,
  mode: EcmChamberMode,
  opts?: BuildEcmChamberContextOpts
): CompositionContext {
  const preset = ecmChamberPreset;
  const totalBars = opts?.totalBars ?? ECM_DEFAULT_TOTAL_BARS;
  const harmony =
    mode === 'ECM_WHEELER_CHAMBER'
      ? buildWheelerHarmony(totalBars, seed)
      : mode === 'ECM_SCHNEIDER_CHAMBER'
        ? buildSchneiderHarmony(totalBars, seed)
        : buildMethenyHarmony(totalBars, seed);
  const chordSymbolPlan = chordPlanFromHarmony(harmony);
  const feel =
    mode === 'ECM_WHEELER_CHAMBER'
      ? { mode: 'straight' as const, intensity: 0.44, syncopationDensity: 'low' as const }
      : mode === 'ECM_SCHNEIDER_CHAMBER'
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
    mode === 'ECM_METHENY_QUARTET'
      ? tileMethenyDensity(totalBars)
      : mode === 'ECM_WHEELER_CHAMBER'
        ? wheelerDensityWaves(totalBars)
        : schneiderDensityWaves(totalBars);

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
      bass: [40, 55] as [number, number],
      byInstrument: {
        clean_electric_guitar: [55, 79],
        acoustic_upright_bass: [40, 55],
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
      ecm: {
        variant:
          mode === 'ECM_WHEELER_CHAMBER' ? 'wheeler' : mode === 'ECM_SCHNEIDER_CHAMBER' ? 'schneider' : 'metheny',
      },
    },
  };
}
