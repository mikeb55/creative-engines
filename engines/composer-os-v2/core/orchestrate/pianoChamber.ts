/**
 * Composer OS V3.5 Phase 1 — piano to chamber.
 * One branch of orchestrate(). Ten single-player parts. No divisi.
 * Inferred roles stay proposals until the musician confirms them.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planDensityCurve, getDensityForBar } from '../density/densityCurvePlanner';
import { runEnsembleExportPipeline } from '../export/ensembleExport';
import { writeScoreMidi } from '../export/midiScoreWriter';
import { midiOfPitch } from '../performance-composer/pcChord';
import { discoverMotifs } from '../motif-ops/motifDiscovery';
import { applyOperator } from '../motif-ops/operators';
import type { Motif, OperatorId } from '../motif-ops/types';
import { buildCoherenceReport } from '../musical-evaluation/coherenceReport';
import { buildOrchestrationReport } from '../musical-evaluation/orchestrationReport';
import type { CanonicalEvent } from '../musical-evaluation/canonicalScore';
import { getEnsembleFamilyProfile } from '../orchestration/ensembleFamilyProfiles';
import { planDensityOwnership } from '../orchestration/densityOwnershipPlanner';
import { planRegisterOwnership } from '../orchestration/registerOwnershipPlanner';
import { planTextureOwnership } from '../orchestration/textureOwnershipPlanner';
import type { RegisterBand } from '../orchestration/orchestrationTypes';
import { q, qAdd, qCmp, qEq, qSub, qToNumber, type ExactQuarter } from '../piano/pianoExactTiming';
import type { NoteEvent, PartDynamicEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { parametersHash, captureSource, selectSourceEvents, type SourceBundle, type SourceRecord } from './sourceFoundation';
import { resolveTemplate, type ResolvedPart } from './ensembleTemplates';
import { buildE2Score, quarterLength, type E2Assignment, type E2PartSpec } from './e2Placement';
import type { E2RealisedPlacement } from './harmonicRealisation';
import type { SpelledRegister } from './harmonicColourTypes';
import type { EventLineage } from './sourceFoundation';
import type {
  OrchestrateReceipt,
  OrchestrateRequest,
  PianoChamberCorrection,
  PianoChamberMode,
  PianoChamberRole,
  SectionColourPlan,
} from './types';

export interface PianoChamberEventProposal {
  eventId: string;
  bar: number;
  onsetInBar: number;
  durationQuarters: number;
  midi: number;
  staff: string | null;
  voice: string;
  proposedRole: PianoChamberRole;
  confidence: 'low' | 'medium';
  needsConfirmation: true;
  reason: string;
}

export interface PianoPhraseProposal {
  id: string;
  startBar: number;
  endBar: number;
  confidence: 'low' | 'medium';
  needsConfirmation: true;
  reason: string;
}

export interface PianoChamberProposal {
  sourceSha256: string;
  bars: 24;
  beats: number;
  beatType: number;
  tempoBpm: number | null;
  tempoSource: 'score' | 'missing';
  parts: Array<{ partId: string; name: string }>;
  events: PianoChamberEventProposal[];
  phrases: PianoPhraseProposal[];
  uncertain: string[];
  motifPatternIds: string[];
  motifNote: string;
  /** Default source anchors for the current roles and phrase bounds. */
  protectedEventIds: string[];
}

export interface PianoChamberFidelity {
  version: 'piano-chamber-1';
  mode: PianoChamberMode;
  sourceSha256: string;
  seed: number;
  tempoBpm: number;
  phrases: Array<{
    id: string;
    startBar: number;
    endBar: number;
    role: 'statement' | 'development' | 'return';
    foreground: string;
    answer: string | null;
    answerOperator: string | null;
    register: string;
    density: string;
    dynamic: string;
    handover: boolean;
    ending: boolean;
  }>;
  classifications: Array<{
    eventId: string;
    disposition: 'retained' | 'octave-transferred' | 'transformed' | 'omitted';
    partId: string | null;
    octaveShift: number;
    reason: string;
  }>;
  protectedEventIds: string[];
  silence: Array<{ bar: number; reason: string }>;
  omissions: Array<{ eventId?: string; partId?: string; reason: string }>;
  derivedAnswers: Array<{ phraseId: string; operator: string; partId: string; notes: number }>;
  preview: Array<{ partId: string; midi: number; onset: number; duration: number }>;
  warnings: string[];
  musicalQualityScore: null;
  musicallyApproved: false;
  listeningQuestions: string[];
}

interface NoteRow {
  record: SourceRecord;
  event: CanonicalEvent;
  onset: ExactQuarter;
  duration: ExactQuarter;
  midi: number;
  role: PianoChamberRole;
  reason: string;
  confidence: 'low' | 'medium';
}

interface Phrase {
  id: string;
  startBar: number;
  endBar: number;
  reason: string;
  confidence: 'low' | 'medium';
  kind: 'statement' | 'development' | 'return';
}

interface Placed {
  partId: string;
  onset: ExactQuarter;
  duration: ExactQuarter;
  pitch: SpelledRegister;
  sourceIds: string[];
  origin: 'source' | 'derived';
  disposition: 'retained' | 'octave-transferred' | 'transformed';
  octaveShift: number;
  op?: string;
  phraseId: string;
}

const ANSWER_OPS: readonly OperatorId[] = ['fragment-head', 'augment', 'displace'];

const BANDS: Record<RegisterBand, [number, number]> = {
  sub_bass: [24, 43],
  bass: [36, 55],
  low: [48, 67],
  middle: [60, 79],
  high: [72, 91],
  very_high: [84, 103],
};

const PART_BAND: Record<string, RegisterBand> = {
  fl: 'high',
  ob: 'high',
  cl: 'middle',
  hn: 'middle',
  bn: 'low',
  vn1: 'high',
  vn2: 'middle',
  va: 'middle',
  vc: 'bass',
  db: 'sub_bass',
};

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function num(value: ExactQuarter): number {
  return qToNumber(value);
}

function rat(value: { n: number; d: number }): ExactQuarter {
  return q(value.n, value.d);
}

function pcOf(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

function spellMidi(midi: number): SpelledRegister {
  const pc = pcOf(midi);
  const steps = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const step = steps[pc] ?? 'C';
  const alter = alters[pc] ?? 0;
  const octave = Math.floor(midi / 12) - 1;
  return { step, alter, octave, midi };
}

function spellShift(event: CanonicalEvent, midi: number, shift: number): SpelledRegister {
  const written = event.written;
  if (!written || shift % 12 !== 0) return spellMidi(midi);
  const octave = written.octave + shift / 12;
  try {
    if (midiOfPitch(written.step, written.alter, octave) === midi) {
      return { step: written.step, alter: written.alter, octave, midi };
    }
  } catch {
    /* fall through */
  }
  return spellMidi(midi);
}

function decompose(duration: ExactQuarter): ExactQuarter[] {
  const chunks = [q(4), q(3), q(2), q(3, 2), q(1), q(3, 4), q(2, 3), q(1, 2), q(3, 8), q(1, 4), q(1, 8), q(1, 3), q(1, 16)];
  const out: ExactQuarter[] = [];
  let left = duration;
  while (qCmp(left, q(0)) > 0) {
    const chunk = chunks.find((item) => qCmp(item, left) <= 0);
    if (!chunk) throw new Error(`cannot write duration ${duration.n}/${duration.d}`);
    out.push(chunk);
    left = qSub(left, chunk);
  }
  return out;
}

function splitBars(onset: ExactQuarter, duration: ExactQuarter, barLen: ExactQuarter): Array<{ onset: ExactQuarter; duration: ExactQuarter }> {
  const pieces: Array<{ onset: ExactQuarter; duration: ExactQuarter }> = [];
  let cursor = onset;
  let left = duration;
  while (qCmp(left, q(0)) > 0) {
    const bar = Math.floor(num(cursor) / num(barLen) + 1e-9);
    const barEnd = q((bar + 1) * barLen.n, barLen.d);
    const room = qSub(barEnd, cursor);
    const take = qCmp(left, room) <= 0 ? left : room;
    if (qCmp(take, q(0)) <= 0) throw new Error('duration did not advance');
    pieces.push({ onset: cursor, duration: take });
    cursor = qAdd(cursor, take);
    left = qSub(left, take);
  }
  return pieces;
}

function tempoOf(bundle: SourceBundle): number | null {
  for (const direction of bundle.score.directions) {
    if (direction.kind !== 'tempo') continue;
    if (typeof direction.playbackBpm === 'number' && direction.playbackBpm > 0) return direction.playbackBpm;
    const match = /=\s*(\d+(?:\.\d+)?)/.exec(direction.text);
    if (match) return Number(match[1]);
  }
  return null;
}

function pianoName(name: string): boolean {
  return /piano|grand/i.test(name);
}

function validateBundle(bundle: SourceBundle, partIds: string[] | undefined): { error: string } | { records: SourceRecord[]; beats: number; beatType: number; barLen: ExactQuarter } {
  if (!bundle.semanticsUnderstood) {
    const rows = bundle.score.unsupported
      .filter((item) => item.kind !== 'key' && item.kind !== 'staff-details')
      .map((item) => `${item.kind} in ${item.partId} bar ${item.bar}: ${item.detail}`);
    return { error: `Unsupported source. ${rows.join(' ') || 'Strict reading did not understand the score.'}` };
  }
  const selected = partIds?.length
    ? bundle.score.parts.filter((part) => partIds.includes(part.id))
    : bundle.score.parts;
  if (!selected.length) return { error: 'No piano part matched the selection.' };
  if (selected.length > 2) {
    return { error: `Phase 1 accepts one piano grand staff or two selected piano parts. This score has ${selected.length} parts.` };
  }
  if (!partIds?.length && selected.some((part) => !pianoName(part.name))) {
    const names = selected.map((part) => `${part.id} "${part.name}"`).join(', ');
    return { error: `Refusing non-piano parts ${names}. Pass partIds only for the piano staves you mean to arrange.` };
  }
  const measures = bundle.score.measures.filter((measure) => selected.some((part) => part.id === measure.partId));
  const bars = [...new Set(measures.map((measure) => measure.bar))].sort((a, b) => a - b);
  if (bars.length !== 24 || bars[0] !== 1 || bars[23] !== 24) {
    return { error: `Phase 1 needs a supplied 24-bar score, bars 1–24. This selection has ${bars.length} bar numbers (${bars[0] ?? 'none'}–${bars[bars.length - 1] ?? 'none'}). Prepare the excerpt. The ending was not invented.` };
  }
  if (measures.some((measure) => measure.pickup)) return { error: 'Pickup bars are outside Phase 1. The metre was not changed.' };
  const beats = measures[0]?.beats ?? 0;
  const beatType = measures[0]?.beatType ?? 0;
  const metreOk = (beats === 4 && beatType === 4) || (beats === 3 && beatType === 4) || (beats === 6 && beatType === 8);
  if (!metreOk) return { error: `Phase 1 accepts constant 4/4, 3/4 or 6/8. Found ${beats}/${beatType}.` };
  if (measures.some((measure) => measure.beats !== beats || measure.beatType !== beatType)) {
    return { error: 'The metre changes inside the excerpt. Phase 1 does not quantise or rewrite the time signature.' };
  }
  const tuplet = bundle.records.find((record) => selected.some((part) => part.id === record.canonical.partId) && record.canonical.tuplet && (record.canonical.tuplet.actualNotes !== 3 || record.canonical.tuplet.normalNotes !== 2));
  if (tuplet) {
    const ratio = tuplet.canonical.tuplet!;
    return { error: `Unsupported tuplet ${ratio.actualNotes}:${ratio.normalNotes} in ${tuplet.canonical.partId} bar ${tuplet.canonical.bar}. Phase 1 keeps ordinary 3:2 triplets only.` };
  }
  const records = [...selectSourceEvents(bundle, selected.map((part) => ({ partId: part.id })))];
  return { records, beats, beatType, barLen: quarterLength(beats, beatType) };
}

function buildRows(records: readonly SourceRecord[], barLen: ExactQuarter): NoteRow[] {
  return records
    .filter((record) => !record.canonical.rest && record.canonical.soundingMidi !== null && record.canonical.written)
    .map((record) => ({
      record,
      event: record.canonical,
      onset: qAdd(q((record.canonical.bar - 1) * barLen.n, barLen.d), rat(record.canonical.onsetInBar)),
      duration: rat(record.canonical.duration),
      midi: record.canonical.soundingMidi as number,
      role: 'unassigned' as const,
      reason: 'not yet classified',
      confidence: 'low' as const,
    }))
    .sort((a, b) => qCmp(a.onset, b.onset) || b.midi - a.midi);
}

function assignRoles(rows: NoteRow[]): string[] {
  const uncertain: string[] = [];
  const staves = [...new Set(rows.map((row) => row.event.staff ?? '1'))];
  const upper = staves.includes('1') ? '1' : staves[0] ?? '1';
  const lower = staves.find((staff) => staff !== upper) ?? null;
  const byOnset = new Map<string, NoteRow[]>();
  for (const row of rows) {
    const key = `${row.onset.n}/${row.onset.d}`;
    const list = byOnset.get(key) ?? [];
    list.push(row);
    byOnset.set(key, list);
  }
  for (const group of byOnset.values()) {
    const upperNotes = group.filter((row) => (row.event.staff ?? '1') === upper);
    const pool = upperNotes.length ? upperNotes : group;
    const top = [...pool].sort((a, b) => b.midi - a.midi)[0]!;
    top.role = 'melody';
    top.reason = upperNotes.length
      ? 'Highest note on the upper staff at this onset. Staff position is evidence, not a confirmed fact.'
      : 'Highest note at this onset. One staff gives no separate bass staff.';
    top.confidence = upperNotes.length && group.length > 1 ? 'medium' : 'low';
    for (const row of group) {
      if (row === top) continue;
      if (lower && (row.event.staff ?? '1') === lower) continue;
      row.role = row.duration.n / row.duration.d <= 0.5 ? 'rhythmic_figure' : 'harmonic_support';
      row.reason = row.role === 'rhythmic_figure'
        ? 'Short inner attack. It may be a rhythmic figure or a chord tone.'
        : 'Inner note under the highest attack. Harmonic support is inferred.';
      row.confidence = 'low';
    }
  }
  const lowerRows = lower ? rows.filter((row) => (row.event.staff ?? '1') === lower && row.role === 'unassigned') : [];
  const lowerDuration = lowerRows.reduce((sum, row) => sum + num(row.duration), 0);
  const lowerMoving = lowerRows.length >= 8 && new Set(lowerRows.map((row) => row.midi)).size >= 5 && lowerDuration / lowerRows.length < 1.5;
  for (const row of lowerRows) {
    if (lowerMoving) {
      row.role = 'countermelody';
      row.reason = 'Lower staff moves on its own. Treated as a countermelody proposal, not as a bass line.';
      row.confidence = 'low';
    } else {
      const same = rows.filter((other) => other.event.staff === row.event.staff && qEq(other.onset, row.onset));
      const bottom = [...same].sort((a, b) => a.midi - b.midi)[0];
      row.role = bottom === row ? 'bass' : 'harmonic_support';
      row.reason = row.role === 'bass'
        ? 'Lowest note on the lower staff. Continuity still needs a musician check.'
        : 'Upper note of a lower-staff chord. Harmonic support is inferred.';
      row.confidence = 'medium';
    }
  }
  for (const row of rows) {
    if (row.role === 'unassigned') {
      row.role = 'harmonic_support';
      row.reason = 'No clearer lane. Left as harmonic support and marked uncertain.';
      row.confidence = 'low';
    }
    if (row.confidence === 'low') uncertain.push(`${row.event.id} bar ${row.event.bar}: ${row.reason}`);
  }
  if (!lower) uncertain.push('The score has one staff. Melody and bass were split by register, not by a printed hand.');
  return uncertain;
}

function proposePhrases(rows: NoteRow[], barLen: ExactQuarter): { phrases: Phrase[]; uncertain: string[] } {
  const melody = rows.filter((row) => row.role === 'melody').sort((a, b) => qCmp(a.onset, b.onset));
  const uncertain: string[] = [];
  if (!melody.length) return { phrases: [{ id: 'p1', startBar: 1, endBar: 24, reason: 'No melody lane was inferred.', confidence: 'low', kind: 'statement' }], uncertain: ['No melody lane.'] };
  const breaks: number[] = [melody[0]!.event.bar];
  for (let index = 1; index < melody.length; index += 1) {
    const previous = melody[index - 1]!;
    const note = melody[index]!;
    const gap = num(note.onset) - (num(previous.onset) + num(previous.duration));
    if (gap >= 0.99 || note.event.bar >= previous.event.bar + 8) breaks.push(note.event.bar);
  }
  const unique = [...new Set(breaks)].sort((a, b) => a - b);
  const gridStarts = new Set<number>();
  if (unique.length === 1) {
    uncertain.push('No melody rest long enough to mark a phrase. An 8-bar grid is only a proposal.');
    for (const bar of [9, 17]) {
      unique.push(bar);
      gridStarts.add(bar);
    }
  }
  const phrases: Phrase[] = unique.map((startBar, index) => {
    const endBar = (unique[index + 1] ?? 25) - 1;
    const forced = gridStarts.has(startBar) || (melody.length > 0 && gapReason(rows, startBar) === false);
    return {
      id: `p${index + 1}`,
      startBar,
      endBar,
      confidence: forced ? 'low' : 'medium',
      reason: forced
        ? 'Boundary falls on an 8-bar grid because the melody did not rest.'
        : 'Boundary follows a rest in the inferred melody.',
      kind: 'statement' as const,
    };
  });
  classifyPhraseKinds(rows, phrases);
  if (phrases.some((phrase) => phrase.confidence === 'low')) uncertain.push('At least one phrase boundary is an inference.');
  return { phrases, uncertain };
}

function classifyPhraseKinds(rows: NoteRow[], phrases: Phrase[]): void {
  const melody = rows.filter((row) => row.role === 'melody').sort((a, b) => qCmp(a.onset, b.onset));
  const opening = phrases[0]
    ? intervalsOf(melody.filter((row) => row.event.bar >= phrases[0].startBar && row.event.bar <= phrases[0].endBar))
    : [];
  phrases.forEach((phrase, index) => {
    if (index === 0) {
      phrase.kind = 'statement';
      return;
    }
    const local = intervalsOf(melody.filter((row) => row.event.bar >= phrase.startBar && row.event.bar <= phrase.endBar));
    phrase.kind = local.length >= 3 && opening.length >= 3 && local.slice(0, 3).every((step, stepIndex) => step === opening[stepIndex])
      ? 'return'
      : 'development';
  });
}

function gapReason(rows: NoteRow[], bar: number): boolean {
  return rows.some((row) => row.role === 'melody' && row.event.bar === bar);
}

function intervalsOf(rows: NoteRow[]): number[] {
  const intervals: number[] = [];
  for (let index = 1; index < rows.length; index += 1) intervals.push(rows[index]!.midi - rows[index - 1]!.midi);
  return intervals;
}

function applyCorrections(rows: NoteRow[], phrases: Phrase[], correction: PianoChamberCorrection | undefined): Phrase[] {
  const roles = correction?.roles ?? {};
  for (const row of rows) {
    const next = roles[row.event.id];
    if (!next) continue;
    row.role = next;
    row.reason = 'Musician correction.';
    row.confidence = 'medium';
  }
  let next = phrases;
  if (correction?.phrases?.length) {
    const same = correction.phrases.length === phrases.length && correction.phrases.every((phrase, index) => {
      const current = phrases[index];
      return !!current && phrase.id === current.id && phrase.startBar === current.startBar && phrase.endBar === current.endBar;
    });
    if (!same) {
      next = correction.phrases.map((phrase, index) => ({
        id: phrase.id || `p${index + 1}`,
        startBar: phrase.startBar,
        endBar: phrase.endBar,
        reason: 'Musician phrase boundary.',
        confidence: 'medium' as const,
        kind: 'statement' as const,
      }));
    }
  }
  if (correction?.roles || (correction?.phrases?.length && next !== phrases)) classifyPhraseKinds(rows, next);
  return next;
}

function phraseOf(phrases: readonly Phrase[], bar: number): Phrase {
  return phrases.find((phrase) => bar >= phrase.startBar && bar <= phrase.endBar) ?? phrases[phrases.length - 1]!;
}

function defaultLocks(rows: NoteRow[], phrases: readonly Phrase[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const phrase = phraseOf(phrases, row.event.bar);
    if (row.role === 'melody' && (phrase.kind === 'statement' || phrase.kind === 'return')) ids.add(row.event.id);
    if ((row.role === 'bass' || row.role === 'countermelody') && row.event.bar === phrase.startBar) {
      const first = rows
        .filter((other) => other.role === row.role && other.event.bar === phrase.startBar)
        .sort((a, b) => qCmp(a.onset, b.onset))[0];
      if (first) ids.add(first.event.id);
    }
  }
  return [...ids];
}

function fits(midis: number[], range: readonly [number, number], shift: number): boolean {
  return midis.every((midi) => midi + shift >= range[0] && midi + shift <= range[1]);
}

function chooseShift(midis: number[], range: readonly [number, number]): number | null {
  const shifts = [0, -12, 12, -24, 24];
  return shifts.find((shift) => fits(midis, range, shift)) ?? null;
}

function melodyOrder(centre: number): string[] {
  if (centre >= 74) return ['fl', 'ob', 'vn1', 'cl', 'vn2'];
  if (centre >= 67) return ['ob', 'cl', 'vn1', 'hn', 'vn2', 'va'];
  if (centre >= 60) return ['cl', 'hn', 'vn1', 'vn2', 'va', 'bn'];
  return ['vc', 'bn', 'va', 'hn', 'cl'];
}

function busyOverlap(busy: Map<string, Array<{ start: number; end: number }>>, partId: string, start: number, end: number): boolean {
  return (busy.get(partId) ?? []).some((span) => start < span.end - 1e-6 && span.start < end - 1e-6);
}

function occupy(busy: Map<string, Array<{ start: number; end: number }>>, partId: string, start: number, end: number): void {
  const list = busy.get(partId) ?? [];
  list.push({ start, end });
  busy.set(partId, list);
}

function placeRow(
  placed: Placed[],
  busy: Map<string, Array<{ start: number; end: number }>>,
  row: NoteRow,
  part: ResolvedPart,
  shift: number,
  barLen: ExactQuarter,
  phraseId: string,
  origin: 'source' | 'derived',
  disposition: Placed['disposition'],
  op?: string,
): void {
  const midi = row.midi + shift;
  const pitch = spellShift(row.event, midi, shift);
  const pieces = splitBars(row.onset, row.duration, barLen);
  pieces.forEach((piece, pieceIndex) => {
    const written = decompose(piece.duration);
    let cursor = piece.onset;
    written.forEach((duration, durationIndex) => {
      const start = num(cursor);
      const end = start + num(duration);
      if (busyOverlap(busy, part.partId, start, end)) {
        throw new Error(`${part.partId} overlap at ${start}`);
      }
      occupy(busy, part.partId, start, end);
      placed.push({
        partId: part.partId,
        onset: cursor,
        duration,
        pitch,
        sourceIds: durationIndex === 0 && pieceIndex === 0 ? [row.event.id] : [row.event.id],
        origin,
        disposition,
        octaveShift: shift,
        ...(op ? { op } : {}),
        phraseId,
      });
      cursor = qAdd(cursor, duration);
    });
  });
}

function tryCarrier(parts: readonly ResolvedPart[], ids: readonly string[], midis: number[], busy: Map<string, Array<{ start: number; end: number }>>, spans: Array<{ start: number; end: number }>, avoid: string | null): { part: ResolvedPart; shift: number } | null {
  for (const id of ids) {
    if (id === avoid) continue;
    const part = parts.find((item) => item.partId === id);
    const range = part?.spec.soundingHardRange;
    if (!part || !range) continue;
    const shift = chooseShift(midis, range);
    if (shift === null) continue;
    const collision = spans.some((span) => busyOverlap(busy, part.partId, span.start, span.end));
    if (collision) continue;
    return { part, shift };
  }
  return null;
}

export function proposePianoChamber(xml: string, partIds?: string[], correction?: PianoChamberCorrection): { ok: true; proposal: PianoChamberProposal } | { ok: false; error: string } {
  let bundle: SourceBundle;
  try {
    bundle = captureSource(xml, 'piano-chamber-source.musicxml');
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
  const validated = validateBundle(bundle, partIds);
  if ('error' in validated) return fail(validated.error);
  const rows = buildRows(validated.records, validated.barLen);
  if (!rows.length) return fail('The piano selection has no sounding notes.');
  const roleUncertainty = assignRoles(rows);
  const phrased = proposePhrases(rows, validated.barLen);
  const phrases = applyCorrections(rows, phrased.phrases, correction);
  const discovered = discoverMotifs(bundle.score);
  const tempo = tempoOf(bundle);
  const selectedParts = partIds?.length
    ? bundle.score.parts.filter((part) => partIds.includes(part.id))
    : bundle.score.parts.filter((part) => pianoName(part.name)).slice(0, 2);
  const parts = (selectedParts.length ? selectedParts : bundle.score.parts.slice(0, 1)).map((part) => ({ partId: part.id, name: part.name }));
  return {
    ok: true,
    proposal: {
      sourceSha256: bundle.sha256,
      bars: 24,
      beats: validated.beats,
      beatType: validated.beatType,
      tempoBpm: tempo,
      tempoSource: tempo === null ? 'missing' : 'score',
      parts,
      events: rows.map((row) => ({
        eventId: row.event.id,
        bar: row.event.bar,
        onsetInBar: num(rat(row.event.onsetInBar)),
        durationQuarters: num(row.duration),
        midi: row.midi,
        staff: row.event.staff,
        voice: row.event.voice,
        proposedRole: row.role,
        confidence: row.confidence,
        needsConfirmation: true,
        reason: row.reason,
      })),
      phrases: phrases.map((phrase) => ({
        id: phrase.id,
        startBar: phrase.startBar,
        endBar: phrase.endBar,
        confidence: phrase.confidence,
        needsConfirmation: true,
        reason: phrase.reason,
      })),
      uncertain: [...roleUncertainty, ...phrased.uncertain],
      motifPatternIds: discovered.patterns.map((pattern) => pattern.id),
      motifNote: 'Pattern frequency is not thematic importance. Confirm the melody lane.',
      protectedEventIds: defaultLocks(rows, phrases),
    },
  };
}

function dynamicFor(kind: Phrase['kind'], highest: boolean, ending: boolean): PartDynamicEvent['mark'] {
  if (ending) return 'mp';
  if (highest) return 'f';
  if (kind === 'statement') return 'p';
  if (kind === 'return') return 'mp';
  return 'mf';
}

export function realisePianoChamber(request: OrchestrateRequest):
  | { ok: true; musicXml: string; midiBase64: string; receipt: OrchestrateReceipt; score: ScoreModel; fidelity: PianoChamberFidelity }
  | { ok: false; error: string } {
  const command = request.pianoChamber;
  if (!command) return fail('Piano chamber was not requested.');
  const correction = command.correction ?? {};
  if (correction.reviewConfirmed !== true) {
    return fail('Role and phrase review is required before realisation. Confirm or edit the inferred lanes. Uncertain analysis was not treated as fact.');
  }
  const proposed = proposePianoChamber(command.sourceMusicXml, correction.partIds);
  if (!proposed.ok) return proposed;
  let bundle: SourceBundle;
  try {
    bundle = captureSource(command.sourceMusicXml, 'piano-chamber-source.musicxml');
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
  const validated = validateBundle(bundle, correction.partIds);
  if ('error' in validated) return fail(validated.error);
  const tempo = proposed.proposal.tempoBpm ?? correction.tempoBpm ?? null;
  if (tempo === null || tempo <= 0) {
    return fail('The score has no numeric tempo. Set correction.tempoBpm. The tempo was not guessed.');
  }
  const rows = buildRows(validated.records, validated.barLen);
  assignRoles(rows);
  let phrases = proposePhrases(rows, validated.barLen).phrases;
  phrases = applyCorrections(rows, phrases, correction);
  if (phrases.some((phrase) => phrase.startBar < 1 || phrase.endBar > 24 || phrase.endBar < phrase.startBar)) {
    return fail('Phrase boundaries must stay inside bars 1–24.');
  }
  const mode: PianoChamberMode = correction.mode === 'faithful' ? 'faithful' : 'developing';
  const locked = new Set(defaultLocks(rows, phrases));
  for (const id of correction.locks ?? []) locked.add(id);
  for (const id of correction.unlocks ?? []) locked.delete(id);
  const omitted = new Set(correction.omitEventIds ?? []);
  for (const id of omitted) {
    if (locked.has(id)) return fail(`Locked source event ${id} cannot be omitted. Unlock it first. Locked material was not changed silently.`);
  }
  const resolved = resolveTemplate('chamber_orchestra');
  if (resolved.parts.length !== 10) return fail('The chamber roster did not resolve to ten catalogue instruments.');
  const family = getEnsembleFamilyProfile('chamber_orchestra');
  const sections = phrases.map((phrase, index) => ({
    index,
    startBar: phrase.startBar,
    endBar: phrase.endBar,
    label: phrase.id,
  }));
  const sectionRoles = phrases.map((phrase) => ({
    label: phrase.id,
    startBar: phrase.startBar,
    length: phrase.endBar - phrase.startBar + 1,
    role: phrase.kind === 'return' ? 'return' as const : phrase.kind === 'development' ? 'development' as const : 'statement' as const,
    metadata: {
      role: phrase.kind === 'return' ? 'return' as const : phrase.kind === 'development' ? 'development' as const : 'statement' as const,
      densityTendency: phrase.kind === 'return' ? 'sparse' as const : 'medium' as const,
      registerTendency: 'centre' as const,
      rhythmActivity: 'medium' as const,
      textureTendency: 'mixed' as const,
    },
  }));
  const densityCurve = planDensityCurve(sectionRoles, 24);
  const busy = new Map<string, Array<{ start: number; end: number }>>();
  const placed: Placed[] = [];
  const warnings: string[] = [];
  const silence: PianoChamberFidelity['silence'] = [];
  const omissions: PianoChamberFidelity['omissions'] = [];
  const answers: PianoChamberFidelity['derivedAnswers'] = [];
  const classification = new Map<string, PianoChamberFidelity['classifications'][number]>();
  for (const row of rows) {
    classification.set(row.event.id, {
      eventId: row.event.id,
      disposition: 'omitted',
      partId: null,
      octaveShift: 0,
      reason: omitted.has(row.event.id) ? 'Musician omitted this event.' : 'Not placed.',
    });
  }
  const silentBars = new Set<number>();
  for (let bar = 1; bar <= 24; bar += 1) {
    if (!rows.some((row) => row.event.bar === bar)) {
      silentBars.add(bar);
      silence.push({ bar, reason: 'Source bar has no sounding attack. The rest stays empty.' });
    }
  }
  const foregroundByPhrase = new Map<string, string>();
  let previousCarrier: string | null = null;
  const openingCarrierRef: { id: string | null } = { id: null };
  const melodyRows = rows.filter((row) => row.role === 'melody' && !omitted.has(row.event.id));
  const highestMidi = melodyRows.reduce((best, row) => Math.max(best, row.midi), 0);

  for (const phrase of phrases) {
    const line = melodyRows.filter((row) => row.event.bar >= phrase.startBar && row.event.bar <= phrase.endBar);
    if (!line.length) {
      foregroundByPhrase.set(phrase.id, previousCarrier ?? 'vn1');
      continue;
    }
    const centre = line.reduce((sum, row) => sum + row.midi, 0) / line.length;
    const avoid = phrase.kind === 'return' && openingCarrierRef.id ? null : previousCarrier;
    const preferred = phrase.kind === 'return' && openingCarrierRef.id
      ? [openingCarrierRef.id, ...melodyOrder(centre)]
      : melodyOrder(centre);
    const spans = line.flatMap((row) => splitBars(row.onset, row.duration, validated.barLen).map((piece) => ({ start: num(piece.onset), end: num(piece.onset) + num(piece.duration) })));
    const choice = tryCarrier(resolved.parts, preferred, line.map((row) => row.midi), busy, spans, avoid);
    const fallback = choice ?? tryCarrier(resolved.parts, melodyOrder(centre), line.map((row) => row.midi), busy, spans, null);
    if (!fallback) return fail(`No chamber instrument can hold the melody in ${phrase.id} without clipping a note.`);
    if (!openingCarrierRef.id) openingCarrierRef.id = fallback.part.partId;
    foregroundByPhrase.set(phrase.id, fallback.part.partId);
    for (const row of line) {
      const disposition = fallback.shift === 0 ? 'retained' : 'octave-transferred';
      placeRow(placed, busy, row, fallback.part, fallback.shift, validated.barLen, phrase.id, 'source', disposition);
      classification.set(row.event.id, {
        eventId: row.event.id,
        disposition,
        partId: fallback.part.partId,
        octaveShift: fallback.shift,
        reason: fallback.shift === 0 ? 'Foreground keeps the sounding pitch.' : `Whole phrase moved ${fallback.shift} semitones to fit ${fallback.part.name}.`,
      });
    }
    previousCarrier = fallback.part.partId;
  }

  const bassRows = rows.filter((row) => row.role === 'bass' && !omitted.has(row.event.id));
  if (bassRows.length) {
    const spans = bassRows.flatMap((row) => splitBars(row.onset, row.duration, validated.barLen).map((piece) => ({ start: num(piece.onset), end: num(piece.onset) + num(piece.duration) })));
    const choice = tryCarrier(resolved.parts, ['db', 'vc', 'bn'], bassRows.map((row) => row.midi), busy, spans, null);
    if (!choice) return fail('No bass instrument can hold the bass lane without clipping.');
    for (const row of bassRows) {
      const disposition = choice.shift === 0 ? 'retained' : 'octave-transferred';
      placeRow(placed, busy, row, choice.part, choice.shift, validated.barLen, phraseOf(phrases, row.event.bar).id, 'source', disposition);
      classification.set(row.event.id, {
        eventId: row.event.id,
        disposition,
        partId: choice.part.partId,
        octaveShift: choice.shift,
        reason: choice.shift === 0 ? 'Bass lane kept.' : `Bass lane moved ${choice.shift} semitones.`,
      });
    }
  }

  for (const row of rows) {
    if (omitted.has(row.event.id)) continue;
    if (row.role !== 'countermelody' && row.role !== 'harmonic_support' && row.role !== 'rhythmic_figure') continue;
    if (silentBars.has(row.event.bar)) continue;
    const phrase = phraseOf(phrases, row.event.bar);
    const ending = phrase.endBar === 24 && row.event.bar === 24 && row.role !== 'countermelody';
    if (ending && !locked.has(row.event.id)) {
      classification.set(row.event.id, { eventId: row.event.id, disposition: 'omitted', partId: null, octaveShift: 0, reason: 'Ending release. Inner notes drop so the close can decay.' });
      omissions.push({ eventId: row.event.id, reason: 'Ending release.' });
      continue;
    }
    const level = getDensityForBar(densityCurve, row.event.bar);
    if (mode === 'developing' && row.role === 'harmonic_support' && level === 'sparse' && !locked.has(row.event.id) && num(row.duration) < 2) {
      classification.set(row.event.id, { eventId: row.event.id, disposition: 'omitted', partId: null, octaveShift: 0, reason: 'Sparse phrase. Short harmonic support was left out.' });
      omissions.push({ eventId: row.event.id, reason: 'Sparse accompaniment reduction.' });
      continue;
    }
    const ids = row.role === 'countermelody'
      ? ['vc', 'va', 'cl', 'bn', 'hn', 'vn2']
      : row.role === 'rhythmic_figure'
        ? ['vn2', 'va', 'cl', 'vn1']
        : ['va', 'hn', 'cl', 'vn2', 'bn'];
    const foreground = foregroundByPhrase.get(phrase.id) ?? null;
    const spans = splitBars(row.onset, row.duration, validated.barLen).map((piece) => ({ start: num(piece.onset), end: num(piece.onset) + num(piece.duration) }));
    const choice = tryCarrier(resolved.parts, ids.filter((id) => id !== foreground), [row.midi], busy, spans, foreground);
    if (!choice) {
      if (locked.has(row.event.id)) return fail(`Locked event ${row.event.id} has no free instrument in range.`);
      classification.set(row.event.id, { eventId: row.event.id, disposition: 'omitted', partId: null, octaveShift: 0, reason: 'No free instrument in range. The note was not clipped.' });
      omissions.push({ eventId: row.event.id, reason: 'No free instrument in range.' });
      continue;
    }
    const band = PART_BAND[choice.part.partId] ?? 'middle';
    const box = BANDS[band];
    if (row.role === 'harmonic_support' && (row.midi + choice.shift < box[0] - 12 || row.midi + choice.shift > box[1] + 12)) {
      if (locked.has(row.event.id)) return fail(`Locked event ${row.event.id} falls outside the register plan.`);
      classification.set(row.event.id, { eventId: row.event.id, disposition: 'omitted', partId: null, octaveShift: 0, reason: 'Register plan refused this inner note. Silence instead of a clash with the lane.' });
      omissions.push({ eventId: row.event.id, reason: 'Register plan.' });
      continue;
    }
    const disposition = choice.shift === 0 ? 'retained' : 'octave-transferred';
    placeRow(placed, busy, row, choice.part, choice.shift, validated.barLen, phrase.id, 'source', disposition);
    classification.set(row.event.id, {
      eventId: row.event.id,
      disposition,
      partId: choice.part.partId,
      octaveShift: choice.shift,
      reason: row.role === 'harmonic_support' ? 'Harmonic support redistributed.' : `${row.role} kept.`,
    });
  }

  if (mode === 'developing') {
    const repeated = new Map<string, number>();
    for (let bar = 1; bar <= 24; bar += 1) {
      const signature = rows
        .filter((row) => row.role === 'harmonic_support' && row.event.bar === bar)
        .map((row) => `${pcOf(row.midi)}@${num(rat(row.event.onsetInBar))}`)
        .sort()
        .join('|');
      if (!signature) continue;
      const count = (repeated.get(signature) ?? 0) + 1;
      repeated.set(signature, count);
      if (count < 3) continue;
      for (const row of rows.filter((item) => item.role === 'harmonic_support' && item.event.bar === bar)) {
        if (locked.has(row.event.id)) continue;
        const current = classification.get(row.event.id);
        if (!current || current.disposition === 'omitted') continue;
        placed.splice(0, placed.length, ...placed.filter((item) => !item.sourceIds.includes(row.event.id)));
        classification.set(row.event.id, { eventId: row.event.id, disposition: 'omitted', partId: null, octaveShift: 0, reason: 'The same support cell had already sounded twice. The third copy was removed.' });
        omissions.push({ eventId: row.event.id, reason: 'Mechanical support repetition removed.' });
      }
    }
  }

  const derivedEvents: OrchestrateReceipt['derivedLines'] = [];
  for (const [phraseIndex, phrase] of phrases.entries()) {
    if (mode !== 'developing' || phrase.kind === 'statement' || phrase.kind === 'return' || phrase.endBar === 24) continue;
    if ([...Array(phrase.endBar - phrase.startBar + 1).keys()].every((offset) => silentBars.has(phrase.startBar + offset))) {
      silence.push({ bar: phrase.startBar, reason: 'Answer omitted. The phrase is protected silence.' });
      continue;
    }
    const line = melodyRows.filter((row) => row.event.bar >= phrase.startBar && row.event.bar <= phrase.endBar);
    if (line.length < 3) {
      omissions.push({ reason: `${phrase.id} has no answer. The melody cell is shorter than three notes.` });
      continue;
    }
    const origin = line[0]!.onset;
    const motif: Motif = {
      id: `${phrase.id}-head`,
      events: line.slice(0, 4).map((row) => ({ onset: num(qSub(row.onset, origin)), duration: num(row.duration), midi: row.midi })),
    };
    const sonority = new Set(rows.filter((row) => row.event.bar >= phrase.startBar && row.event.bar <= phrase.endBar).map((row) => pcOf(row.midi)));
    const start = Math.abs(request.seed + phraseIndex * 3) % ANSWER_OPS.length;
    const order = [...ANSWER_OPS.slice(start), ...ANSWER_OPS.slice(0, start)];
    const foreground = foregroundByPhrase.get(phrase.id) ?? null;
    const phraseStart = num(q((phrase.startBar - 1) * validated.barLen.n, validated.barLen.d));
    const phraseEnd = num(q(phrase.endBar * validated.barLen.n, validated.barLen.d));
    const midpoint = phraseStart + (phraseEnd - phraseStart) / 2;
    let accepted: { op: OperatorId; partId: string; notes: Array<{ onset: number; midi: number; duration: number }> } | null = null;
    for (const op of order) {
      const params = op === 'fragment-head' ? { count: 3 } : op === 'augment' ? { factor: 2 } : { beats: 1 };
      const transformed = applyOperator(motif, op, params);
      const soundingEvents = transformed.motif.events.filter((event) => event.midi !== null).map((event) => {
        let midi = event.midi as number;
        if (!sonority.has(pcOf(midi))) {
          const nudge = [-1, 1, -2, 2].find((step) => sonority.has(pcOf(midi + step)));
          if (nudge === undefined) return null;
          midi += nudge;
        }
        return { onset: event.onset, duration: event.duration, midi };
      }).filter((event): event is { onset: number; midi: number; duration: number } => !!event);
      const offset = [0.5, 0.25].find((shift) => {
        const trial = soundingEvents.map((event) => ({ ...event, onset: midpoint + shift + event.onset }));
        const inPhrase = trial.filter((event) => event.onset >= phraseStart && event.onset + event.duration <= phraseEnd + 1e-6);
        const melodyAttacks = line.map((row) => num(row.onset));
        const masked = inPhrase.filter((event) => melodyAttacks.some((attack) => Math.abs(attack - event.onset) < 0.05)).length;
        return inPhrase.length >= 2 && masked / inPhrase.length <= 0.5;
      }) ?? null;
      if (offset === null) continue;
      const events = soundingEvents
        .map((event) => ({ ...event, onset: midpoint + offset + event.onset }))
        .filter((event) => event.onset >= phraseStart && event.onset + event.duration <= phraseEnd + 1e-6);
      const ids = foreground && ['fl', 'ob', 'cl', 'vn1'].includes(foreground) ? ['vn2', 'va', 'vc', 'bn', 'hn'] : ['fl', 'ob', 'cl', 'vn1', 'hn'];
      const spans = events.map((event) => ({ start: event.onset, end: event.onset + event.duration }));
      const carrier = tryCarrier(resolved.parts, ids, events.map((event) => event.midi), busy, spans, foreground);
      if (!carrier) continue;
      accepted = {
        op,
        partId: carrier.part.partId,
        notes: events.map((event) => ({ ...event, midi: event.midi + carrier.shift })),
      };
      break;
    }
    if (!accepted) {
      silence.push({ bar: phrase.startBar, reason: `${phrase.id}: no source-derived answer fitted without masking the theme or leaving the source sonority.` });
      omissions.push({ reason: `${phrase.id} answer omitted. No clear function in range.` });
      continue;
    }
    const part = resolved.parts.find((item) => item.partId === accepted!.partId)!;
    const derivedNotes: OrchestrateReceipt['derivedLines'][number]['events'] = [];
    for (const [noteIndex, note] of accepted.notes.entries()) {
      const fake: NoteRow = {
        record: line[0]!.record,
        event: { ...line[0]!.event, id: `${phrase.id}-answer-${noteIndex}`, written: null },
        onset: q(Math.round(note.onset * 480), 480),
        duration: q(Math.round(note.duration * 480), 480),
        midi: note.midi,
        role: 'countermelody',
        reason: 'derived',
        confidence: 'medium',
      };
      try {
        placeRow(placed, busy, fake, part, 0, validated.barLen, phrase.id, 'derived', 'transformed', accepted.op);
        derivedNotes.push({ sounding: note.midi, duration: note.duration, onset: note.onset });
      } catch {
        omissions.push({ reason: `${phrase.id} answer note ${noteIndex + 1} overlapped ${part.name} and was left out.` });
      }
    }
    if (derivedNotes.length) {
      answers.push({ phraseId: phrase.id, operator: accepted.op, partId: accepted.partId, notes: derivedNotes.length });
      derivedEvents.push({ partId: accepted.partId, lineageId: `${phrase.id}.${accepted.op}`, ops: [accepted.op], events: derivedNotes });
    }
  }

  for (const id of locked) {
    const row = classification.get(id);
    if (!row || row.disposition === 'omitted' || row.disposition === 'transformed') {
      return fail(`Protected source event ${id} did not survive (${row?.reason ?? 'missing'}).`);
    }
  }

  const leadPartBySection: Record<number, string> = {};
  phrases.forEach((phrase, index) => {
    leadPartBySection[index] = foregroundByPhrase.get(phrase.id) ?? 'vn1';
  });
  const registerPlan = planRegisterOwnership({
    sections,
    partRegisterBias: PART_BAND,
    mayLeadInMidRegister: { cl: true, hn: true, vn2: true, va: true },
  });
  const densityPlan = planDensityOwnership({
    sections,
    sectionDensityBias: Object.fromEntries(sections.map((section) => [section.index, phrases[section.index]?.kind === 'return' ? 'sparse' : 'moderate'])),
    partWeights: Object.fromEntries(resolved.parts.map((part) => [part.partId, part.partId === 'db' ? 0.4 : 0.2])),
  });
  const texturePlan = planTextureOwnership({ sections, leadPartBySection });
  const colourPlan: SectionColourPlan[] = phrases.map((phrase) => ({
    section: phrase.id,
    startBar: phrase.startBar,
    endBar: phrase.endBar,
    density: getDensityForBar(densityCurve, phrase.startBar) === 'sparse' ? 'sparse' : 'medium',
    registerCentre: 64,
    melodyCarriers: [foregroundByPhrase.get(phrase.id) ?? 'vn1'],
    doubling: 'none',
    maxDoublingBars: 0,
    harmonySource: 'source',
    roles: { [foregroundByPhrase.get(phrase.id) ?? 'vn1']: 'melody' },
  }));

  const specs: E2PartSpec[] = resolved.parts.map((part) => ({
    partId: part.partId,
    name: part.name,
    instrumentIdentity: part.spec.id === 'viola' ? 'viola' : part.spec.id,
    midiProgram: part.spec.midiProgram,
    clef: part.spec.clefs[0] === 'bass' ? 'bass' : 'treble',
    transposition: part.spec.transposition,
    hardRange: part.spec.soundingHardRange,
    maxSimultaneous: 1,
    catalogueInstrumentSound: part.spec.instrumentSound,
  }));
  const placements: E2RealisedPlacement[] = [];
  const assignments: E2Assignment[] = [];
  placed.forEach((note, index) => {
    const id = `pc-${note.partId}-${index}`;
    const lineage: EventLineage = {
      eventId: id,
      origin: note.origin === 'derived' ? 'derived' : 'source',
      sourceEventIds: note.sourceIds,
      parentEventIds: [],
      operation: {
        id: note.op ?? 'piano-chamber-place',
        version: 'piano-chamber-1',
        parametersHash: parametersHash({ mode, shift: note.octaveShift, op: note.op ?? 'place' }),
      },
      seed: request.seed,
    };
    placements.push({
      id,
      attack: {
        eventId: id,
        onset: note.onset,
        duration: note.duration,
        pitch: note.pitch,
        members: [{ parentId: 'piano-source', memberId: note.sourceIds[0] ?? id }],
        rest: false,
      },
      lineage,
      regionId: note.phraseId,
      slotId: note.origin,
      logicalVoiceId: note.partId,
      occurrence: index,
      sourceNotationEventIds: note.sourceIds,
    });
    assignments.push({ placementId: id, partId: note.partId, voice: 1 });
  });
  const tieGroups = new Map<string, string[]>();
  for (const placement of placements) {
    const source = placement.sourceNotationEventIds[0];
    if (!source) continue;
    const list = tieGroups.get(`${placement.logicalVoiceId}:${source}`) ?? [];
    list.push(placement.id);
    tieGroups.set(`${placement.logicalVoiceId}:${source}`, list);
  }
  let built;
  try {
    built = buildE2Score({
      title: 'Piano to chamber',
      tempo,
      bars: 24,
      metres: Object.fromEntries(Array.from({ length: 24 }, (_, index) => [index + 1, { numerator: validated.beats, denominator: validated.beatType }])),
      parts: specs,
      placements,
      rests: [],
      assignments,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
  const dynamics: Record<string, PartDynamicEvent[]> = {};
  for (const phrase of phrases) {
    const partId = foregroundByPhrase.get(phrase.id);
    if (!partId) continue;
    const mark = dynamicFor(phrase.kind, melodyRows.some((row) => row.midi === highestMidi && row.event.bar >= phrase.startBar && row.event.bar <= phrase.endBar), phrase.endBar === 24);
    const list = dynamics[partId] ?? [];
    list.push({ bar: phrase.startBar, beat: 0, mark });
    dynamics[partId] = list;
  }
  built.score.partDynamics = dynamics;
  const velocity: Record<string, number> = { p: 54, mp: 68, mf: 80, f: 96 };
  for (const part of built.score.parts) {
    const marks = dynamics[part.id] ?? [];
    for (const measure of part.measures) {
      const mark = [...marks].reverse().find((item) => item.bar <= measure.index)?.mark ?? 'mf';
      for (const event of measure.events) {
        if (event.kind === 'note') event.velocity = velocity[mark] ?? 80;
      }
    }
  }
  for (const [key, ids] of tieGroups) {
    if (ids.length < 2) continue;
    void key;
    ids.forEach((id, index) => {
      const tie = index === 0 ? 'start' : index === ids.length - 1 ? 'stop' : 'continue';
      for (const part of built.score.parts) {
        for (const measure of part.measures) {
          for (const event of measure.events) {
            if (event.kind === 'note' && event.pianoExact?.logicalEventId === id) {
              const note = event as NoteEvent;
              note.notation = { ...note.notation, tie };
            }
          }
        }
      }
    });
  }
  for (const part of built.score.parts) {
    for (const measure of part.measures) {
      for (const event of measure.events) {
        if (event.kind !== 'note' || !event.pianoExact?.logicalEventId) continue;
        const placement = placements.find((item) => item.id === event.pianoExact?.logicalEventId);
        const sourceId = placement?.sourceNotationEventIds[0];
        const row = rows.find((item) => item.event.id === sourceId);
        if (!placement || !row || (!row.event.tieStart && !row.event.tieStop)) continue;
        const siblings = placements
          .filter((item) => item.sourceNotationEventIds[0] === sourceId && item.logicalVoiceId === placement.logicalVoiceId)
          .sort((a, b) => qCmp(a.attack.onset, b.attack.onset));
        const index = siblings.findIndex((item) => item.id === placement.id);
        const note = event as NoteEvent;
        if (index === siblings.length - 1 && row.event.tieStart) {
          note.notation = { ...note.notation, tie: siblings.length === 1 ? 'start' : 'continue' };
        } else if (index === 0 && row.event.tieStop) {
          note.notation = { ...note.notation, tie: 'stop' };
        }
      }
    }
  }
  const exported = runEnsembleExportPipeline(built.score);
  if (!exported.ok || !exported.xml) return fail(exported.errors.join(' ') || 'MusicXML export failed.');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'piano-chamber-'));
  const midiPath = writeScoreMidi(built.score, directory, 'piano-chamber', built.score.barMeterMap, tempo);
  if (!midiPath) return fail('MIDI export failed.');
  const midiBase64 = fs.readFileSync(midiPath).toString('base64');
  const orchestration = buildOrchestrationReport({ xml: exported.xml });
  const hard = orchestration.rangeUse.filter((row) => row.outsideHard > 0);
  if (hard.length) return fail(`Range report found hard-range notes in ${hard.map((row) => row.partId).join(', ')}.`);
  const coherence = buildCoherenceReport({
    xml: exported.xml,
    hookMidis: melodyRows.slice(0, 4).map((row) => row.midi),
    hookId: 'piano-head',
  });
  const fidelity: PianoChamberFidelity = {
    version: 'piano-chamber-1',
    mode,
    sourceSha256: bundle.sha256,
    seed: request.seed,
    tempoBpm: tempo,
    phrases: phrases.map((phrase, index) => ({
      id: phrase.id,
      startBar: phrase.startBar,
      endBar: phrase.endBar,
      role: phrase.kind,
      foreground: foregroundByPhrase.get(phrase.id) ?? '',
      answer: answers.find((item) => item.phraseId === phrase.id)?.partId ?? null,
      answerOperator: answers.find((item) => item.phraseId === phrase.id)?.operator ?? null,
      register: registerPlan.entries.find((entry) => entry.sectionIndex === index && entry.partId === foregroundByPhrase.get(phrase.id))?.registerBand ?? 'middle',
      density: getDensityForBar(densityCurve, phrase.startBar),
      dynamic: dynamicFor(phrase.kind, false, phrase.endBar === 24) ?? 'mf',
      handover: index > 0 && foregroundByPhrase.get(phrase.id) !== foregroundByPhrase.get(phrases[index - 1]!.id),
      ending: phrase.endBar === 24,
    })),
    classifications: [...classification.values()],
    protectedEventIds: [...locked],
    silence,
    omissions,
    derivedAnswers: answers,
    preview: placed.map((note) => ({
      partId: note.partId,
      midi: note.pitch.midi,
      onset: num(note.onset),
      duration: num(note.duration),
    })),
    warnings,
    musicalQualityScore: null,
    musicallyApproved: false,
    listeningQuestions: [
      'Does the inferred melody still read as the theme after the instrument handover?',
      'Do the added answers sound necessary, or would the bar be clearer as silence?',
      'Does the ending release, or does an inner part keep the harmony spinning?',
    ],
  };
  const receipt: OrchestrateReceipt = {
    version: 'orchestrate-1',
    inputSha256: bundle.sha256,
    params: { ...request, plan: colourPlan, template: 'chamber_orchestra', sourceMusicXml: command.sourceMusicXml },
    layerAssignments: fidelity.classifications
      .filter((item) => item.partId)
      .map((item) => ({
        bar: rows.find((row) => row.event.id === item.eventId)?.event.bar ?? 1,
        role: rows.find((row) => row.event.id === item.eventId)?.role === 'melody'
          ? 'melody'
          : rows.find((row) => row.event.id === item.eventId)?.role === 'bass'
            ? 'bass'
            : rows.find((row) => row.event.id === item.eventId)?.role === 'countermelody'
              ? 'countermelody'
              : 'harmony_inner',
        partId: item.partId as string,
        sourcePart: rows.find((row) => row.event.id === item.eventId)?.event.partId ?? 'piano',
        octaveShift: item.octaveShift,
      })),
    derivedLines: derivedEvents,
    omittedLines: omissions.map((item) => ({ partId: item.partId ?? '', lineageId: item.eventId ?? '', reason: item.reason })),
    flagged: [],
    omissions: resolved.omissions,
    doublingRuns: orchestration.doublingRuns,
    provenance: [{
      source: 'source',
      param: mode,
      invoked: true,
      influenced: true,
      pitchClasses: [...new Set(rows.map((row) => pcOf(row.midi)))],
      detail: `Family ${family.family}. Density entries ${densityPlan.entries.length}. Texture entries ${texturePlan.entries.length}. Coherence patterns ${coherence.discovered.length}. Motif discovery on the piano is descriptive only.`,
    }],
    planners: {
      family: 'chamber_orchestra',
      density: phrases.map((phrase) => ({ bar: phrase.startBar, requested: colourPlan.find((section) => section.section === phrase.id)?.density ?? 'medium', planner: getDensityForBar(densityCurve, phrase.startBar) })),
      register: registerPlan.entries.filter((entry) => entry.sectionIndex === 0).map((entry) => ({ partId: entry.partId, requested: PART_BAND[entry.partId] ?? 'middle', assigned: entry.registerBand })),
      guitarZone: null,
      bassZone: null,
      ownershipEntries: texturePlan.entries.length,
    },
    parallelMotionReported: null,
    independence: [],
    voiceLeadingScores: [],
    musicalQualityScore: null,
    musicallyApproved: false,
  };
  return { ok: true, musicXml: exported.xml, midiBase64, receipt, score: built.score, fidelity };
}
