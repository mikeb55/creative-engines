/**
 * Phase C - Bartok-only leadsheet quintet contrast / tension arc (import-layer).
 * Runs after Phase B identity-cell echo; before 16th-note clamp.
 * Reshapes string accompaniment only - never guitar or owner melody voice-1 pitch order.
 */

import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { BEATS_PER_MEASURE, type MeasureModel, type NoteEvent, type ScoreModel } from '../score-model/scoreModelTypes';
import { createNote } from '../score-model/scoreEventBuilder';
import type { PerBarMelodyOwnership } from './debussyLeadSheetMelodyHandoffPlan';
import { getLeadSheetPartMidiBounds, isLeadSheetStringPartId } from './leadSheetPartMidiBounds';
import { SIXTEENTH_GRID_BEATS } from './leadSheetQuintetSixteenthGridClampPass';

const STRING_PART_IDS = ['sq_violin_1', 'sq_violin_2', 'sq_viola', 'sq_cello'] as const;
type StringPartId = (typeof STRING_PART_IDS)[number];

const AKSAK_GROUPINGS: readonly (readonly number[])[] = [
  [3, 3, 2],
  [2, 3, 3],
  [3, 2, 3],
];

export type BartokMacroPhase = 'restrained' | 'building' | 'dense' | 'fracture' | 'intense';
export type BartokTextureState = 'sparse' | 'active_inner' | 'dense' | 'fracture';

export interface LeadSheetBartokContrastArcBarDiagnostics {
  bar: number;
  macroPhase: BartokMacroPhase;
  textureState: BartokTextureState;
  activeVoiceCount: number;
  attackCount: number;
  aksakGrouping?: string;
}

export interface LeadSheetBartokContrastArcDiagnostics {
  bars: LeadSheetBartokContrastArcBarDiagnostics[];
  sparseRegion: string;
  denseRegion: string;
  fractureRegion: string;
  aksakPresent: boolean;
}

export interface LeadSheetBartokContrastArcInput {
  score: ScoreModel;
  appliedHarmonyBars: readonly string[];
  perBarMelodyOwnership: readonly PerBarMelodyOwnership[];
  seed?: number;
}

export interface LeadSheetBartokContrastArcResult {
  score: ScoreModel;
  diagnostics: LeadSheetBartokContrastArcDiagnostics;
}

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

function macroPhaseForBar(bar: number): BartokMacroPhase {
  if (bar <= 8) return 'restrained';
  if (bar <= 16) return 'building';
  if (bar <= 24) return 'dense';
  if (bar <= 28) return 'fracture';
  return 'intense';
}

function textureStateForBar(bar: number): BartokTextureState {
  const phase = macroPhaseForBar(bar);
  if (phase === 'restrained') return 'sparse';
  if (phase === 'building') return 'active_inner';
  if (phase === 'dense' || phase === 'intense') return 'dense';
  return 'fracture';
}

function aksakGroupingForBar(bar: number, seed: number): readonly number[] {
  const idx = (bar + seed) % AKSAK_GROUPINGS.length;
  return AKSAK_GROUPINGS[idx]!;
}

function aksakAccentOnsets(grouping: readonly number[], beatSpan = BEATS_PER_MEASURE): number[] {
  const eighthBeat = 0.5;
  const onsets: number[] = [0];
  let eighth = 0;
  for (let i = 0; i < grouping.length - 1; i++) {
    eighth += grouping[i]!;
    const beat = eighth * eighthBeat;
    if (beat < beatSpan) onsets.push(beat);
  }
  return onsets.map(snap16);
}

function aksakInnerOnsets(grouping: readonly number[], beatSpan = BEATS_PER_MEASURE): number[] {
  const eighthBeat = 0.5;
  const onsets: number[] = [];
  let eighth = 0;
  for (const g of grouping) {
    onsets.push(snap16(eighth * eighthBeat));
    if (g >= 2) {
      const mid = eighth + Math.floor(g / 2);
      onsets.push(snap16(mid * eighthBeat));
    }
    eighth += g;
  }
  return [...new Set(onsets)].filter((o) => o < beatSpan).sort((a, b) => a - b);
}

type ChordRole = 'root' | 'third' | 'fifth' | 'seventh';

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

function buildSparseBar(
  chordSymbol: string,
  bar: number,
  seed: number,
  ownerPartId: string,
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();
  const u = seededUnit(seed, bar, 0, 'sparse');
  const violaPart: StringPartId = 'sq_viola';
  const celloPart: StringPartId = 'sq_cello';
  const vn1Part: StringPartId = 'sq_violin_1';

  if (u < 0.55) {
    if (ownerPartId !== violaPart) {
      out.set(violaPart, [createNote(chordPitchForPart(chordSymbol, violaPart, 'third'), 0, 4, 1)]);
    }
    if (ownerPartId !== celloPart) {
      out.set(celloPart, [createNote(chordPitchForPart(chordSymbol, celloPart, 'root', -1), 0, 4, 1)]);
    }
  } else {
    if (ownerPartId !== vn1Part) {
      out.set(vn1Part, [createNote(chordPitchForPart(chordSymbol, vn1Part, 'fifth', 1), 0, 4, 1)]);
    }
    if (ownerPartId !== celloPart) {
      out.set(celloPart, [createNote(chordPitchForPart(chordSymbol, celloPart, 'root', -1), 0, 4, 1)]);
    }
  }
  return out;
}

function buildActiveInnerBar(
  chordSymbol: string,
  ownerPartId: string,
  grouping: readonly number[],
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();
  const accents = aksakAccentOnsets(grouping);
  const inner = aksakInnerOnsets(grouping);

  const vn2: StringPartId = 'sq_violin_2';
  const va: StringPartId = 'sq_viola';
  const vn1: StringPartId = 'sq_violin_1';
  const vc: StringPartId = 'sq_cello';

  if (ownerPartId !== vn2) {
    const notes: NoteEvent[] = inner.map((onset, i) => {
      const role: ChordRole = i % 2 === 0 ? 'third' : 'fifth';
      const isAccent = accents.some((a) => Math.abs(a - onset) < 0.01);
      const dur = snapDur(isAccent ? 0.5 : 0.25);
      return createNote(chordPitchForPart(chordSymbol, vn2, role), onset, dur, 1);
    });
    out.set(vn2, notes);
  }

  if (ownerPartId !== va) {
    const notes: NoteEvent[] = inner.map((onset, i) => {
      const role: ChordRole = i % 2 === 0 ? 'fifth' : 'third';
      const isAccent = accents.some((a) => Math.abs(a - onset) < 0.01);
      const dur = snapDur(isAccent ? 0.5 : 0.25);
      return createNote(
        chordPitchForPart(chordSymbol, va, role, i > 2 ? 1 : 0),
        snap16(onset + (i % 2 === 1 ? 0.25 : 0)),
        dur,
        1,
      );
    });
    out.set(va, notes);
  }

  if (ownerPartId !== vn1) {
    out.set(vn1, [
      createNote(chordPitchForPart(chordSymbol, vn1, 'fifth', 1), 0, 2, 1),
      createNote(chordPitchForPart(chordSymbol, vn1, 'root', 1), 2, 2, 1),
    ]);
  }

  if (ownerPartId !== vc) {
    out.set(vc, [
      createNote(chordPitchForPart(chordSymbol, vc, 'root', -1), 0, snap16(accents[1] ?? 2), 1),
      createNote(
        chordPitchForPart(chordSymbol, vc, 'fifth', -1),
        snap16(accents[1] ?? 2),
        snap16(4 - (accents[1] ?? 2)),
        1,
      ),
    ]);
  }

  return out;
}

function buildDenseBar(
  chordSymbol: string,
  ownerPartId: string,
  grouping: readonly number[],
  intense: boolean,
): Map<StringPartId, NoteEvent[]> {
  const out = buildActiveInnerBar(chordSymbol, ownerPartId, grouping);

  const vn1: StringPartId = 'sq_violin_1';
  const vc: StringPartId = 'sq_cello';
  const accents = aksakAccentOnsets(grouping);

  if (ownerPartId !== vn1) {
    out.set(vn1, [
      createNote(chordPitchForPart(chordSymbol, vn1, 'third', 1), 0, 1, 1),
      createNote(chordPitchForPart(chordSymbol, vn1, 'fifth', 1), 1, 1, 1),
      createNote(chordPitchForPart(chordSymbol, vn1, 'seventh', 1), 2, 1, 1),
      createNote(chordPitchForPart(chordSymbol, vn1, 'root', 1), 3, 1, 1),
    ]);
  }

  if (ownerPartId !== vc) {
    if (intense) {
      const notes: NoteEvent[] = accents.map((onset, i) =>
        createNote(
          chordPitchForPart(chordSymbol, vc, i % 2 === 0 ? 'root' : 'fifth', -1),
          onset,
          snapDur(0.75),
          1,
        ),
      );
      out.set(vc, notes);
    } else {
      out.set(vc, [
        createNote(chordPitchForPart(chordSymbol, vc, 'root', -1), 0, 1.5, 1),
        createNote(chordPitchForPart(chordSymbol, vc, 'fifth', -1), 1.5, 1, 1),
        createNote(chordPitchForPart(chordSymbol, vc, 'root', -1), 2.5, 1.5, 1),
      ]);
    }
  }

  return out;
}

function buildFractureBar(
  chordSymbol: string,
  bar: number,
  ownerPartId: string,
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();
  const fractureIdx = bar - 25;

  if (fractureIdx === 0) {
    if (ownerPartId !== 'sq_cello') {
      out.set('sq_cello', [
        createNote(chordPitchForPart(chordSymbol, 'sq_cello', 'root', -1), 0, 4, 1),
      ]);
    }
    return out;
  }

  if (fractureIdx === 1) {
    const pitch = chordPitchForPart(chordSymbol, 'sq_violin_1', 'third', 1);
    if (ownerPartId !== 'sq_violin_1') {
      out.set('sq_violin_1', [createNote(pitch, 0, 4, 1)]);
    }
    if (ownerPartId !== 'sq_violin_2') {
      out.set('sq_violin_2', [createNote(pitch + 1, 0, 4, 1)]);
    }
    return out;
  }

  if (fractureIdx === 2) {
    if (ownerPartId !== 'sq_cello') {
      out.set('sq_cello', [
        createNote(chordPitchForPart(chordSymbol, 'sq_cello', 'root', -2), 0, 4, 1),
      ]);
    }
    if (ownerPartId !== 'sq_viola') {
      out.set('sq_viola', [
        createNote(chordPitchForPart(chordSymbol, 'sq_viola', 'fifth', -1), 0, 4, 1),
      ]);
    }
    return out;
  }

  if (ownerPartId !== 'sq_viola') {
    out.set('sq_viola', [
      createNote(chordPitchForPart(chordSymbol, 'sq_viola', 'third'), 0, 4, 1),
      createNote(chordPitchForPart(chordSymbol, 'sq_viola', 'seventh', 0), 0, 4, 1),
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
  const textureState = textureStateForBar(bar);
  const grouping = aksakGroupingForBar(bar, seed);

  if (textureState === 'sparse') {
    return buildSparseBar(chordSymbol, bar, seed, ownerPartId);
  }
  if (textureState === 'fracture') {
    return buildFractureBar(chordSymbol, bar, ownerPartId);
  }
  if (textureState === 'active_inner') {
    return buildActiveInnerBar(chordSymbol, ownerPartId, grouping);
  }
  const intense = macroPhaseForBar(bar) === 'intense';
  return buildDenseBar(chordSymbol, ownerPartId, grouping, intense);
}

export function analyzeLeadSheetBartokContrastArc(score: ScoreModel): LeadSheetBartokContrastArcBarDiagnostics[] {
  const bars = new Set<number>();
  for (const part of score.parts) {
    for (const m of part.measures) bars.add(m.index);
  }
  return [...bars].sort((a, b) => a - b).map((bar) => {
    let activeVoiceCount = 0;
    let attackCount = 0;
    for (const part of score.parts) {
      const measure = part.measures.find((m) => m.index === bar);
      const notes = measure?.events.filter((e) => e.kind === 'note') ?? [];
      if (notes.length > 0) activeVoiceCount += 1;
      attackCount += notes.length;
    }
    const macroPhase = macroPhaseForBar(bar);
    return {
      bar,
      macroPhase,
      textureState: textureStateForBar(bar),
      activeVoiceCount,
      attackCount,
      aksakGrouping:
        macroPhase === 'building' || macroPhase === 'dense' || macroPhase === 'intense'
          ? aksakGroupingForBar(bar, 90106).join('+')
          : undefined,
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

export function applyLeadSheetBartokContrastArcPass(
  input: LeadSheetBartokContrastArcInput,
): LeadSheetBartokContrastArcResult {
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

  const finalBars = analyzeLeadSheetBartokContrastArc(score);
  const sparseBars = finalBars.filter((b) => b.textureState === 'sparse').map((b) => b.bar);
  const denseBars = finalBars.filter((b) => b.textureState === 'dense').map((b) => b.bar);
  const fractureBars = finalBars.filter((b) => b.textureState === 'fracture').map((b) => b.bar);
  const aksakPresent = finalBars.some(
    (b) => b.macroPhase === 'building' || b.macroPhase === 'dense' || b.macroPhase === 'intense',
  );

  return {
    score,
    diagnostics: {
      bars: finalBars,
      sparseRegion: formatBarRanges(sparseBars),
      denseRegion: formatBarRanges(denseBars),
      fractureRegion: formatBarRanges(fractureBars),
      aksakPresent,
    },
  };
}
