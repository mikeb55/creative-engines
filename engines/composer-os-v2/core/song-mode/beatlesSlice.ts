/**
 * Beatles song-mode slice — three eras (Merseybeat → Rubber Soul → Abbey Road).
 * Design: tiered harmony vocabulary + named devices; runtime pool IDs match `SONGWRITER_CHORD_POOLS` in `songModeBuilder.ts`.
 */

import type { BeatlesContextMode, CompositionContext, GenerationMetadata } from '../compositionContext';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';

/** Pool keys registered under `SONGWRITER_CHORD_POOLS` for `songwriterId === 'beatles'`. */
export type BeatlesChordPoolId =
  | 'beatles_merseybeat_1962'
  | 'beatles_rubber_soul_1965'
  | 'beatles_abbey_road_1968';

export const BEATLES_CONTEXTS = {
  /** Early Beatles / rock’n’roll scaffold — diatonic major + blues IV7/I7, secondary dominants, borrowed iv / bVII / bVI touches. */
  merseybeat_1962: 'merseybeat_1962',
  /** Modal/colour era — flat-side primaries (bIII, bVI, bVII), iv, Mixolydian loops, V-of-ish resolutions. */
  rubber_soul_1965: 'rubber_soul_1965',
  /** Studio-era flat-side system — chromatic mediants, double-plagal, co-tonic centres (relative major/minor, bIII poles). */
  abbey_road_1968: 'abbey_road_1968',
} as const;

/** Formal / harmonic devices surfaced to planners (`melodyBehaviourPlanner`, pairing hints). */
export const beatlesDevices = {
  d1: 'aaba_form',
  d2: 'flat_side_modal',
  d3: 'co_tonic_switch',
  d4: 'chromatic_mediant',
  d5: 'suite_form',
} as const;

export type BeatlesDeviceId = keyof typeof beatlesDevices;

/** Style surface nudges vs neutral scaffold (see `planMelodyBehaviour`). */
export const beatlesStyleSurface = {
  harmonyDensityBias: 0.08,
  syncopationBias: -0.06,
  rhythmicSpaceBias: 0.12,
  cadenceSoftnessBias: 0.22,
} as const;

/** Roman-style chord pools per era (analytical; concrete rows live in `songModeBuilder`). */
export const beatlesChordPoolSpec = {
  merseybeat_1962: {
    primary: ['I', 'ii', 'ii7', 'IV', 'V', 'V7', 'vi', 'I7', 'IV7'],
    secondaryAndBorrowed: ['II7', 'iv', 'bVII', 'bVI'],
    notes: 'Blues IV7/I7; secondary II7; occasional minor iv and flat-side borrowed.',
  },
  rubber_soul_1965: {
    extendsEra: 'merseybeat_1962',
    addedPrimaries: ['bIII', 'bVI', 'bVII'],
    cycles: ['I', 'bVII', 'IV'],
    resolutions: ['II', 'bII'],
    notes: 'Flat-side as structural; Mixolydian I–bVII–IV; II / bII colour resolutions.',
  },
  abbey_road_1968: {
    system: 'flat_side_full',
    mediants: ['I→bIII', 'I→bVI'],
    doublePlagal: ['I', 'bVII', 'IV'],
    coTonic: ['vi', 'VI', 'bIII'],
    notes: 'Chromatic mediants, double-plagal, co-tonic switching as local tonics.',
  },
} as const;

const TIER_TO_POOL: readonly BeatlesChordPoolId[] = [
  'beatles_merseybeat_1962',
  'beatles_rubber_soul_1965',
  'beatles_abbey_road_1968',
];

export function resolveBeatlesChordPoolId(seed: number): BeatlesChordPoolId {
  const tier = Math.abs(seed) % 3;
  return TIER_TO_POOL[tier]!;
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function sectionLabelForBar(bar: number, context: CompositionContext): string {
  const s = context.form.sections.find((sec) => bar >= sec.startBar && bar < sec.startBar + sec.length);
  return s?.label ?? 'A';
}

/** Receipt passes — tags **`bt:*`** aligned with {@link beatlesDevices}. */
function applyBeatlesDeviceReceiptPasses(
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  ctx: BeatlesContextMode
): void {
  const tags =
    ctx === 'merseybeat_1962'
      ? (['bt:d1_aaba_form', 'bt:d2_flat_side_modal'] as const)
      : ctx === 'rubber_soul_1965'
        ? (['bt:d2_flat_side_modal', 'bt:d4_chromatic_mediant'] as const)
        : (['bt:d3_co_tonic_switch', 'bt:d5_suite_form', 'bt:d4_chromatic_mediant'] as const);
  for (let b = 1; b <= tb; b++) {
    if (seededUnit(seed, b, 664101) < 0.11) {
      receipts.push(`${tags[b % tags.length]!}@bar${b}`);
    }
    if (sectionLabelForBar(b, context) === 'B' && seededUnit(seed, b, 664102) < 0.25) {
      receipts.push(`bt:d1_aaba_form@sectionB@bar${b}`);
    }
  }
}

export function isSongwriterBeatles(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'beatles' } {
  return genMeta?.songwriterStyleId === 'beatles';
}

export interface BeatlesHarmonyAccumulator {
  barsConsidered: number;
  functionalColourTouches: number;
  borrowedColourTouches: number;
}

export function createBeatlesHarmonyAccumulator(): BeatlesHarmonyAccumulator {
  return {
    barsConsidered: 0,
    functionalColourTouches: 0,
    borrowedColourTouches: 0,
  };
}

function scanChordForDiagnostics(chord: string, acc: BeatlesHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const t = parseChordSymbol(c).harmonyPart.toLowerCase();
  if (/7|9|11|13|maj|m7|dim|aug|sus|add/.test(t)) acc.functionalColourTouches++;
  if (/eb|bb|ab|gb|db|fm\b|gm\b|dm\b|am\b|bm\b|cm\b/i.test(c)) acc.borrowedColourTouches++;
}

export function accumulateBeatlesHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: BeatlesHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function precomputeBeatlesEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const btCtx: BeatlesContextMode = genMeta.beatlesContext ?? 'merseybeat_1962';
  genMeta.beatlesContext = btCtx;

  const receipts: string[] = [];
  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    out.push(resolveBarSymbol(context, b).symbol);
  }
  applyBeatlesDeviceReceiptPasses(seed, receipts, tb, context, btCtx);

  genMeta.beatlesEffectiveHarmonyBars = out;
  genMeta.beatlesDeviceReceipts = receipts;
}

export function finalizeBeatlesMetadata(metadata: GenerationMetadata, acc: BeatlesHarmonyAccumulator): void {
  const flat = [...(metadata.beatlesDeviceReceipts ?? [])];
  const d = {
    songwriterId: 'beatles' as const,
    barsConsidered: acc.barsConsidered,
    functionalColourTouches: acc.functionalColourTouches,
    borrowedColourTouches: acc.borrowedColourTouches,
    deviceReceipts: flat.length ? flat : undefined,
  } as const;
  const receipt = [
    `Beatles (slice): functional≈${acc.functionalColourTouches}`,
    `borrowed≈${acc.borrowedColourTouches}`,
    `bars=${acc.barsConsidered}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.beatlesDiagnostics = { ...d };
  metadata.beatlesSliceReceipt = receipt;
}

export const beatlesSlice = {
  id: 'beatles' as const,
  contexts: BEATLES_CONTEXTS,
  devices: beatlesDevices,
  styleSurface: beatlesStyleSurface,
  chordPoolSpec: beatlesChordPoolSpec,
  resolveChordPoolId: resolveBeatlesChordPoolId,
} as const;
