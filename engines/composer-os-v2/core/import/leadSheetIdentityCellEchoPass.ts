/**
 * Phase B - Identity Cell Echo post-pass (import-layer only).
 * Restates opening bars 1-2 melodic cell at structural anchors with varied echo + answer countervoices.
 * Runs after Phase A rhythm anti-loop; never mutates owner melody voice-1 pitch order.
 */

import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { BEATS_PER_MEASURE, type MeasureModel, type NoteEvent, type ScoreModel } from '../score-model/scoreModelTypes';
import { createNote } from '../score-model/scoreEventBuilder';
import type { ImportMelodyNote } from './mosaicImportTimeline';
import type { PerBarMelodyOwnership } from './debussyLeadSheetMelodyHandoffPlan';
import { fitMelodyPitchesToPartRange, getLeadSheetPartMidiBounds, isLeadSheetStringPartId } from './leadSheetPartMidiBounds';

const STRING_PART_IDS = ['sq_violin_1', 'sq_violin_2', 'sq_viola', 'sq_cello'] as const;
const ANCHOR_BARS = [14, 28, 38] as const;
const ECHO_VOICE = 2;
const ANSWER_VOICE = 2;
const MOTIF_REF = 'identityCellEcho';

/** Design fallback when import bars 1-2 are empty. D4-A4-G4-F4 + A4 pickup; kernel [+7,-2,-2]. */
const CANONICAL_OPENING_CELL: readonly ImportMelodyNote[] = [
  { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 62, confidence: 1, fieldOrigin: 'defaulted' },
  { bar: 1, onsetBeat: 1, durationBeats: 0.5, midiPitch: 69, confidence: 1, fieldOrigin: 'defaulted' },
  { bar: 1, onsetBeat: 1.5, durationBeats: 0.5, midiPitch: 67, confidence: 1, fieldOrigin: 'defaulted' },
  { bar: 1, onsetBeat: 2, durationBeats: 2, midiPitch: 65, confidence: 1, fieldOrigin: 'defaulted' },
  { bar: 2, onsetBeat: 0, durationBeats: 0.5, midiPitch: 69, confidence: 1, fieldOrigin: 'defaulted' },
];

export type IdentityCellEchoVariant = 'truncate' | 'compress' | 'fragment';
export type IdentityCellAnswerMode = 'imitation' | 'sequence' | 'call_and_response';

export interface IdentityCellShape {
  notes: Array<{
    barOffset: number;
    onsetBeat: number;
    durationBeats: number;
    midiPitch: number;
  }>;
  kernel: number[];
}

export interface LeadSheetIdentityCellEchoAnchorDiagnostics {
  anchorBar: number;
  echoPartId: string;
  answerPartId: string;
  echoVariant: IdentityCellEchoVariant;
  answerMode: IdentityCellAnswerMode;
  echoNoteCount: number;
  answerNoteCount: number;
}

export interface LeadSheetIdentityCellEchoDiagnostics {
  identityCellKernel: number[];
  identityCellNoteCount: number;
  anchors: LeadSheetIdentityCellEchoAnchorDiagnostics[];
}

export interface LeadSheetIdentityCellEchoInput {
  score: ScoreModel;
  melodyLine: readonly ImportMelodyNote[];
  perBarMelodyOwnership: readonly PerBarMelodyOwnership[];
  appliedHarmonyBars?: readonly string[];
  seed?: number;
}

export interface LeadSheetIdentityCellEchoResult {
  score: ScoreModel;
  diagnostics: LeadSheetIdentityCellEchoDiagnostics;
}

type PlannedNote = { bar: number; onsetBeat: number; durationBeats: number; midiPitch: number };

function seededUnit(seed: number, bar: number, slot: number, tag: string): number {
  let h = seed ^ (bar * 7919) ^ (slot * 104729);
  for (let i = 0; i < tag.length; i++) h = (h * 41 + tag.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000;
}

function ownerForBar(ownership: readonly PerBarMelodyOwnership[], bar: number): string {
  return ownership.find((o) => o.bar === bar)?.ownerPartId ?? 'guitar';
}

function openingMelodyNotes(melodyLine: readonly ImportMelodyNote[]): ImportMelodyNote[] {
  const fromImport = melodyLine
    .filter((n) => n.bar === 1 || n.bar === 2)
    .sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  return fromImport.length > 0 ? fromImport : CANONICAL_OPENING_CELL.map((n) => ({ ...n }));
}

export function extractOpeningIdentityCell(melodyLine: readonly ImportMelodyNote[]): IdentityCellShape {
  const opening = openingMelodyNotes(melodyLine);
  const notes = opening.map((n) => ({
    barOffset: n.bar - 1,
    onsetBeat: n.onsetBeat,
    durationBeats: n.durationBeats,
    midiPitch: n.midiPitch,
  }));
  const kernel: number[] = [];
  for (let i = 1; i < Math.min(4, notes.length); i++) {
    kernel.push(notes[i]!.midiPitch - notes[i - 1]!.midiPitch);
  }
  if (kernel.length === 0) kernel.push(7, -2, -2);
  return { notes, kernel };
}

function anchorConfig(anchorIndex: number): {
  echoVariant: IdentityCellEchoVariant;
  answerMode: IdentityCellAnswerMode;
} {
  if (anchorIndex === 0) return { echoVariant: 'truncate', answerMode: 'imitation' };
  if (anchorIndex === 1) return { echoVariant: 'compress', answerMode: 'sequence' };
  return { echoVariant: 'fragment', answerMode: 'call_and_response' };
}

function pickStringParts(
  anchorBar: number,
  ownerPartId: string,
  seed: number,
  anchorIndex: number,
): { echoPartId: string; answerPartId: string } {
  const candidates = STRING_PART_IDS.filter((id) => id !== ownerPartId);
  const echoIdx = anchorIndex % candidates.length;
  const echoPartId = candidates[echoIdx]!;
  const answerCandidates = candidates.filter((id) => id !== echoPartId);
  const answerIdx =
    Math.floor(seededUnit(seed, anchorBar, anchorIndex, 'answerPart') * answerCandidates.length) %
    answerCandidates.length;
  const answerPartId = answerCandidates[answerIdx] ?? answerCandidates[0]!;
  return { echoPartId, answerPartId };
}

function cellToPlannedNotes(cell: IdentityCellShape, anchorBar: number): PlannedNote[] {
  return cell.notes.map((n) => ({
    bar: anchorBar + n.barOffset,
    onsetBeat: n.onsetBeat,
    durationBeats: n.durationBeats,
    midiPitch: n.midiPitch,
  }));
}

function truncateEcho(notes: PlannedNote[]): PlannedNote[] {
  const sorted = [...notes].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  const anchorStartBar = sorted[0]?.bar ?? 1;
  const withoutPickup = sorted.filter((n) => n.bar <= anchorStartBar);
  const core = withoutPickup.length >= 3 ? withoutPickup.slice(0, 4) : sorted.slice(0, 4);
  const noTail = core.filter((n, i) => i < core.length - 1 || n.bar === core[0]!.bar);
  return noTail.map((n, i) => ({
    ...n,
    durationBeats: Math.max(0.25, n.durationBeats * (i === noTail.length - 1 ? 0.75 : 1)),
  }));
}

function compressEcho(notes: PlannedNote[]): PlannedNote[] {
  return notes.map((n) => ({
    ...n,
    durationBeats: Math.max(0.25, n.durationBeats * 0.5),
  }));
}

function fragmentEcho(notes: PlannedNote[]): PlannedNote[] {
  const sorted = [...notes].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  const out: PlannedNote[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (i < 2) {
      out.push({ ...n, durationBeats: Math.max(0.25, n.durationBeats * 0.6) });
      continue;
    }
    out.push({
      ...n,
      onsetBeat: n.onsetBeat + 0.25,
      durationBeats: Math.max(0.25, n.durationBeats * 0.35),
    });
  }
  return out;
}

function applyEchoVariant(notes: PlannedNote[], variant: IdentityCellEchoVariant): PlannedNote[] {
  if (variant === 'truncate') return truncateEcho(notes);
  if (variant === 'compress') return compressEcho(notes);
  return fragmentEcho(notes);
}

function fitNotesToPart(notes: PlannedNote[], partId: string): PlannedNote[] {
  const pitches = fitMelodyPitchesToPartRange(
    notes.map((n) => n.midiPitch),
    partId,
  );
  return notes.map((n, i) => ({ ...n, midiPitch: pitches[i]! }));
}

function buildImitationAnswer(echoNotes: PlannedNote[], partId: string): PlannedNote[] {
  const delay = 1;
  const shifted = echoNotes.map((n) => ({
    ...n,
    onsetBeat: n.onsetBeat + delay,
    durationBeats: Math.max(0.25, n.durationBeats * 0.85),
    midiPitch: n.midiPitch - 12,
  }));
  return fitNotesToPart(shifted, partId);
}

function buildSequenceAnswer(
  echoNotes: PlannedNote[],
  kernel: number[],
  partId: string,
  seed: number,
  anchorBar: number,
): PlannedNote[] {
  const seqStep = seededUnit(seed, anchorBar, 2, 'seq') < 0.5 ? 4 : 5;
  const first = echoNotes[0];
  if (!first) return [];
  let pitch = first.midiPitch + seqStep;
  const [lo, hi] = getLeadSheetPartMidiBounds(partId);
  if (pitch > hi) pitch -= 12;
  if (pitch < lo) pitch += 12;

  const out: PlannedNote[] = [];
  let bar = first.bar;
  let onset = first.onsetBeat + 0.5;
  out.push({ bar, onsetBeat: onset, durationBeats: 0.5, midiPitch: pitch });
  for (const step of kernel) {
    pitch += step;
    onset += 0.5;
    if (onset >= BEATS_PER_MEASURE) {
      onset -= BEATS_PER_MEASURE;
      bar += 1;
    }
    out.push({ bar, onsetBeat: onset, durationBeats: 0.45, midiPitch: pitch });
  }
  return fitNotesToPart(out, partId);
}

function snapPitchNearChordTone(pitch: number, chordSymbol: string, partId: string): number {
  const tones = chordTonesForChordSymbol(chordSymbol, { lockedHarmony: true });
  const pool = [tones.root, tones.third, tones.fifth, tones.seventh].filter(
    (p): p is number => typeof p === 'number' && Number.isFinite(p),
  );
  const [lo, hi] = getLeadSheetPartMidiBounds(partId);
  let best = pitch;
  let bestDist = 999;
  for (const base of pool) {
    for (const oct of [-24, -12, 0, 12, 24]) {
      const candidate = base + oct;
      if (candidate < lo || candidate > hi) continue;
      const d = Math.abs(candidate - pitch);
      if (d < bestDist) {
        bestDist = d;
        best = candidate;
      }
    }
  }
  return best;
}

function buildCallAndResponseAnswer(
  echoNotes: PlannedNote[],
  kernel: number[],
  partId: string,
  anchorBar: number,
  chordSymbol: string,
): PlannedNote[] {
  const sorted = [...echoNotes].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  const pivot = sorted[Math.floor(sorted.length / 2)] ?? sorted[0];
  if (!pivot) return [];

  const invKernel = [...kernel].reverse().map((k) => -k);
  let pitch = pivot.midiPitch - 7;
  pitch = snapPitchNearChordTone(pitch, chordSymbol, partId);

  const startBeat = pivot.onsetBeat + pivot.durationBeats + 0.25;
  let bar = pivot.bar;
  let onset = startBeat;
  if (onset >= BEATS_PER_MEASURE) {
    bar += 1;
    onset -= BEATS_PER_MEASURE;
  }

  const out: PlannedNote[] = [{ bar, onsetBeat: onset, durationBeats: 0.5, midiPitch: pitch }];
  for (const step of invKernel) {
    pitch += step;
    onset += 0.625;
    if (onset >= BEATS_PER_MEASURE) {
      onset -= BEATS_PER_MEASURE;
      bar += 1;
    }
    out.push({
      bar,
      onsetBeat: onset,
      durationBeats: 0.4,
      midiPitch: snapPitchNearChordTone(pitch, chordSymbol, partId),
    });
  }

  if (bar === anchorBar + 1 && onset > BEATS_PER_MEASURE - 0.5) {
    out.pop();
  }
  return fitNotesToPart(out, partId);
}

function ensureMeasure(part: ScoreModel['parts'][number], bar: number): MeasureModel {
  let measure = part.measures.find((m) => m.index === bar);
  if (!measure) {
    measure = { index: bar, events: [] };
    part.measures.push(measure);
  }
  return measure;
}

function appendPlannedNotes(
  score: ScoreModel,
  partId: string,
  notes: PlannedNote[],
  voice: number,
): number {
  if (!isLeadSheetStringPartId(partId)) return 0;
  const part = score.parts.find((p) => p.id === partId);
  if (!part) return 0;

  let added = 0;
  for (const n of notes) {
    const measure = ensureMeasure(part, n.bar);
    const event = createNote(n.midiPitch, n.onsetBeat, n.durationBeats, voice, MOTIF_REF);
    measure.events = [...measure.events, event].sort((a, b) => a.startBeat - b.startBeat);
    added += 1;
  }
  part.measures.sort((a, b) => a.index - b.index);
  return added;
}

function clampNoteToMeasure(n: PlannedNote): PlannedNote {
  let { onsetBeat, durationBeats, bar } = n;
  durationBeats = Math.max(0.25, Math.min(durationBeats, BEATS_PER_MEASURE - 0.01));
  if (onsetBeat + durationBeats > BEATS_PER_MEASURE) {
    durationBeats = Math.max(0.25, BEATS_PER_MEASURE - onsetBeat);
  }
  onsetBeat = Math.max(0, Math.min(onsetBeat, BEATS_PER_MEASURE - durationBeats));
  return { ...n, bar, onsetBeat, durationBeats };
}

export function applyLeadSheetIdentityCellEchoPass(
  input: LeadSheetIdentityCellEchoInput,
): LeadSheetIdentityCellEchoResult {
  const seed = input.seed ?? 90106;
  const score = structuredClone(input.score) as ScoreModel;
  const cell = extractOpeningIdentityCell(input.melodyLine);
  const anchorDiagnostics: LeadSheetIdentityCellEchoAnchorDiagnostics[] = [];

  ANCHOR_BARS.forEach((anchorBar, anchorIndex) => {
    const ownerPartId = ownerForBar(input.perBarMelodyOwnership, anchorBar);
    const { echoPartId, answerPartId } = pickStringParts(anchorBar, ownerPartId, seed, anchorIndex);
    const { echoVariant, answerMode } = anchorConfig(anchorIndex);

    const basePlanned = cellToPlannedNotes(cell, anchorBar).map(clampNoteToMeasure);
    const echoPlanned = fitNotesToPart(applyEchoVariant(basePlanned, echoVariant), echoPartId).map(
      clampNoteToMeasure,
    );

    const chordSymbol = input.appliedHarmonyBars?.[anchorBar - 1] ?? 'C';
    let answerPlanned: PlannedNote[] = [];
    if (answerMode === 'imitation') {
      answerPlanned = buildImitationAnswer(echoPlanned, answerPartId).map(clampNoteToMeasure);
    } else if (answerMode === 'sequence') {
      answerPlanned = buildSequenceAnswer(echoPlanned, cell.kernel, answerPartId, seed, anchorBar).map(
        clampNoteToMeasure,
      );
    } else {
      answerPlanned = buildCallAndResponseAnswer(
        echoPlanned,
        cell.kernel,
        answerPartId,
        anchorBar,
        chordSymbol,
      ).map(clampNoteToMeasure);
    }

    const echoCount = appendPlannedNotes(score, echoPartId, echoPlanned, ECHO_VOICE);
    const answerCount = appendPlannedNotes(score, answerPartId, answerPlanned, ANSWER_VOICE);

    anchorDiagnostics.push({
      anchorBar,
      echoPartId,
      answerPartId,
      echoVariant,
      answerMode,
      echoNoteCount: echoCount,
      answerNoteCount: answerCount,
    });
  });

  return {
    score,
    diagnostics: {
      identityCellKernel: cell.kernel,
      identityCellNoteCount: cell.notes.length,
      anchors: anchorDiagnostics,
    },
  };
}

/** Owner melody voice-1 pitch order fingerprint (all owned bars). */
export function leadSheetOwnerMelodyPitchOrderKey(
  score: ScoreModel,
  perBarMelodyOwnership: readonly PerBarMelodyOwnership[],
): string {
  const chunks: string[] = [];
  for (const o of perBarMelodyOwnership) {
    const part = score.parts.find((p) => p.id === o.ownerPartId);
    const measure = part?.measures.find((m) => m.index === o.bar);
    const pitches = (measure?.events ?? [])
      .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
      .sort((a, b) => a.startBeat - b.startBeat)
      .map((e) => e.pitch);
    chunks.push(`${o.bar}:${o.ownerPartId}:${pitches.join(',')}`);
  }
  return chunks.join('|');
}
