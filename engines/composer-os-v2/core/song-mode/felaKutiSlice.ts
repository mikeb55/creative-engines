/**
 * Fela Kuti — Afrobeat static-vamp / call-response Song Mode **harmony** slice.
 * Lead-sheet symbols only — receipts **`fk:*`**. Yoruba pentatonic degrees {1,2,♭3,4,5,6,♭7} — structural 1-5-♭7 (melody metadata via {@link FELA_YORUBA_PENTATONIC_DEGREES}).
 */

import type { CompositionContext, FelaKutiContextMode, GenerationMetadata } from '../compositionContext';
import { getChordForBar } from '../harmony/harmonyResolution';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  createAfrobeatRhythmEngine,
  type DrumPattern,
  type TonyAllenFeel,
} from '../percussion/afrobeatRhythmEngine';
import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import type { NoteEvent, PartModel, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { createPart } from '../score-model/scoreEventBuilder';

/** Pool keys registered under `SONGWRITER_CHORD_POOLS` for `songwriterId === 'fela_kuti'`. */
export type FelaKutiChordPoolId =
  | 'fela_kuti_zombie_1977'
  | 'fela_kuti_water_no_get_enemy'
  | 'fela_kuti_lady_1972';

export const FELA_KUTI_CONTEXTS = {
  zombie_1977: 'zombie_1977',
  water_no_get_enemy: 'water_no_get_enemy',
  lady_1972: 'lady_1972',
} as const;

export const felaKutiDevices = {
  d1: 'static_vamp',
  d2: 'call_response',
  d3: 'pentatonic_layer',
  d4: 'parallel_horns',
  d5: 'polymetric_grid',
} as const;

export type FelaKutiDeviceId = keyof typeof felaKutiDevices;

/** Style surface nudges vs neutral scaffold (`applyFelaKutiStyleSurface`). */
export const felaKutiStyleSurface = {
  harmonyDensityBias: 0.18,
  syncopationBias: 0.32,
  rhythmicSpaceBias: -0.14,
  cadenceSoftnessBias: 0.38,
} as const;

/** Analytical pitch-degree labels for Yoruba pentatonic flavour (relative minor tonic = 1). */
export const FELA_YORUBA_PENTATONIC_DEGREES = ['1', '2', 'b3', '4', '5', '6', 'b7'] as const;

const TIER_TO_POOL: readonly FelaKutiChordPoolId[] = [
  'fela_kuti_zombie_1977',
  'fela_kuti_water_no_get_enemy',
  'fela_kuti_lady_1972',
];

export function resolveFelaKutiChordPoolId(seed: number): FelaKutiChordPoolId {
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

/** Receipt passes — tags **`fk:*`** aligned with {@link felaKutiDevices}. */
function applyFelaKutiDeviceReceiptPasses(
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  ctx: FelaKutiContextMode
): void {
  const tags =
    ctx === 'zombie_1977'
      ? (['fk:d1_static_vamp', 'fk:d2_call_response'] as const)
      : ctx === 'water_no_get_enemy'
        ? (['fk:d2_call_response', 'fk:d3_pentatonic_layer'] as const)
        : (['fk:d4_parallel_horns', 'fk:d5_polymetric_grid', 'fk:d3_pentatonic_layer'] as const);
  for (let b = 1; b <= tb; b++) {
    if (seededUnit(seed, b, 771001) < 0.12) {
      receipts.push(`${tags[b % tags.length]!}@bar${b}`);
    }
    if (sectionLabelForBar(b, context) === 'B' && seededUnit(seed, b, 771002) < 0.22) {
      receipts.push(`fk:d2_call_response@sectionB@bar${b}`);
    }
  }
}

export function isSongwriterFelaKuti(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'fela_kuti' } {
  return genMeta?.songwriterStyleId === 'fela_kuti';
}

export interface FelaKutiHarmonyAccumulator {
  barsConsidered: number;
  minorSeventhVampTouches: number;
  flatSevenDominantTouches: number;
  fourDominantTouches: number;
  flatThreeMajorColourTouches: number;
}

export function createFelaKutiHarmonyAccumulator(): FelaKutiHarmonyAccumulator {
  return {
    barsConsidered: 0,
    minorSeventhVampTouches: 0,
    flatSevenDominantTouches: 0,
    fourDominantTouches: 0,
    flatThreeMajorColourTouches: 0,
  };
}

function chordHeadTrimmed(symbol: string): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slash = hp.indexOf('/');
  const head = slash >= 0 ? hp.slice(0, slash) : hp;
  return head.replace(/\s/g, '');
}

function scanChordForDiagnostics(chord: string, acc: FelaKutiHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const head = chordHeadTrimmed(c);
  const tl = head.toLowerCase();
  if (/m7|m9|m11/.test(tl) && !/maj/.test(tl)) acc.minorSeventhVampTouches++;
  if (/^g(#|b)?7/i.test(head)) acc.flatSevenDominantTouches++;
  if (/^d(#|b)?7/i.test(head)) acc.fourDominantTouches++;
  if (/^(c|eb)(#|b)?maj7/i.test(head) || /^cΔ|^ebΔ/i.test(tl)) acc.flatThreeMajorColourTouches++;
}

export function accumulateFelaKutiHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: FelaKutiHarmonyAccumulator
): void {
  scanChordForDiagnostics(currentChord, acc);
}

export function precomputeFelaKutiEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const fkCtx: FelaKutiContextMode = genMeta.felaKutiContext ?? 'zombie_1977';
  genMeta.felaKutiContext = fkCtx;

  const receipts: string[] = [];
  const out: string[] = [];
  for (let b = 1; b <= tb; b++) {
    out.push(getChordForBar(b, context));
  }
  applyFelaKutiDeviceReceiptPasses(seed, receipts, tb, context, fkCtx);

  genMeta.felaKutiEffectiveHarmonyBars = out;
  genMeta.felaKutiDeviceReceipts = receipts;
  genMeta.felaKutiYorubaPentatonicDegrees = [...FELA_YORUBA_PENTATONIC_DEGREES];
}

/** GM note numbers — unpitched display C2 / D2 / F#2 / G#2 / D3 (`musicxmlExporter.ts` must stay aligned). */
export const FELA_GM_DRUM_KICK = 36;
export const FELA_GM_DRUM_SNARE = 38;
export const FELA_GM_DRUM_HI_HAT = 42;
export const FELA_GM_DRUM_BELL = 44;
export const FELA_GM_DRUM_CONGA = 50;

export type FelaPercussionFeelTag = 'fk:straight' | 'fk:swing' | 'fk:afrobeat';

/** Map slice posture → Tony Allen grid bucket (`tonyAllenPatterns.json`). */
export function felaTonyAllenFeelFromKutiContext(ctx: FelaKutiContextMode | undefined): TonyAllenFeel {
  const c = ctx ?? 'zombie_1977';
  if (c === 'zombie_1977') return 'afrobeat';
  if (c === 'water_no_get_enemy') return 'swing';
  return 'straight';
}

export function felaPercussionFeelTagFromTonyAllenFeel(feel: TonyAllenFeel): FelaPercussionFeelTag {
  return feel === 'straight' ? 'fk:straight' : feel === 'swing' ? 'fk:swing' : 'fk:afrobeat';
}

/** Resolve Tony Allen grid: manual override wins; else posture (`felaKutiContext`) mapping. */
export function resolveFelaPercussionTonyAllenFeel(
  metadata: Pick<GenerationMetadata, 'felaPercussionFeelOverride' | 'felaKutiContext'>
): TonyAllenFeel {
  const o = metadata.felaPercussionFeelOverride;
  if (o === 'straight' || o === 'swing' || o === 'afrobeat') return o;
  return felaTonyAllenFeelFromKutiContext(metadata.felaKutiContext);
}

/** One bar of 16th-note drum hits for MusicXML export (beat units 0..4). */
export function buildFelaPercussionMeasureEvents(pattern: DrumPattern): ScoreEvent[] {
  const events: ScoreEvent[] = [];
  const dur = 0.25;
  for (let step = 0; step < 16; step++) {
    const startBeat = step * dur;
    const hits: number[] = [];
    if (pattern.kick[step]) hits.push(FELA_GM_DRUM_KICK);
    if (pattern.snare[step]) hits.push(FELA_GM_DRUM_SNARE);
    if (pattern.hiHat[step]) hits.push(FELA_GM_DRUM_HI_HAT);
    if (pattern.bell[step]) hits.push(FELA_GM_DRUM_BELL);
    if (pattern.conga[step]) hits.push(FELA_GM_DRUM_CONGA);
    hits.sort((a, b) => a - b);
    for (const midi of hits) {
      const ev: NoteEvent = { kind: 'note', pitch: midi, startBeat, duration: dur, voice: 1 };
      events.push(ev);
    }
  }
  return events;
}

export function buildFelaAfrobeatPercussionPart(totalBars: number, pattern: DrumPattern): PartModel {
  const part = createPart(
    'fela_drums',
    'Afrobeat Percussion',
    'fela_afrobeat_drums',
    0,
    'treble',
    totalBars,
    () => undefined,
    () => undefined
  );
  for (const m of part.measures) {
    m.events = buildFelaPercussionMeasureEvents(pattern);
  }
  return part;
}

function stampFelaDrumMeasureSpans(part: PartModel, context: CompositionContext): void {
  const map = context.generationMetadata?.barMeterMap ?? context.barMeterMap;
  for (const m of part.measures) {
    m.measureBeatSpanQuarters = resolveMeasureBeatSpanQuarters(m.index, map);
  }
}

/** Append GM percussion staff for Fela Kuti generations (after duo seal). Idempotent. */
export function appendFelaPercussionToScore(score: ScoreModel, context: CompositionContext): void {
  const md = context.generationMetadata as GenerationMetadata | undefined;
  if (!md || md.songwriterStyleId !== 'fela_kuti') return;
  if (score.parts.some((p) => p.id === 'fela_drums')) return;
  const tb = context.form.totalBars;
  const feel = resolveFelaPercussionTonyAllenFeel(md);
  const engine = createAfrobeatRhythmEngine();
  const pattern = engine.selectPattern(feel);
  const drumPart = buildFelaAfrobeatPercussionPart(tb, pattern);
  stampFelaDrumMeasureSpans(drumPart, context);
  score.parts.push(drumPart);
}

export function finalizeFelaKutiMetadata(metadata: GenerationMetadata, acc: FelaKutiHarmonyAccumulator): void {
  const flat = [...(metadata.felaKutiDeviceReceipts ?? [])];
  const d = {
    songwriterId: 'fela_kuti' as const,
    barsConsidered: acc.barsConsidered,
    minorSeventhVampTouches: acc.minorSeventhVampTouches,
    flatSevenDominantTouches: acc.flatSevenDominantTouches,
    fourDominantTouches: acc.fourDominantTouches,
    flatThreeMajorColourTouches: acc.flatThreeMajorColourTouches,
    deviceReceipts: flat.length ? flat : undefined,
    yorubaPentatonicDegrees: metadata.felaKutiYorubaPentatonicDegrees ?? [...FELA_YORUBA_PENTATONIC_DEGREES],
  } as const;
  metadata.felaPercussionFeelTag = felaPercussionFeelTagFromTonyAllenFeel(resolveFelaPercussionTonyAllenFeel(metadata));
  const receipt = [
    `Fela Kuti (slice): Im7≈${acc.minorSeventhVampTouches}`,
    `bVII7≈${acc.flatSevenDominantTouches}`,
    `IV7≈${acc.fourDominantTouches}`,
    `bIIImaj7≈${acc.flatThreeMajorColourTouches}`,
    `bars=${acc.barsConsidered}`,
    `yoruba_degrees=${(d.yorubaPentatonicDegrees ?? []).join(',')}`,
    `perc_feel=${metadata.felaPercussionFeelTag}`,
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.felaKutiDiagnostics = { ...d };
  metadata.felaKutiSliceReceipt = receipt;
}

export const felaKutiSlice = {
  id: 'fela_kuti' as const,
  contexts: FELA_KUTI_CONTEXTS,
  devices: felaKutiDevices,
  styleSurface: felaKutiStyleSurface,
  resolveChordPoolId: resolveFelaKutiChordPoolId,
  yorubaPentatonicDegrees: FELA_YORUBA_PENTATONIC_DEGREES,
} as const;
