/**
 * Phase C - Kenny Wheeler-only leadsheet quintet contrast arc (import-layer).
 * Runs after Phase B identity-cell echo; before 16th-note clamp.
 * Reshapes string accompaniment only - never guitar or owner melody voice-1 pitch order.
 * Lyrical jazz profile: guide-tone inner lines, call-and-response, loose syncopation.
 */

import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { BEATS_PER_MEASURE, type MeasureModel, type NoteEvent, type ScoreModel } from '../score-model/scoreModelTypes';
import { createNote } from '../score-model/scoreEventBuilder';
import type { PerBarMelodyOwnership } from './debussyLeadSheetMelodyHandoffPlan';
import { getLeadSheetPartMidiBounds, isLeadSheetStringPartId } from './leadSheetPartMidiBounds';
import { SIXTEENTH_GRID_BEATS } from './leadSheetQuintetSixteenthGridClampPass';

const STRING_PART_IDS = ['sq_violin_1', 'sq_violin_2', 'sq_viola', 'sq_cello'] as const;
type StringPartId = (typeof STRING_PART_IDS)[number];

export type KennyMacroPhase = 'sparse' | 'emerging' | 'full' | 'breath' | 'return';
export type KennyTextureState =
  | 'melody_led'
  | 'guide_emerging'
  | 'conversational'
  | 'full_jazz'
  | 'breath_space'
  | 'return_conversation';

export interface LeadSheetKennyWheelerContrastArcBarDiagnostics {
  bar: number;
  macroPhase: KennyMacroPhase;
  textureState: KennyTextureState;
  activeVoiceCount: number;
  attackCount: number;
  guideTonePresent?: boolean;
  callResponsePresent?: boolean;
}

export interface LeadSheetKennyWheelerContrastArcDiagnostics {
  bars: LeadSheetKennyWheelerContrastArcBarDiagnostics[];
  sparseRegion: string;
  guideToneRegion: string;
  callResponseRegion: string;
  fullJazzRegion: string;
  breathRegion: string;
  returnRegion: string;
  cadentialRegion: string;
}

export interface LeadSheetKennyWheelerContrastArcInput {
  score: ScoreModel;
  appliedHarmonyBars: readonly string[];
  perBarMelodyOwnership: readonly PerBarMelodyOwnership[];
  seed?: number;
}

export interface LeadSheetKennyWheelerContrastArcResult {
  score: ScoreModel;
  diagnostics: LeadSheetKennyWheelerContrastArcDiagnostics;
}

type ChordRole = 'root' | 'third' | 'fifth' | 'seventh';

const JAZZ_SYNC_ONSETS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] as const;
const CADENTIAL_BARS = new Set([8, 16, 24, 32, 40]);

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

function macroPhaseForBar(bar: number): KennyMacroPhase {
  if (bar <= 8) return 'sparse';
  if (bar <= 16) return 'emerging';
  if (bar <= 24) return 'full';
  if (bar <= 28) return 'breath';
  return 'return';
}

function textureStateForBar(bar: number): KennyTextureState {
  const phase = macroPhaseForBar(bar);
  if (phase === 'sparse') return 'melody_led';
  if (phase === 'emerging') return 'guide_emerging';
  if (phase === 'full') return 'conversational';
  if (phase === 'breath') return 'breath_space';
  return 'return_conversation';
}

function isCadentialBar(bar: number): boolean {
  return CADENTIAL_BARS.has(bar);
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

function guitarPhraseEndBeat(score: ScoreModel, bar: number): number | undefined {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  const measure = guitar?.measures.find((m) => m.index === bar);
  const notes = measure?.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) ?? [];
  if (notes.length === 0) return undefined;
  let end = 0;
  for (const n of notes) {
    const beatEnd = n.startBeat + n.durationBeats;
    if (Number.isFinite(beatEnd)) end = Math.max(end, beatEnd);
  }
  return end > 0 && Number.isFinite(end) ? end : undefined;
}

function lastGuitarPitch(score: ScoreModel, bar: number): number | undefined {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  const measure = guitar?.measures.find((m) => m.index === bar);
  const notes = (measure?.events ?? [])
    .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat);
  return notes[notes.length - 1]?.pitch;
}

function pickGuidePitch(
  chordSymbol: string,
  partId: StringPartId,
  lastPitch: number | undefined,
  slot: number,
): number {
  const third = chordPitchForPart(chordSymbol, partId, 'third');
  const seventh = chordPitchForPart(chordSymbol, partId, 'seventh');
  const candidates = slot % 2 === 0 ? [third, seventh, third + 12] : [seventh, third, seventh - 12];
  if (lastPitch === undefined) return candidates[0]!;
  let best = candidates[0]!;
  let bestCost = Math.abs(best - lastPitch) + (Math.abs(best - lastPitch) > 7 ? 4 : 0);
  for (const c of candidates) {
    const step = Math.abs(c - lastPitch);
    const cost = step + (step > 4 ? 3 : 0);
    if (cost < bestCost) {
      best = c;
      bestCost = cost;
    }
  }
  const [lo, hi] = getLeadSheetPartMidiBounds(partId);
  while (best < lo) best += 12;
  while (best > hi) best -= 12;
  return Math.max(lo, Math.min(hi, best));
}

function buildGuideToneLine(
  chordSymbol: string,
  partId: StringPartId,
  bar: number,
  seed: number,
  noteCount: number,
  lastPitch: number | undefined,
): { notes: NoteEvent[]; lastPitch: number } {
  const onsets = JAZZ_SYNC_ONSETS.filter((_, i) => i % 2 === (bar % 2)).slice(0, noteCount);
  const notes: NoteEvent[] = [];
  let prev = lastPitch;
  for (let i = 0; i < noteCount; i++) {
    const pitch = pickGuidePitch(chordSymbol, partId, prev, i + bar);
    const onset = snap16(onsets[i] ?? i * 1.5);
    const dur = snapDur(i === noteCount - 1 ? BEATS_PER_MEASURE - onset + 0.25 : 1.25 + seededUnit(seed, bar, i, 'gt') * 0.5);
    notes.push(createNote(pitch, onset, dur, 1));
    prev = pitch;
  }
  return { notes, lastPitch: prev ?? notes[notes.length - 1]!.pitch };
}

function buildCallResponseNotes(
  score: ScoreModel,
  chordSymbol: string,
  bar: number,
  seed: number,
  ownerPartId: string,
  answerPartId: StringPartId,
): NoteEvent[] {
  if (ownerPartId === answerPartId) return [];
  const phraseEnd = guitarPhraseEndBeat(score, bar);
  if (phraseEnd === undefined || !Number.isFinite(phraseEnd) || phraseEnd >= 3.25) return [];
  if (seededUnit(seed, bar, 3, 'cr') < 0.35) return [];

  const gPitch = lastGuitarPitch(score, bar);
  const anchor = gPitch ?? chordPitchForPart(chordSymbol, answerPartId, 'third');
  const answerPitch = pickGuidePitch(chordSymbol, answerPartId, anchor - (answerPartId === 'sq_viola' ? 0 : 7), bar);
  const onset = snap16(Math.min(phraseEnd + 0.25, BEATS_PER_MEASURE - 0.5));
  const dur = snapDur(0.75 + seededUnit(seed, bar, 4, 'crDur') * 0.5);
  return [createNote(answerPitch, onset, dur, 1)];
}

function buildWalkingCello(
  chordSymbol: string,
  bar: number,
  seed: number,
  ownerPartId: string,
): NoteEvent[] {
  if (ownerPartId === 'sq_cello') return [];
  const roles: ChordRole[] = ['root', 'third', 'fifth', 'seventh'];
  const onsets = [0, 1.5, 2.5, 3.5];
  return roles.map((role, i) =>
    createNote(
      chordPitchForPart(chordSymbol, 'sq_cello', role, -1),
      snap16(onsets[i]!),
      snapDur(0.75),
      1,
    ),
  );
}

function buildCadentialVoicing(
  chordSymbol: string,
  ownerPartId: string,
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();
  const layers: Array<[StringPartId, ChordRole, number, number]> = [
    ['sq_cello', 'root', -1, 0],
    ['sq_viola', 'seventh', 0, 0.5],
    ['sq_violin_2', 'third', 1, 1],
    ['sq_violin_1', 'fifth', 1, 1.5],
  ];
  for (const [partId, role, oct, onset] of layers) {
    if (partId === ownerPartId) continue;
    out.set(partId, [
      createNote(chordPitchForPart(chordSymbol, partId, role, oct), snap16(onset), snapDur(BEATS_PER_MEASURE - onset + 0.25), 1),
    ]);
  }
  return out;
}

function mergePartNotes(
  target: Map<StringPartId, NoteEvent[]>,
  partId: StringPartId,
  notes: NoteEvent[],
): void {
  if (notes.length === 0) return;
  const existing = target.get(partId) ?? [];
  target.set(partId, [...existing, ...notes].sort((a, b) => a.startBeat - b.startBeat));
}

function buildSparseBar(
  chordSymbol: string,
  bar: number,
  seed: number,
  ownerPartId: string,
  score: ScoreModel,
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();
  const u = seededUnit(seed, bar, 0, 'sparse');

  if (ownerPartId !== 'sq_cello' && u < 0.7) {
    out.set('sq_cello', [
      createNote(chordPitchForPart(chordSymbol, 'sq_cello', 'root', -1), 0, BEATS_PER_MEASURE, 1),
    ]);
  }

  if (u > 0.45 && ownerPartId !== 'sq_violin_2') {
    mergePartNotes(out, 'sq_violin_2', buildCallResponseNotes(score, chordSymbol, bar, seed, ownerPartId, 'sq_violin_2'));
  }

  return out;
}

function buildEmergingBar(
  chordSymbol: string,
  bar: number,
  seed: number,
  ownerPartId: string,
  score: ScoreModel,
  guideState: { vn2?: number; va?: number },
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();

  if (ownerPartId !== 'sq_cello') {
    out.set('sq_cello', [
      createNote(chordPitchForPart(chordSymbol, 'sq_cello', 'root', -1), snap16(0.5), snapDur(3.5), 1),
    ]);
  }

  if (ownerPartId !== 'sq_violin_2') {
    const vn2Line = buildGuideToneLine(chordSymbol, 'sq_violin_2', bar, seed, 2, guideState.vn2);
    guideState.vn2 = vn2Line.lastPitch;
    out.set('sq_violin_2', vn2Line.notes);
  }

  if (ownerPartId !== 'sq_viola') {
    const vaLine = buildGuideToneLine(chordSymbol, 'sq_viola', bar, seed + 17, 2, guideState.va);
    guideState.va = vaLine.lastPitch;
    out.set('sq_viola', vaLine.notes);
  }

  mergePartNotes(out, 'sq_violin_2', buildCallResponseNotes(score, chordSymbol, bar, seed, ownerPartId, 'sq_violin_2'));
  mergePartNotes(out, 'sq_viola', buildCallResponseNotes(score, chordSymbol, bar, seed + 31, ownerPartId, 'sq_viola'));

  return out;
}

function buildFullJazzBar(
  chordSymbol: string,
  bar: number,
  seed: number,
  ownerPartId: string,
  score: ScoreModel,
  guideState: { vn2?: number; va?: number },
): Map<StringPartId, NoteEvent[]> {
  if (isCadentialBar(bar)) {
    return buildCadentialVoicing(chordSymbol, ownerPartId);
  }

  const out = new Map<StringPartId, NoteEvent[]>();

  if (ownerPartId !== 'sq_cello') {
    mergePartNotes(out, 'sq_cello', buildWalkingCello(chordSymbol, bar, seed, ownerPartId));
  }

  if (ownerPartId !== 'sq_violin_2') {
    const vn2Line = buildGuideToneLine(chordSymbol, 'sq_violin_2', bar, seed, 3, guideState.vn2);
    guideState.vn2 = vn2Line.lastPitch;
    out.set('sq_violin_2', vn2Line.notes);
  }

  if (ownerPartId !== 'sq_viola') {
    const vaLine = buildGuideToneLine(chordSymbol, 'sq_viola', bar, seed + 23, 3, guideState.va);
    guideState.va = vaLine.lastPitch;
    out.set('sq_viola', vaLine.notes);
  }

  mergePartNotes(out, 'sq_violin_2', buildCallResponseNotes(score, chordSymbol, bar, seed, ownerPartId, 'sq_violin_2'));
  mergePartNotes(out, 'sq_viola', buildCallResponseNotes(score, chordSymbol, bar, seed + 41, ownerPartId, 'sq_viola'));

  return out;
}

function buildBreathBar(
  chordSymbol: string,
  bar: number,
  ownerPartId: string,
): Map<StringPartId, NoteEvent[]> {
  const out = new Map<StringPartId, NoteEvent[]>();
  const breathIdx = bar - 25;

  if (breathIdx <= 1 && ownerPartId !== 'sq_cello') {
    out.set('sq_cello', [
      createNote(chordPitchForPart(chordSymbol, 'sq_cello', 'root', -1), 0, BEATS_PER_MEASURE, 1),
    ]);
    return out;
  }

  if (breathIdx === 2 && ownerPartId !== 'sq_viola') {
    out.set('sq_viola', [
      createNote(chordPitchForPart(chordSymbol, 'sq_viola', 'seventh'), snap16(1.5), snapDur(2.5), 1),
    ]);
    return out;
  }

  if (ownerPartId !== 'sq_cello') {
    out.set('sq_cello', [
      createNote(chordPitchForPart(chordSymbol, 'sq_cello', 'fifth', -1), snap16(2), snapDur(2), 1),
    ]);
  }
  return out;
}

function buildReturnBar(
  chordSymbol: string,
  bar: number,
  seed: number,
  ownerPartId: string,
  score: ScoreModel,
  guideState: { vn2?: number; va?: number },
): Map<StringPartId, NoteEvent[]> {
  if (isCadentialBar(bar)) {
    return buildCadentialVoicing(chordSymbol, ownerPartId);
  }

  const out = new Map<StringPartId, NoteEvent[]>();
  const walk = seededUnit(seed, bar, 1, 'retWalk') > 0.35;

  if (ownerPartId !== 'sq_cello') {
    if (walk) {
      mergePartNotes(out, 'sq_cello', buildWalkingCello(chordSymbol, bar, seed, ownerPartId));
    } else {
      out.set('sq_cello', [
        createNote(chordPitchForPart(chordSymbol, 'sq_cello', 'root', -1), snap16(0.5), snapDur(3.5), 1),
        createNote(chordPitchForPart(chordSymbol, 'sq_cello', 'third', -1), snap16(2.5), snapDur(1.5), 1),
      ]);
    }
  }

  if (ownerPartId !== 'sq_violin_2') {
    const vn2Line = buildGuideToneLine(chordSymbol, 'sq_violin_2', bar, seed, 3, guideState.vn2);
    guideState.vn2 = vn2Line.lastPitch;
    out.set('sq_violin_2', vn2Line.notes);
  }

  if (ownerPartId !== 'sq_viola') {
    const vaLine = buildGuideToneLine(chordSymbol, 'sq_viola', bar, seed + 11, 2, guideState.va);
    guideState.va = vaLine.lastPitch;
    out.set('sq_viola', vaLine.notes);
  }

  mergePartNotes(out, 'sq_violin_2', buildCallResponseNotes(score, chordSymbol, bar, seed, ownerPartId, 'sq_violin_2'));
  mergePartNotes(out, 'sq_viola', buildCallResponseNotes(score, chordSymbol, bar, seed + 53, ownerPartId, 'sq_viola'));

  return out;
}

function buildBarAccompaniment(
  bar: number,
  chordSymbol: string,
  seed: number,
  ownerPartId: string,
  score: ScoreModel,
  guideState: { vn2?: number; va?: number },
): Map<StringPartId, NoteEvent[]> {
  const phase = macroPhaseForBar(bar);
  if (phase === 'sparse') return buildSparseBar(chordSymbol, bar, seed, ownerPartId, score);
  if (phase === 'emerging') return buildEmergingBar(chordSymbol, bar, seed, ownerPartId, score, guideState);
  if (phase === 'full') return buildFullJazzBar(chordSymbol, bar, seed, ownerPartId, score, guideState);
  if (phase === 'breath') return buildBreathBar(chordSymbol, bar, ownerPartId);
  return buildReturnBar(chordSymbol, bar, seed, ownerPartId, score, guideState);
}

function detectGuideToneInBar(score: ScoreModel, bar: number): boolean {
  for (const partId of ['sq_violin_2', 'sq_viola'] as const) {
    const part = score.parts.find((p) => p.id === partId);
    const measure = part?.measures.find((m) => m.index === bar);
    const notes = measure?.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) ?? [];
    if (notes.length >= 2) return true;
  }
  return false;
}

function detectCallResponseInBar(score: ScoreModel, bar: number): boolean {
  const phraseEnd = guitarPhraseEndBeat(score, bar);
  if (phraseEnd === undefined || !Number.isFinite(phraseEnd) || phraseEnd >= 3.25) return false;
  for (const partId of STRING_PART_IDS) {
    const part = score.parts.find((p) => p.id === partId);
    const measure = part?.measures.find((m) => m.index === bar);
    const notes = measure?.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) ?? [];
    if (notes.some((n) => n.startBeat >= phraseEnd - 0.01 && n.startBeat <= phraseEnd + 1.5)) return true;
  }
  return false;
}

export function analyzeLeadSheetKennyWheelerContrastArc(
  score: ScoreModel,
): LeadSheetKennyWheelerContrastArcBarDiagnostics[] {
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
    return {
      bar,
      macroPhase: macroPhaseForBar(bar),
      textureState: textureStateForBar(bar),
      activeVoiceCount,
      attackCount,
      guideTonePresent: detectGuideToneInBar(score, bar),
      callResponsePresent: detectCallResponseInBar(score, bar),
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
    ranges.push(start === prev ? String(start) : start + '-' + prev);
    start = prev = b;
  }
  ranges.push(start === prev ? String(start) : start + '-' + prev);
  return ranges.join(', ');
}

export function applyLeadSheetKennyWheelerContrastArcPass(
  input: LeadSheetKennyWheelerContrastArcInput,
): LeadSheetKennyWheelerContrastArcResult {
  const seed = input.seed ?? 90106;
  const score = structuredClone(input.score) as ScoreModel;
  const totalBars = input.appliedHarmonyBars.length;
  const guideState: { vn2?: number; va?: number } = {};

  for (let bar = 1; bar <= totalBars; bar++) {
    const ownerPartId = ownerForBar(input.perBarMelodyOwnership, bar);
    const chordSymbol = input.appliedHarmonyBars[bar - 1] ?? 'C';
    const partNotes = buildBarAccompaniment(bar, chordSymbol, seed, ownerPartId, score, guideState);

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

  const finalBars = analyzeLeadSheetKennyWheelerContrastArc(score);
  const sparseBars = finalBars.filter((b) => b.macroPhase === 'sparse').map((b) => b.bar);
  const guideBars = finalBars.filter((b) => b.guideTonePresent).map((b) => b.bar);
  const crBars = finalBars.filter((b) => b.callResponsePresent).map((b) => b.bar);
  const fullBars = finalBars.filter((b) => b.macroPhase === 'full').map((b) => b.bar);
  const breathBars = finalBars.filter((b) => b.macroPhase === 'breath').map((b) => b.bar);
  const returnBars = finalBars.filter((b) => b.macroPhase === 'return').map((b) => b.bar);
  const cadentialBars = finalBars.filter((b) => isCadentialBar(b.bar)).map((b) => b.bar);

  return {
    score,
    diagnostics: {
      bars: finalBars,
      sparseRegion: formatBarRanges(sparseBars),
      guideToneRegion: formatBarRanges(guideBars),
      callResponseRegion: formatBarRanges(crBars),
      fullJazzRegion: formatBarRanges(fullBars),
      breathRegion: formatBarRanges(breathBars),
      returnRegion: formatBarRanges(returnBars),
      cadentialRegion: formatBarRanges(cadentialBars),
    },
  };
}
