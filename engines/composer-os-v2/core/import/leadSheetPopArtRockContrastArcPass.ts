/**
 * Art Rock pop contrast arc - leadsheet quintet import pass.
 * Runs after identity-cell echo; before guitar chording (art_rock skips chording pass).
 * Guitar voice-2 planed power-comp + string build/peak arc; never alters guitar melody (voice 1).
 */

import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { BEATS_PER_MEASURE, type MeasureModel, type NoteEvent, type ScoreModel } from '../score-model/scoreModelTypes';
import { createNote } from '../score-model/scoreEventBuilder';
import type { PerBarMelodyOwnership } from './debussyLeadSheetMelodyHandoffPlan';
import { getLeadSheetPartMidiBounds, isLeadSheetStringPartId } from './leadSheetPartMidiBounds';
import { SIXTEENTH_GRID_BEATS } from './leadSheetQuintetSixteenthGridClampPass';

const STRING_PART_IDS = ['sq_violin_1', 'sq_violin_2', 'sq_viola', 'sq_cello'] as const;
type StringPartId = (typeof STRING_PART_IDS)[number];

const BACKBEAT_ONSETS = [1, 3] as const;
const PHRASE_END_BARS = new Set([4, 8, 12, 16, 20, 24, 28, 32, 36, 40]);
const PEAK_BARS = new Set([25, 26, 27, 28]);

export type ArtRockMacroPhase = 'sparse' | 'emerging' | 'build' | 'peak' | 'tail';
export type ArtRockTextureState = 'breath' | 'pulse' | 'planed' | 'anthemic' | 'hush';

export interface LeadSheetPopArtRockContrastArcBarDiagnostics {
  bar: number;
  macroPhase: ArtRockMacroPhase;
  textureState: ArtRockTextureState;
  guitarAttackCount: number;
  stringAttackCount: number;
  attackCount: number;
  backbeatPresent?: boolean;
  planedPowerPresent?: boolean;
  sus4ColourPresent?: boolean;
}

export interface LeadSheetPopArtRockContrastArcDiagnostics {
  bars: LeadSheetPopArtRockContrastArcBarDiagnostics[];
  sparseRegion: string;
  buildRegion: string;
  peakRegion: string;
  tailRegion: string;
  planingPresent: boolean;
}

export interface LeadSheetPopArtRockContrastArcInput {
  score: ScoreModel;
  appliedHarmonyBars: readonly string[];
  perBarMelodyOwnership: readonly PerBarMelodyOwnership[];
  seed?: number;
}

export interface LeadSheetPopArtRockContrastArcResult {
  score: ScoreModel;
  diagnostics: LeadSheetPopArtRockContrastArcDiagnostics;
}

type ChordRole = 'root' | 'third' | 'fifth';

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

export function macroPhaseForArtRockBar(bar: number): ArtRockMacroPhase {
  if (bar <= 8) return 'sparse';
  if (bar <= 16) return 'emerging';
  if (bar <= 24) return 'build';
  if (bar <= 28) return 'peak';
  return 'tail';
}

function textureStateForBar(bar: number): ArtRockTextureState {
  const phase = macroPhaseForArtRockBar(bar);
  if (phase === 'sparse') return 'breath';
  if (phase === 'emerging') return 'pulse';
  if (phase === 'build') return 'planed';
  if (phase === 'peak') return 'anthemic';
  return 'hush';
}

function isPhraseEndBar(bar: number): boolean {
  return PHRASE_END_BARS.has(bar);
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
  };
  let pitch = pool[role] ?? tones.root ?? 60;
  pitch += octaveShift * 12;
  const [lo, hi] = getLeadSheetPartMidiBounds(partId);
  while (pitch < lo) pitch += 12;
  while (pitch > hi) pitch -= 12;
  return Math.max(lo, Math.min(hi, pitch));
}

function planedPowerGrip(chordSymbol: string, sus4Colour: boolean): { root: number; planed: number[] } {
  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });
  let root = tones.root ?? 57;
  while (root < 48) root += 12;
  while (root > 60) root -= 12;
  if (sus4Colour) {
    const fourth = root + 5;
    const fifth = tones.fifth ?? root + 7;
    return { root, planed: [root, fourth, fifth > fourth ? fifth : fourth + 2] };
  }
  const fifth = tones.fifth ?? root + 7;
  const voicedFifth = fifth < root + 5 ? fifth + 12 : fifth;
  return { root, planed: [root, root, voicedFifth] };
}

function backbeatOnsetsForPhase(phase: ArtRockMacroPhase, bar: number, seed: number): number[] {
  const u = seededUnit(seed, bar, 0, 'backbeat');
  if (phase === 'sparse') {
    return u < 0.45 ? [3] : u < 0.75 ? [1] : [];
  }
  if (phase === 'emerging') {
    return u < 0.2 ? [0] : [...BACKBEAT_ONSETS];
  }
  if (phase === 'build') {
    const onsets: number[] = [...BACKBEAT_ONSETS];
    if (u < 0.35) onsets.unshift(0);
    if (PEAK_BARS.has(bar) && u > 0.55) onsets.push(2);
    return [...new Set(onsets)].sort((a, b) => a - b);
  }
  if (phase === 'peak') {
    const onsets: number[] = [0, ...BACKBEAT_ONSETS];
    if (bar === 26) onsets.push(0.5, 2, 2.5, 3.5);
    return [...new Set(onsets.map(snap16))].filter((o) => o < BEATS_PER_MEASURE).sort((a, b) => a - b);
  }
  return u < 0.4 ? [3] : [];
}

function hitDurationForPhase(phase: ArtRockMacroPhase, onset: number): number {
  if (phase === 'peak' && onset >= 0 && onset < 1) return snapDur(1);
  if (phase === 'sparse' || phase === 'tail') return snapDur(2);
  if (phase === 'emerging') return snapDur(1.5);
  return snapDur(Math.min(2, BEATS_PER_MEASURE - onset));
}

function ensureMeasure(part: ScoreModel['parts'][number], bar: number): MeasureModel {
  let measure = part.measures.find((m) => m.index === bar);
  if (!measure) {
    measure = { index: bar, events: [] };
    part.measures.push(measure);
  }
  return measure;
}

function replaceGuitarVoice2(measure: MeasureModel, notes: NoteEvent[]): void {
  const keep = measure.events.filter((e) => e.kind !== 'note' || (e.voice ?? 1) !== 2);
  measure.events = [...keep, ...notes].sort((a, b) => a.startBeat - b.startBeat);
}

function replaceAccompanimentVoice1(measure: MeasureModel, notes: NoteEvent[]): void {
  const keep = measure.events.filter((e) => e.kind !== 'note' || (e.voice ?? 1) !== 1);
  measure.events = [...keep, ...notes].sort((a, b) => a.startBeat - b.startBeat);
}

function buildGuitarV2ForBar(bar: number, chordSymbol: string, seed: number): NoteEvent[] {
  const phase = macroPhaseForArtRockBar(bar);
  const sus4Colour = isPhraseEndBar(bar) && phase !== 'sparse';
  const grip = planedPowerGrip(chordSymbol, sus4Colour);
  const onsets = backbeatOnsetsForPhase(phase, bar, seed);
  return onsets.map((onset) => {
    const duration = hitDurationForPhase(phase, onset);
    return createNote(grip.root, snap16(onset), duration, 2, undefined, grip.planed);
  });
}

function buildStringBar(
  bar: number,
  chordSymbol: string,
  ownerPartId: string,
  seed: number,
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();
  const phase = macroPhaseForArtRockBar(bar);
  if (phase === 'sparse' || phase === 'tail') return out;

  const vn1: StringPartId = 'sq_violin_1';
  const vn2: StringPartId = 'sq_violin_2';
  const va: StringPartId = 'sq_viola';
  const vc: StringPartId = 'sq_cello';

  if (phase === 'emerging') {
    if (ownerPartId !== va) {
      out.set(va, [createNote(chordPitchForPart(chordSymbol, va, 'fifth'), 0, 4, 1)]);
    }
    return out;
  }

  const u = seededUnit(seed, bar, 3, 'strings');
  if (phase === 'build') {
    if (ownerPartId !== vn1 && u < 0.7) {
      out.set(vn1, [createNote(chordPitchForPart(chordSymbol, vn1, 'root', 1), 0, 4, 1)]);
    }
    if (ownerPartId !== vn2) {
      out.set(vn2, [createNote(chordPitchForPart(chordSymbol, vn2, 'third', 1), 0, 2, 1)]);
    }
    if (ownerPartId !== vc) {
      out.set(vc, [createNote(chordPitchForPart(chordSymbol, vc, 'root', -1), 2, 2, 1)]);
    }
    return out;
  }

  if (ownerPartId !== vn1) {
    out.set(vn1, [createNote(chordPitchForPart(chordSymbol, vn1, 'root', 1), 0, 4, 1)]);
  }
  if (ownerPartId !== vn2 && bar !== 26) {
    out.set(vn2, [createNote(chordPitchForPart(chordSymbol, vn2, 'fifth', 1), 0, 4, 1)]);
  }
  if (ownerPartId !== va) {
    out.set(va, [createNote(chordPitchForPart(chordSymbol, va, 'third'), 1, 1, 1)]);
  }
  if (ownerPartId !== vc) {
    out.set(vc, [createNote(chordPitchForPart(chordSymbol, vc, 'root', -1), 3, 1, 1)]);
  }
  return out;
}

function countGuitarAttacks(score: ScoreModel, bar: number): number {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  const measure = guitar?.measures.find((m) => m.index === bar);
  const notes = measure?.events.filter((e) => e.kind === 'note') ?? [];
  const seen = new Set<string>();
  let count = 0;
  for (const n of notes) {
    const key = `${n.voice ?? 1}:${n.startBeat.toFixed(3)}:${n.pitch}`;
    if (seen.has(key)) continue;
    seen.add(key);
    count += 1;
  }
  return count;
}

function countStringAttacks(score: ScoreModel, bar: number): number {
  let count = 0;
  for (const partId of STRING_PART_IDS) {
    const part = score.parts.find((p) => p.id === partId);
    const measure = part?.measures.find((m) => m.index === bar);
    count += measure?.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1).length ?? 0;
  }
  return count;
}

export function analyzeLeadSheetPopArtRockContrastArc(
  score: ScoreModel,
): LeadSheetPopArtRockContrastArcBarDiagnostics[] {
  const bars = new Set<number>();
  for (const part of score.parts) {
    for (const m of part.measures) bars.add(m.index);
  }
  return [...bars].sort((a, b) => a - b).map((bar) => {
    const guitarAttackCount = countGuitarAttacks(score, bar);
    const stringAttackCount = countStringAttacks(score, bar);
    const phase = macroPhaseForArtRockBar(bar);
    const guitar = score.parts.find((p) => p.id === 'guitar');
    const measure = guitar?.measures.find((m) => m.index === bar);
    const v2 = measure?.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 2) ?? [];
    const backbeatPresent = v2.some((n) => BACKBEAT_ONSETS.some((b) => Math.abs(n.startBeat - b) < 0.02));
    const planedPowerPresent = v2.some((n) => (n.pitches?.length ?? 0) >= 2);
    const sus4ColourPresent = isPhraseEndBar(bar) && planedPowerPresent && phase !== 'sparse';
    return {
      bar,
      macroPhase: phase,
      textureState: textureStateForBar(bar),
      guitarAttackCount,
      stringAttackCount,
      attackCount: guitarAttackCount + stringAttackCount,
      backbeatPresent,
      planedPowerPresent,
      sus4ColourPresent,
    };
  });
}

export function measureArtRockDensityRegionAverages(
  bars: readonly LeadSheetPopArtRockContrastArcBarDiagnostics[],
): {
  intro: number;
  buildPeak: number;
  tail: number;
  peakMax: number;
} {
  const avg = (from: number, to: number) => {
    const rows = bars.filter((b) => b.bar >= from && b.bar <= to);
    if (rows.length === 0) return 0;
    return rows.reduce((s, r) => s + r.attackCount, 0) / rows.length;
  };
  const peakRows = bars.filter((b) => b.bar >= 25 && b.bar <= 28);
  return {
    intro: avg(1, 8),
    buildPeak: avg(17, 28),
    tail: avg(29, 40),
    peakMax: peakRows.reduce((m, r) => Math.max(m, r.attackCount), 0),
  };
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
    ranges.push(start === prev ? String(start) : `${start}-${prev}`);
    start = prev = b;
  }
  ranges.push(start === prev ? String(start) : `${start}-${prev}`);
  return ranges.join(', ');
}

export function applyLeadSheetPopArtRockContrastArcPass(
  input: LeadSheetPopArtRockContrastArcInput,
): LeadSheetPopArtRockContrastArcResult {
  const seed = input.seed ?? 90106;
  const score = structuredClone(input.score) as ScoreModel;
  const totalBars = input.appliedHarmonyBars.length;
  const guitar = score.parts.find((p) => p.id === 'guitar');

  for (let bar = 1; bar <= totalBars; bar++) {
    const chordSymbol = input.appliedHarmonyBars[bar - 1] ?? 'C';
    const ownerPartId = ownerForBar(input.perBarMelodyOwnership, bar);

    if (guitar) {
      const measure = ensureMeasure(guitar, bar);
      replaceGuitarVoice2(measure, buildGuitarV2ForBar(bar, chordSymbol, seed));
    }

    const stringNotes = buildStringBar(bar, chordSymbol, ownerPartId, seed);
    for (const partId of STRING_PART_IDS) {
      if (partId === ownerPartId) continue;
      const part = score.parts.find((p) => p.id === partId);
      if (!part) continue;
      const measure = ensureMeasure(part, bar);
      replaceAccompanimentVoice1(measure, stringNotes.get(partId) ?? []);
    }
  }

  for (const part of score.parts) {
    if (isLeadSheetStringPartId(part.id) || part.id === 'guitar') {
      part.measures.sort((a, b) => a.index - b.index);
    }
  }

  const finalBars = analyzeLeadSheetPopArtRockContrastArc(score);
  const sparseBars = finalBars.filter((b) => b.macroPhase === 'sparse').map((b) => b.bar);
  const buildBars = finalBars.filter((b) => b.macroPhase === 'build').map((b) => b.bar);
  const peakBars = finalBars.filter((b) => b.macroPhase === 'peak').map((b) => b.bar);
  const tailBars = finalBars.filter((b) => b.macroPhase === 'tail').map((b) => b.bar);

  return {
    score,
    diagnostics: {
      bars: finalBars,
      sparseRegion: formatBarRanges(sparseBars),
      buildRegion: formatBarRanges(buildBars),
      peakRegion: formatBarRanges(peakBars),
      tailRegion: formatBarRanges(tailBars),
      planingPresent: finalBars.some((b) => b.planedPowerPresent),
    },
  };
}
