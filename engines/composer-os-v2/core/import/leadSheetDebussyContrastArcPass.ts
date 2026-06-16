/**
 * Phase C - Debussy-only leadsheet quintet contrast arc (import-layer).
 * Runs after Phase B identity-cell echo; before 16th-note clamp.
 * Reshapes string accompaniment only - never guitar or owner melody voice-1 pitch order.
 * Modal / impressionistic profile: planing, blurred rhythm, colour wash — not Bartók aksak.
 */

import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { BEATS_PER_MEASURE, type MeasureModel, type NoteEvent, type ScoreModel } from '../score-model/scoreModelTypes';
import { createNote } from '../score-model/scoreEventBuilder';
import type { PerBarMelodyOwnership } from './debussyLeadSheetMelodyHandoffPlan';
import { getLeadSheetPartMidiBounds, isLeadSheetStringPartId, pitchInPartRange } from './leadSheetPartMidiBounds';
import { SIXTEENTH_GRID_BEATS } from './leadSheetQuintetSixteenthGridClampPass';

const STRING_PART_IDS = ['sq_violin_1', 'sq_violin_2', 'sq_viola', 'sq_cello'] as const;
type StringPartId = (typeof STRING_PART_IDS)[number];

export type DebussyMacroPhase = 'bare' | 'emerging_wash' | 'full_colour' | 'hush' | 'return_colour';
export type DebussyTextureState = 'sparse' | 'wash' | 'full_colour' | 'hush';

export interface LeadSheetDebussyContrastArcBarDiagnostics {
  bar: number;
  macroPhase: DebussyMacroPhase;
  textureState: DebussyTextureState;
  activeVoiceCount: number;
  attackCount: number;
  planingDetected?: boolean;
}

export interface LeadSheetDebussyContrastArcDiagnostics {
  bars: LeadSheetDebussyContrastArcBarDiagnostics[];
  sparseRegion: string;
  washRegion: string;
  fullColourRegion: string;
  hushRegion: string;
  planingPresent: boolean;
  planingRegions: string;
}

export interface LeadSheetDebussyContrastArcInput {
  score: ScoreModel;
  appliedHarmonyBars: readonly string[];
  perBarMelodyOwnership: readonly PerBarMelodyOwnership[];
  seed?: number;
}

export interface LeadSheetDebussyContrastArcResult {
  score: ScoreModel;
  diagnostics: LeadSheetDebussyContrastArcDiagnostics;
}

type ChordRole = 'root' | 'third' | 'fifth' | 'seventh';
type PlaningShape = 'thirds' | 'fourths' | 'fifths';

const PLANING_SHAPES: readonly PlaningShape[] = ['thirds', 'fourths', 'fifths'];
const PLANING_OFFSETS: Record<PlaningShape, readonly [number, number, number]> = {
  thirds: [0, 3, 6],
  fourths: [0, 5, 10],
  fifths: [0, 7, 14],
};

function snap16(value: number): number {
  return Math.round(value / SIXTEENTH_GRID_BEATS) * SIXTEENTH_GRID_BEATS;
}

function snapDur(value: number): number {
  return Math.max(SIXTEENTH_GRID_BEATS, snap16(value));
}

function seededUnit(seed: number, bar: number, slot: number, tag: string): number {
  let h = seed ^ (bar * 7919) ^ (slot * 104729);
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000;
}

function ownerForBar(ownership: readonly PerBarMelodyOwnership[], bar: number): string {
  return ownership.find((o) => o.bar === bar)?.ownerPartId ?? 'guitar';
}

function macroPhaseForBar(bar: number): DebussyMacroPhase {
  if (bar <= 8) return 'bare';
  if (bar <= 16) return 'emerging_wash';
  if (bar <= 24) return 'full_colour';
  if (bar <= 28) return 'hush';
  return 'return_colour';
}

function textureStateForBar(bar: number): DebussyTextureState {
  const phase = macroPhaseForBar(bar);
  if (phase === 'bare') return 'sparse';
  if (phase === 'emerging_wash') return 'wash';
  if (phase === 'full_colour') return 'full_colour';
  if (phase === 'hush') return 'hush';
  return 'wash';
}

function planingShapeForBar(bar: number, seed: number): PlaningShape {
  const idx = Math.floor(seededUnit(seed, bar, 0, 'planing') * PLANING_SHAPES.length);
  return PLANING_SHAPES[idx] ?? 'thirds';
}

function chordPitchForPart(
  chordSymbol: string,
  partId: string,
  role: ChordRole,
  octaveShift = 0,
): number {
  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });
  const pool: Record<ChordRole, number | undefined> = {
    root: tones.root,
    third: tones.third,
    fifth: tones.fifth,
    seventh: tones.seventh,
  };
  let pitch = pool[role] ?? tones.root ?? 60;
  pitch += octaveShift * 12;
  const [lo, hi] = getLeadSheetPartMidiBounds(partId);
  while (pitch < lo) pitch += 12;
  while (pitch > hi) pitch -= 12;
  return Math.max(lo, Math.min(hi, pitch));
}

function fitPlaningBlock(vn1: number, vn2: number, va: number): { vn1: number; vn2: number; va: number } {
  for (let shift = -36; shift <= 36; shift += 12) {
    const t1 = vn1 + shift;
    const t2 = vn2 + shift;
    const t3 = va + shift;
    if (
      pitchInPartRange(t1, 'sq_violin_1') &&
      pitchInPartRange(t2, 'sq_violin_2') &&
      pitchInPartRange(t3, 'sq_viola')
    ) {
      return { vn1: t1, vn2: t2, va: t3 };
    }
  }
  return {
    vn1: fitPitch(vn1, 'sq_violin_1'),
    vn2: fitPitch(vn2, 'sq_violin_2'),
    va: fitPitch(va, 'sq_viola'),
  };
}

function planingPitches(
  chordSymbol: string,
  shape: PlaningShape,
  anchorRole: ChordRole = 'third',
  octaveShift = 1,
): { vn1: number; vn2: number; va: number } {
  const anchor = chordPitchForPart(chordSymbol, 'sq_violin_1', anchorRole, octaveShift);
  const [o1, o2, o3] = PLANING_OFFSETS[shape];
  return fitPlaningBlock(anchor + o1, anchor + o2, anchor + o3);
}

function fitPitch(pitch: number, partId: string): number {
  const [lo, hi] = getLeadSheetPartMidiBounds(partId);
  let out = pitch;
  while (out < lo) out += 12;
  while (out > hi) out -= 12;
  return Math.max(lo, Math.min(hi, out));
}

function ensureMeasure(part: ScoreModel['parts'][number], bar: number): MeasureModel {
  let measure = part.measures.find((m) => m.index === bar);
  if (!measure) {
    measure = { index: bar, events: [] };
    part.measures.push(measure);
  }
  return measure;
}

function replaceAccompanimentVoice1(measure: MeasureModel, notes: NoteEvent[]): void {
  const keep = measure.events.filter((e) => e.kind !== 'note' || (e.voice ?? 1) !== 1);
  measure.events = [...keep, ...notes].sort((a, b) => a.startBeat - b.startBeat);
}

function buildCelloAnchor(
  chordSymbol: string,
  ownerPartId: string,
  duration = BEATS_PER_MEASURE,
  onset = 0,
  role: ChordRole = 'root',
  octaveShift = -1,
): NoteEvent[] {
  if (ownerPartId === 'sq_cello') return [];
  return [
    createNote(
      chordPitchForPart(chordSymbol, 'sq_cello', role, octaveShift),
      snap16(onset),
      snapDur(duration),
      1,
    ),
  ];
}

function buildSparseBar(
  chordSymbol: string,
  bar: number,
  seed: number,
  ownerPartId: string,
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();
  const u = seededUnit(seed, bar, 0, 'sparse');

  if (ownerPartId !== 'sq_cello') {
    out.set('sq_cello', buildCelloAnchor(chordSymbol, ownerPartId, BEATS_PER_MEASURE, 0, 'root', -1));
  }

  if (u < 0.5) {
    if (ownerPartId !== 'sq_viola') {
      out.set('sq_viola', [
        createNote(chordPitchForPart(chordSymbol, 'sq_viola', 'third'), 0, BEATS_PER_MEASURE, 1),
      ]);
    }
  } else if (ownerPartId !== 'sq_violin_2') {
    out.set('sq_violin_2', [
      createNote(chordPitchForPart(chordSymbol, 'sq_violin_2', 'fifth', 1), snap16(0.5), snapDur(3.5), 1),
    ]);
  }

  return out;
}

function buildWashBar(
  chordSymbol: string,
  bar: number,
  seed: number,
  ownerPartId: string,
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();
  const shape = planingShapeForBar(bar, seed);
  const block = planingPitches(chordSymbol, shape, 'third', 1);
  const stagger = [0, 0.75, 1.5];

  if (ownerPartId !== 'sq_cello') {
    out.set('sq_cello', buildCelloAnchor(chordSymbol, ownerPartId, BEATS_PER_MEASURE, 0, 'root', -1));
  }

  const upper: Array<[StringPartId, number]> = [
    ['sq_violin_1', block.vn1],
    ['sq_violin_2', block.vn2],
    ['sq_viola', block.va],
  ];

  upper.forEach(([partId, pitch], i) => {
    if (ownerPartId === partId) return;
    const onset = snap16(stagger[i] ?? 0);
    const dur = snapDur(BEATS_PER_MEASURE - onset + (i === 0 ? 0.5 : 0));
    out.set(partId, [createNote(pitch, onset, dur, 1)]);
  });

  return out;
}

function buildFullColourBar(
  chordSymbol: string,
  bar: number,
  seed: number,
  ownerPartId: string,
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();
  const shape = planingShapeForBar(bar, seed);
  const block = planingPitches(chordSymbol, shape, 'seventh', 1);
  const colourOnsets = [0, 0.5, 1.25, 2];

  if (ownerPartId !== 'sq_cello') {
    const root = chordPitchForPart(chordSymbol, 'sq_cello', 'root', -1);
    const step = chordPitchForPart(chordSymbol, 'sq_cello', 'third', -1);
    out.set('sq_cello', [
      createNote(root, 0, 2, 1),
      createNote(step, 2, 2, 1),
    ]);
  }

  const layers: Array<[StringPartId, number, number]> = [
    ['sq_violin_1', block.vn1, colourOnsets[0]!],
    ['sq_violin_2', block.vn2, colourOnsets[1]!],
    ['sq_viola', block.va, colourOnsets[2]!],
  ];

  for (const [partId, pitch, onsetRaw] of layers) {
    if (ownerPartId === partId) continue;
    const onset = snap16(onsetRaw);
    const dur = snapDur(BEATS_PER_MEASURE - onset + 0.75);
    const notes = [createNote(block.vn1, onset, dur, 1)];
    if (partId === 'sq_violin_2' && ownerPartId !== 'sq_violin_2') {
      notes.push(createNote(block.va, snap16(colourOnsets[3]!), snapDur(1.75), 1));
    }
    out.set(partId, notes);
  }

  return out;
}

function buildHushBar(
  chordSymbol: string,
  bar: number,
  ownerPartId: string,
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();
  const hushIdx = bar - 25;

  if (hushIdx === 0) {
    if (ownerPartId !== 'sq_cello') {
      out.set('sq_cello', buildCelloAnchor(chordSymbol, ownerPartId, BEATS_PER_MEASURE, 0, 'fifth', -1));
    }
    return out;
  }

  if (hushIdx === 1) {
    if (ownerPartId !== 'sq_cello') {
      out.set('sq_cello', buildCelloAnchor(chordSymbol, ownerPartId, BEATS_PER_MEASURE, 0, 'root', -2));
    }
    if (ownerPartId !== 'sq_viola') {
      out.set('sq_viola', [
        createNote(chordPitchForPart(chordSymbol, 'sq_viola', 'third'), snap16(1.5), snapDur(2.5), 1),
      ]);
    }
    return out;
  }

  if (hushIdx === 2) {
    if (ownerPartId !== 'sq_viola') {
      const p = chordPitchForPart(chordSymbol, 'sq_viola', 'fifth');
      out.set('sq_viola', [createNote(p, 0, BEATS_PER_MEASURE, 1)]);
    }
    return out;
  }

  if (ownerPartId !== 'sq_cello') {
    out.set('sq_cello', buildCelloAnchor(chordSymbol, ownerPartId, BEATS_PER_MEASURE, 0, 'root', -1));
  }
  if (ownerPartId !== 'sq_violin_1') {
    out.set('sq_violin_1', [
      createNote(chordPitchForPart(chordSymbol, 'sq_violin_1', 'third', 1), snap16(2), snapDur(2), 1),
    ]);
  }
  return out;
}

function buildReturnColourBar(
  chordSymbol: string,
  bar: number,
  seed: number,
  ownerPartId: string,
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();
  const shape = planingShapeForBar(bar, seed);
  const block = planingPitches(chordSymbol, shape, 'third', 1);
  const onsets = [0.25, 1, 1.75];

  if (ownerPartId !== 'sq_cello') {
    out.set('sq_cello', [
      createNote(chordPitchForPart(chordSymbol, 'sq_cello', 'root', -1), 0, BEATS_PER_MEASURE, 1),
    ]);
  }

  const planed: Array<[StringPartId, number]> = [
    ['sq_violin_1', block.vn1],
    ['sq_violin_2', block.vn2],
    ['sq_viola', block.va],
  ];

  planed.forEach(([partId, pitch], i) => {
    if (ownerPartId === partId) return;
    const onset = snap16(onsets[i] ?? 0);
    out.set(partId, [createNote(pitch, onset, snapDur(BEATS_PER_MEASURE - onset + 0.5), 1)]);
  });

  if (ownerPartId !== 'sq_violin_2') {
    const existing = out.get('sq_violin_2') ?? [];
    out.set('sq_violin_2', [
      ...existing,
      createNote(block.vn1, snap16(2.5), snapDur(1.5), 1),
    ]);
  }

  return out;
}

function buildBarAccompaniment(
  bar: number,
  chordSymbol: string,
  seed: number,
  ownerPartId: string,
): Map<StringPartId, NoteEvent[]> {
  const texture = textureStateForBar(bar);
  const phase = macroPhaseForBar(bar);

  if (texture === 'sparse') return buildSparseBar(chordSymbol, bar, seed, ownerPartId);
  if (texture === 'hush') return buildHushBar(chordSymbol, bar, ownerPartId);
  if (texture === 'full_colour') return buildFullColourBar(chordSymbol, bar, seed, ownerPartId);
  if (phase === 'return_colour') return buildReturnColourBar(chordSymbol, bar, seed, ownerPartId);
  return buildWashBar(chordSymbol, bar, seed, ownerPartId);
}

function detectPlaningInBar(score: ScoreModel, bar: number): boolean {
  const upperIds: StringPartId[] = ['sq_violin_1', 'sq_violin_2', 'sq_viola'];
  const pitches: number[] = [];
  for (const partId of upperIds) {
    const part = score.parts.find((p) => p.id === partId);
    const measure = part?.measures.find((m) => m.index === bar);
    const note = measure?.events.find((e) => e.kind === 'note' && (e.voice ?? 1) === 1);
    if (note?.kind === 'note') pitches.push(note.pitch);
  }
  if (pitches.length < 2) return false;
  const sorted = [...pitches].sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) intervals.push(sorted[i]! - sorted[i - 1]!);
  const parallel = new Set([3, 4, 5, 7]);
  if (intervals.length < 2) return parallel.has(intervals[0]!);
  return intervals[0] === intervals[1] && parallel.has(intervals[0]!);
}

export function analyzeLeadSheetDebussyContrastArc(score: ScoreModel): LeadSheetDebussyContrastArcBarDiagnostics[] {
  const bars = new Set<number>();
  for (const part of score.parts) {
    for (const m of part.measures) bars.add(m.index);
  }
  return [...bars].sort((a, b) => a - b).map((bar) => {
    let activeVoiceCount = 0;
    let attackCount = 0;
    for (const part of score.parts) {
      if (!isLeadSheetStringPartId(part.id)) continue;
      const measure = part.measures.find((m) => m.index === bar);
      const notes = measure?.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) ?? [];
      if (notes.length > 0) activeVoiceCount += 1;
      attackCount += notes.length;
    }
    const macroPhase = macroPhaseForBar(bar);
    const textureState = textureStateForBar(bar);
    const planingDetected =
      (textureState === 'wash' || textureState === 'full_colour' || macroPhase === 'return_colour') &&
      detectPlaningInBar(score, bar);
    return {
      bar,
      macroPhase,
      textureState,
      activeVoiceCount,
      attackCount,
      planingDetected,
    };
  });
}

function formatBarRanges(bars: number[]): string {
  if (bars.length === 0) return 'none';
  const ranges: string[] = [];
  let start = bars[0]!;
  let prev = bars[0]!;
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i]!;
    if (b === prev + 1) {
      prev = b;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = b;
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return ranges.join(', ');
}

export function applyLeadSheetDebussyContrastArcPass(
  input: LeadSheetDebussyContrastArcInput,
): LeadSheetDebussyContrastArcResult {
  const seed = input.seed ?? 90106;
  const score = structuredClone(input.score) as ScoreModel;
  const totalBars = input.appliedHarmonyBars.length;

  for (let bar = 1; bar <= totalBars; bar++) {
    const ownerPartId = ownerForBar(input.perBarMelodyOwnership, bar);
    const chordSymbol = input.appliedHarmonyBars[bar - 1] ?? 'C';
    const partNotes = buildBarAccompaniment(bar, chordSymbol, seed, ownerPartId);

    for (const partId of STRING_PART_IDS) {
      if (partId === ownerPartId) continue;
      const part = score.parts.find((p) => p.id === partId);
      if (!part) continue;
      const measure = ensureMeasure(part, bar);
      replaceAccompanimentVoice1(measure, partNotes.get(partId) ?? []);
    }
  }

  for (const part of score.parts) {
    if (!isLeadSheetStringPartId(part.id)) continue;
    part.measures.sort((a, b) => a.index - b.index);
  }

  const finalBars = analyzeLeadSheetDebussyContrastArc(score);
  const sparseBars = finalBars.filter((b) => b.textureState === 'sparse').map((b) => b.bar);
  const washBars = finalBars.filter((b) => b.textureState === 'wash').map((b) => b.bar);
  const fullBars = finalBars.filter((b) => b.textureState === 'full_colour').map((b) => b.bar);
  const hushBars = finalBars.filter((b) => b.textureState === 'hush').map((b) => b.bar);
  const planingBars = finalBars.filter((b) => b.planingDetected).map((b) => b.bar);

  return {
    score,
    diagnostics: {
      bars: finalBars,
      sparseRegion: formatBarRanges(sparseBars),
      washRegion: formatBarRanges(washBars),
      fullColourRegion: formatBarRanges(fullBars),
      hushRegion: formatBarRanges(hushBars),
      planingPresent: planingBars.length > 0,
      planingRegions: formatBarRanges(planingBars),
    },
  };
}
