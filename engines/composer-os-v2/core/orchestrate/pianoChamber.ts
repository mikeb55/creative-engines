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
import { writeScoreMidi, writeScoreModelMidiFile } from '../export/midiScoreWriter';
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
import { barSpans, buildE2Score, quarterLength, type E2Assignment, type E2PartSpec } from './e2Placement';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import type { E2RealisedPlacement } from './harmonicRealisation';
import type { SpelledRegister } from './harmonicColourTypes';
import type { EventLineage } from './sourceFoundation';
import {
  planFortyEightBarForm,
  symphonicPhrasesFromFortyEightBarPlan,
} from '../form/macroFormPlanner';
import { applyPianoChamberHarmonic, type ScheduledHarmonicNote } from './pianoChamberHarmonic';
import { buildSymphonicMidiSet, type SymphonicMidiManifest } from './symphonicMidiSet';
import {
  BASS_DRUM_GM,
  HARP_RANGE,
  SUSPENDED_CYMBAL_GM,
  SYMPHONIC_PART_BAND,
  TIMPANI_RANGE,
  foldIntoRange,
  isSymphonicWind,
  isSymphonicScoreEnding,
  planSymphonicPhrases,
  resolveSymphonicRoster,
  resolveSymphonicSettings,
  SYMPHONIC_DEFAULT_SCORE_END_BAR,
  SYMPHONIC_EXTENDED_SCORE_END_BAR,
  type SymphonicPhrasePlan,
} from './symphonicWriting';
import {
  COFFEE_RUN_OCTET_BN1_MAX_NOTES,
  COFFEE_RUN_OCTET_DB_MAX_NOTES,
  COFFEE_RUN_OCTET_DIALOGUE_IDS,
  COFFEE_RUN_OCTET_MARKER_BARS,
  COFFEE_RUN_OCTET_ORCH_IDS,
  COFFEE_RUN_OCTET_PART_BAND,
  buildCoffeeRunOctetDialoguePhrase,
  coffeeRunOctetCarrierOrder,
  coffeeRunOctetIsMarkerBar,
  coffeeRunOctetMarkerDialogueOrder,
  coffeeRunOctetPhrasePalette,
  coffeeRunOctetRestGate,
  resolveCoffeeRunOctetRoster,
  shapeCoffeeRunOctetCompanion,
  type CoffeeRunOctetLane,
  type OctetPianoAnchor,
} from './coffeeRunOctet';
import {
  applyDialogueDynamicsVelocities,
  buildOrchestralDialogue77241PartDynamics,
  buildOrchestralDialogueVariedRepeat48PartDynamics,
  ORCHESTRAL_DIALOGUE_VARIED_REPEAT_48,
  planOrchestralDialogueDistribution,
  resolveOrchestralDialoguePlan,
} from '../symphonic/orchestralDialoguePlan';
import { auditPhase2Distribution, planSymphonicDistribution, type Phase2DistributionReceipt, type Phase2EventPlan } from './symphonicDistribution';
import { applySymphonicExpression, type Phase3ExpressionReceipt } from './symphonicExpression';
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
  bars: typeof SYMPHONIC_DEFAULT_SCORE_END_BAR | typeof SYMPHONIC_EXTENDED_SCORE_END_BAR;
  beats: number;
  beatType: number;
  /** Contiguous runs. One run when the excerpt stays in one signature. */
  metres: Array<{ bar: number; throughBar: number; beats: number; beatType: number; groups: number[] | null }>;
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
  /** Present only for the symphonic ensemble. Chamber receipts omit it. */
  symphonic?: {
    plans: SymphonicPhrasePlan[];
    timpaniTuning: number[];
    harpPedal: string;
    conventions: string[];
    /** Present only for allocation phase-2. Phase 1 receipts omit it. */
    distribution?: Phase2DistributionReceipt;
    /** Present only when Phase 2 allocation runs expressive orchestration. */
    expression?: Phase3ExpressionReceipt;
  };
  /** Present only when a Phase 2 control wrote notes. */
  harmonicDevelopment?: {
    protectedEventIds: string[];
    notes: Array<{
      control: 'bhl' | 'triad-pair';
      partId: string;
      onset: number;
      duration: number;
      midi: number;
      reason: string;
    }>;
  };
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
  voice?: number;
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

const CHAMBER_METRES: ReadonlyArray<readonly [number, number]> = [
  [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],
  [3, 8], [5, 8], [6, 8], [7, 8], [9, 8], [12, 8],
];

const CHAMBER_METRE_LABEL = '2/4, 3/4, 4/4, 5/4, 6/4, 7/4, 3/8, 5/8, 6/8, 7/8, 9/8 and 12/8';

function chamberMetreSupported(beats: number, beatType: number): boolean {
  return CHAMBER_METRES.some(([numerator, denominator]) => numerator === beats && denominator === beatType);
}

function legacyMetre(beats: number, beatType: number): boolean {
  return (beats === 4 && beatType === 4) || (beats === 3 && beatType === 4) || (beats === 6 && beatType === 8);
}

interface ChamberMetre {
  beats: number;
  beatType: number;
  barLen: ExactQuarter;
  uniform: boolean;
  scoreEndBar: number;
  metres: BarMeterMap;
  spans: Array<{ bar: number; start: ExactQuarter; length: ExactQuarter }>;
  runs: Array<{ bar: number; throughBar: number; beats: number; beatType: number; groups: number[] | null }>;
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

function splitAlong(
  onset: ExactQuarter,
  duration: ExactQuarter,
  spans: ReadonlyArray<{ bar: number; start: ExactQuarter; length: ExactQuarter }>,
): Array<{ onset: ExactQuarter; duration: ExactQuarter }> {
  const pieces: Array<{ onset: ExactQuarter; duration: ExactQuarter }> = [];
  let cursor = onset;
  let left = duration;
  const last = spans[spans.length - 1];
  if (!last) throw new Error('the score has no bars');
  const scoreEnd = qAdd(last.start, last.length);
  while (qCmp(left, q(0)) > 0) {
    const span = spans.find((item) => qCmp(cursor, item.start) >= 0 && qCmp(cursor, qAdd(item.start, item.length)) < 0);
    if (!span) throw new Error('duration continues past the last bar');
    const barEnd = qAdd(span.start, span.length);
    const room = qSub(barEnd, cursor);
    const take = qCmp(left, room) <= 0 ? left : room;
    if (qCmp(take, q(0)) <= 0) throw new Error('duration did not advance');
    pieces.push({ onset: cursor, duration: take });
    cursor = qAdd(cursor, take);
    left = qSub(left, take);
    if (qCmp(cursor, scoreEnd) > 0) throw new Error('duration continues past the last bar');
  }
  return pieces;
}

function sliceNote(
  onset: ExactQuarter,
  duration: ExactQuarter,
  barLen: ExactQuarter,
  spans?: ReadonlyArray<{ bar: number; start: ExactQuarter; length: ExactQuarter }>,
): Array<{ onset: ExactQuarter; duration: ExactQuarter }> {
  return spans ? splitAlong(onset, duration, spans) : splitBars(onset, duration, barLen);
}

function answerBeat(metre: ChamberMetre, bar: number): number {
  const signature = metre.metres[bar] ?? { numerator: metre.beats, denominator: metre.beatType };
  if (legacyMetre(signature.numerator, signature.denominator)) return 1;
  if (signature.denominator === 8 && (signature.numerator === 9 || signature.numerator === 12)) return 1.5;
  if (signature.denominator === 8) return 0.5;
  return 1;
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

function validateBundle(bundle: SourceBundle, partIds: string[] | undefined): { error: string } | { records: SourceRecord[]; metre: ChamberMetre } {
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
  const scoreEndBar = bars[bars.length - 1] ?? 0;
  if (
    bars[0] !== 1
    || bars.length !== scoreEndBar
    || (scoreEndBar !== SYMPHONIC_DEFAULT_SCORE_END_BAR && scoreEndBar !== SYMPHONIC_EXTENDED_SCORE_END_BAR)
  ) {
    return { error: `Phase 1 needs a supplied ${SYMPHONIC_DEFAULT_SCORE_END_BAR}- or ${SYMPHONIC_EXTENDED_SCORE_END_BAR}-bar score, bars 1–${SYMPHONIC_DEFAULT_SCORE_END_BAR} or 1–${SYMPHONIC_EXTENDED_SCORE_END_BAR}. This selection has ${bars.length} bar numbers (${bars[0] ?? 'none'}–${bars[bars.length - 1] ?? 'none'}). Prepare the excerpt. The ending was not invented.` };
  }
  if (measures.some((measure) => measure.pickup)) return { error: 'Pickup bars are outside Phase 1. The metre was not changed.' };
  for (const part of selected) {
    const present = new Set(measures.filter((measure) => measure.partId === part.id).map((measure) => measure.bar));
    for (let bar = 1; bar <= scoreEndBar; bar += 1) {
      if (!present.has(bar)) return { error: `Bar ${bar} is missing from ${part.id}. The bar was not invented.` };
    }
  }
  const metres: BarMeterMap = {};
  const runs: ChamberMetre['runs'] = [];
  for (let bar = 1; bar <= scoreEndBar; bar += 1) {
    const group = measures.filter((measure) => measure.bar === bar);
    const first = group[0];
    if (!first) return { error: `Bar ${bar} is missing. The bar was not invented.` };
    if (group.some((measure) => measure.metreRejected)) {
      return { error: `Bar ${bar} has a time signature that was not read. The metre was not rewritten.` };
    }
    if (!chamberMetreSupported(first.beats, first.beatType)) {
      return { error: `Supported metres are ${CHAMBER_METRE_LABEL}. Bar ${bar} is ${first.beats}/${first.beatType}. The time signature was not rewritten.` };
    }
    if (group.some((measure) => measure.beats !== first.beats || measure.beatType !== first.beatType)) {
      return { error: `Bar ${bar} does not share one time signature across the selected piano parts. Nothing was quantised.` };
    }
    const groupText = group.map((measure) => (measure.beatGroups ?? []).join('+'));
    if (new Set(groupText).size > 1) {
      return { error: `Bar ${bar} has conflicting beat groups. No accent pattern was chosen.` };
    }
    metres[bar] = { numerator: first.beats, denominator: first.beatType };
    const groups = first.beatGroups && first.beatGroups.length > 1 ? [...first.beatGroups] : null;
    const previous = runs[runs.length - 1];
    const same = previous
      && previous.beats === first.beats
      && previous.beatType === first.beatType
      && (previous.groups ?? []).join('+') === (groups ?? []).join('+');
    if (same && previous) previous.throughBar = bar;
    else runs.push({ bar, throughBar: bar, beats: first.beats, beatType: first.beatType, groups });
  }
  const beats = metres[1]?.numerator ?? 0;
  const beatType = metres[1]?.denominator ?? 0;
  const uniform = runs.length === 1;
  const tuplet = bundle.records.find((record) => selected.some((part) => part.id === record.canonical.partId) && record.canonical.tuplet && (record.canonical.tuplet.actualNotes !== 3 || record.canonical.tuplet.normalNotes !== 2));
  if (tuplet) {
    const ratio = tuplet.canonical.tuplet!;
    return { error: `Unsupported tuplet ${ratio.actualNotes}:${ratio.normalNotes} in ${tuplet.canonical.partId} bar ${tuplet.canonical.bar}. Phase 1 keeps ordinary 3:2 triplets only.` };
  }
  const records = [...selectSourceEvents(bundle, selected.map((part) => ({ partId: part.id })))];
  for (const record of records) {
    const measure = measures.find((item) => item.partId === record.canonical.partId && item.bar === record.canonical.bar);
    if (!measure) return { error: `Bar ${record.canonical.bar} is missing from ${record.canonical.partId}.` };
    const end = qAdd(rat(record.canonical.onsetInBar), rat(record.canonical.duration));
    if (end.n * measure.expected.d > measure.expected.n * end.d) {
      return { error: `Source event ${record.canonical.id} extends past bar ${record.canonical.bar} (${measure.beats}/${measure.beatType}). The note was not shortened or moved.` };
    }
  }
  const spans = barSpans(metres, scoreEndBar);
  return {
    records,
    metre: {
      beats,
      beatType,
      barLen: quarterLength(beats, beatType),
      uniform,
      scoreEndBar,
      metres,
      spans,
      runs,
    },
  };
}

function buildRows(records: readonly SourceRecord[], metre: ChamberMetre): NoteRow[] {
  return records
    .filter((record) => !record.canonical.rest && record.canonical.soundingMidi !== null && record.canonical.written)
    .map((record) => ({
      record,
      event: record.canonical,
      onset: metre.uniform
        ? qAdd(q((record.canonical.bar - 1) * metre.barLen.n, metre.barLen.d), rat(record.canonical.onsetInBar))
        : qAdd(metre.spans[record.canonical.bar - 1]!.start, rat(record.canonical.onsetInBar)),
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
    if (!upperNotes.length) continue;
    const pool = upperNotes;
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

function proposePhrasesFromFortyEightBarForm(): { phrases: Phrase[]; uncertain: string[] } {
  const plan = planFortyEightBarForm(null);
  const slices = symphonicPhrasesFromFortyEightBarPlan(plan);
  const phrases: Phrase[] = slices.map((slice) => ({
    id: slice.id,
    startBar: slice.startBar,
    endBar: slice.endBar,
    reason: `48-bar form: ${slice.label} (${slice.thematicRole}) → symphonic ${slice.phraseRole}.`,
    confidence: 'medium' as const,
    kind: slice.phraseRole,
  }));
  return { phrases, uncertain: [] };
}

function proposePhrases(rows: NoteRow[], barLen: ExactQuarter, scoreEndBar: number): { phrases: Phrase[]; uncertain: string[] } {
  if (scoreEndBar === SYMPHONIC_EXTENDED_SCORE_END_BAR) {
    return proposePhrasesFromFortyEightBarForm();
  }
  const melody = rows.filter((row) => row.role === 'melody').sort((a, b) => qCmp(a.onset, b.onset));
  const uncertain: string[] = [];
  if (!melody.length) return { phrases: [{ id: 'p1', startBar: 1, endBar: scoreEndBar, reason: 'No melody lane was inferred.', confidence: 'low', kind: 'statement' }], uncertain: ['No melody lane.'] };
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
    for (let bar = 9; bar < scoreEndBar; bar += 8) {
      unique.push(bar);
      gridStarts.add(bar);
    }
  }
  const phrases: Phrase[] = unique.map((startBar, index) => {
    const endBar = (unique[index + 1] ?? scoreEndBar + 1) - 1;
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

function applyCorrections(
  rows: NoteRow[],
  phrases: Phrase[],
  correction: PianoChamberCorrection | undefined,
  freezePhraseKinds = false,
): Phrase[] {
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
  if (!freezePhraseKinds && (correction?.roles || (correction?.phrases?.length && next !== phrases))) {
    classifyPhraseKinds(rows, next);
  }
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
  writtenPitch?: SpelledRegister,
  variableSpans?: ReadonlyArray<{ bar: number; start: ExactQuarter; length: ExactQuarter }>,
  voice = 1,
  /** Polyphonic source seats (piano) may stack attacks; monophonic parts stay exclusive. */
  allowPolyphony = false,
): void {
  const midi = writtenPitch?.midi ?? row.midi + shift;
  const pitch = writtenPitch ?? spellShift(row.event, midi, shift);
  const pieces = sliceNote(row.onset, row.duration, barLen, variableSpans);
  const busyKey = allowPolyphony ? `${part.partId}:v${voice}:m${midi}` : part.partId;
  pieces.forEach((piece, pieceIndex) => {
    const written = decompose(piece.duration);
    let cursor = piece.onset;
    written.forEach((duration, durationIndex) => {
      const start = num(cursor);
      const end = start + num(duration);
      if (busyOverlap(busy, busyKey, start, end)) {
        throw new Error(`${part.partId} overlap at ${start}`);
      }
      occupy(busy, busyKey, start, end);
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
        voice,
      });
      cursor = qAdd(cursor, duration);
    });
  });
}

/** Map MusicXML piano staff/voice onto grand-staff export voices (1 RH, 3 LH). */
function pianoRetainVoice(row: NoteRow): number {
  if ((row.event.staff ?? '1') === '2') return 3;
  const voice = Number(row.event.voice);
  if (Number.isFinite(voice) && voice >= 1) return voice;
  return 1;
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
  const rows = buildRows(validated.records, validated.metre);
  if (!rows.length) return fail('The piano selection has no sounding notes.');
  const roleUncertainty = assignRoles(rows);
  const phrased = proposePhrases(rows, validated.metre.barLen, validated.metre.scoreEndBar);
  const phrases = applyCorrections(
    rows,
    phrased.phrases,
    correction,
    validated.metre.scoreEndBar === SYMPHONIC_EXTENDED_SCORE_END_BAR && !correction?.phrases?.length,
  );
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
      bars: validated.metre.scoreEndBar as typeof SYMPHONIC_DEFAULT_SCORE_END_BAR | typeof SYMPHONIC_EXTENDED_SCORE_END_BAR,
      beats: validated.metre.beats,
      beatType: validated.metre.beatType,
      metres: validated.metre.runs,
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
  | { ok: true; musicXml: string; midiBase64: string; midiSetBase64?: string; midiManifest?: SymphonicMidiManifest; receipt: OrchestrateReceipt; score: ScoreModel; fidelity: PianoChamberFidelity }
  | { ok: false; error: string } {
  const command = request.pianoChamber;
  if (!command) return fail('Piano chamber was not requested.');
  const correction = command.correction ?? {};
  if (
    correction.ensemble
    && correction.ensemble !== 'chamber'
    && correction.ensemble !== 'symphonic'
    && correction.ensemble !== 'coffee_run_octet'
  ) {
    return fail('Ensemble must be chamber, symphonic, or coffee_run_octet.');
  }
  const symphonic = correction.ensemble === 'symphonic';
  const octet = correction.ensemble === 'coffee_run_octet';
  const symphonicSettings = symphonic ? resolveSymphonicSettings(correction.symphonic) : null;
  if (symphonicSettings && 'error' in symphonicSettings) return fail(symphonicSettings.error);
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
  const tempoMarks = bundle.score.directions.filter((direction) => direction.kind === 'tempo');
  if (symphonic) {
    const marked = tempoMarks.filter((direction) => typeof direction.playbackBpm === 'number' && direction.playbackBpm > 0);
    const distinct = new Set(marked.map((direction) => direction.playbackBpm));
    if (distinct.size > 1) {
      return fail('The source has more than one tempo. A tempo map was not flattened to the first mark. Refusing the symphonic realisation.');
    }
    if (tempoMarks.some((direction) => /eighth|half|dotted/i.test(direction.text) && !/quarter/i.test(direction.text))) {
      return fail('The source tempo unit is not a quarter-note metronome mark. It was not rewritten as the first tempo.');
    }
  }
  const tempo = proposed.proposal.tempoBpm ?? correction.tempoBpm ?? null;
  if (tempo === null || tempo <= 0) {
    return fail('The score has no numeric tempo. Set correction.tempoBpm. The tempo was not guessed.');
  }
  const metre = validated.metre;
  const scoreEndBar = metre.scoreEndBar;
  const variableSpans = metre.uniform ? undefined : metre.spans;
  const phraseBounds = (phrase: { startBar: number; endBar: number }): { start: number; end: number } => {
    if (metre.uniform) {
      return {
        start: num(q((phrase.startBar - 1) * metre.barLen.n, metre.barLen.d)),
        end: num(q(phrase.endBar * metre.barLen.n, metre.barLen.d)),
      };
    }
    const first = metre.spans[phrase.startBar - 1]!;
    const last = metre.spans[phrase.endBar - 1]!;
    return { start: num(first.start), end: num(qAdd(last.start, last.length)) };
  };
  const barOfOnset = (onset: ExactQuarter): number => {
    if (metre.uniform) return Math.floor(num(onset) / num(metre.barLen) + 1e-9) + 1;
    const value = num(onset);
    for (const span of metre.spans) {
      const start = num(span.start);
      const end = start + num(span.length);
      if (value >= start - 1e-9 && value < end - 1e-9) return span.bar;
    }
    return scoreEndBar;
  };
  const rows = buildRows(validated.records, metre);
  assignRoles(rows);
  let phrases = proposePhrases(rows, metre.barLen, scoreEndBar).phrases;
  phrases = applyCorrections(
    rows,
    phrases,
    correction,
    scoreEndBar === SYMPHONIC_EXTENDED_SCORE_END_BAR && !correction?.phrases?.length,
  );
  if (phrases.some((phrase) => phrase.startBar < 1 || phrase.endBar > scoreEndBar || phrase.endBar < phrase.startBar)) {
    return fail(`Phrase boundaries must stay inside bars 1–${scoreEndBar}.`);
  }
  const mode: PianoChamberMode = correction.mode === 'faithful' ? 'faithful' : 'developing';
  const locked = new Set(defaultLocks(rows, phrases));
  for (const id of correction.locks ?? []) locked.add(id);
  for (const id of correction.unlocks ?? []) locked.delete(id);
  const omitted = new Set(correction.omitEventIds ?? []);
  for (const id of omitted) {
    if (locked.has(id)) return fail(`Locked source event ${id} cannot be omitted. Unlock it first. Locked material was not changed silently.`);
  }
  const resolved = octet
    ? resolveCoffeeRunOctetRoster()
    : symphonic
      ? resolveSymphonicRoster()
      : resolveTemplate('chamber_orchestra');
  if (octet && (resolved.omissions.length > 0 || resolved.parts.length !== 8)) {
    return fail(`The Coffee Run octet roster is incomplete. ${resolved.omissions.map((item) => item.detail).join(' ') || `${resolved.parts.length} parts resolved.`}`);
  }
  if (!symphonic && !octet && resolved.parts.length !== 10) return fail('The chamber roster did not resolve to ten catalogue instruments.');
  if (symphonic && (resolved.omissions.length > 0 || resolved.parts.length !== 31)) {
    return fail(`The symphonic roster is incomplete. ${resolved.omissions.map((item) => item.detail).join(' ') || `${resolved.parts.length} parts resolved.`}`);
  }
  const partBand = octet ? COFFEE_RUN_OCTET_PART_BAND : symphonic ? SYMPHONIC_PART_BAND : PART_BAND;
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
  const densityCurve = planDensityCurve(sectionRoles, scoreEndBar);
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
  for (let bar = 1; bar <= scoreEndBar; bar += 1) {
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
  const phase2 = !!(symphonic && symphonicSettings && symphonicSettings.allocation === 'phase-2');
  let phase2Distribution: Phase2DistributionReceipt | null = null;
  let dialoguePhase2Placements: Phase2EventPlan[] | null = null;
  let phase2Handovers: Record<string, boolean> = {};
  const derivedEvents: OrchestrateReceipt['derivedLines'] = [];
  const timpaniTuning: number[] = [];
  let harpPedal = '';
  let phrasePlans = symphonic && symphonicSettings && !phase2 ? planSymphonicPhrases(
    phrases,
    (id) => {
      const phrase = phrases.find((item) => item.id === id);
      const line = melodyRows.filter((row) => phrase && row.event.bar >= phrase.startBar && row.event.bar <= phrase.endBar);
      if (!line.length) return 64;
      return line.reduce((sum, row) => sum + row.midi, 0) / line.length;
    },
    (id) => {
      const phrase = phrases.find((item) => item.id === id);
      return melodyRows.filter((row) => phrase && row.event.bar >= phrase.startBar && row.event.bar <= phrase.endBar).length;
    },
    symphonicSettings,
    scoreEndBar,
  ) : null;
  const planFor = (id: string): SymphonicPhrasePlan | null => phrasePlans?.find((plan) => plan.phraseId === id) ?? null;

  if (phase2 && symphonicSettings) {
    const barStart = (bar: number): number => metre.uniform
      ? (bar - 1) * num(metre.barLen)
      : num(metre.spans[bar - 1]!.start);
    const barEnd = (bar: number): number => metre.uniform
      ? bar * num(metre.barLen)
      : num(qAdd(metre.spans[bar - 1]!.start, metre.spans[bar - 1]!.length));
    const dialoguePlan = resolveOrchestralDialoguePlan(correction.symphonic);
    const distributionInput = {
      notes: rows.filter((row) => !omitted.has(row.event.id)).map((row) => ({
        id: row.event.id,
        bar: row.event.bar,
        onset: num(row.onset),
        duration: num(row.duration),
        midi: row.midi,
        role: row.role,
        locked: locked.has(row.event.id),
        tieStart: row.event.tieStart,
        tieStop: row.event.tieStop,
      })),
      phrases: phrases.map((phrase, index) => ({
        id: phrase.id,
        index,
        startBar: phrase.startBar,
        endBar: phrase.endBar,
        kind: phrase.kind,
        ...phraseBounds(phrase),
      })),
      parts: resolved.parts.map((part) => ({
        partId: part.partId,
        range: part.spec.soundingHardRange,
        transposition: part.spec.transposition,
      })),
      settings: symphonicSettings,
      mode,
      seed: request.seed,
      silentBars,
      barStart,
      barEnd,
    };
    const planned = dialoguePlan
      ? planOrchestralDialogueDistribution({ ...distributionInput, plan: dialoguePlan })
      : planSymphonicDistribution(distributionInput);
    if (!planned.ok) return fail(planned.error);
    const audit = auditPhase2Distribution({
      events: planned.plan.distribution.events,
      silentBars,
      silentSpans: [...silentBars].map((bar) => ({ start: barStart(bar), end: barEnd(bar) })),
      barOf: (onset) => barOfOnset(q(Math.round(onset * 480), 480)),
      locked: rows.filter((row) => locked.has(row.event.id)).map((row) => ({
        id: row.event.id,
        midi: row.midi,
        onset: num(row.onset),
        duration: num(row.duration),
      })),
      settings: symphonicSettings,
      mode,
    });
    if (!audit.ok) return fail(audit.failures[0] ?? 'Phase 2 distribution failed its source checks.');
    for (const item of planned.plan.placements) {
      const part = resolved.parts.find((candidate) => candidate.partId === item.partId);
      if (!part) return fail(`Phase 2 named an unknown part ${item.partId}.`);
      const source = rows.find((row) => row.event.id === item.eventId);
      const row = item.kind === 'source' && source
        ? source
        : {
          record: rows[0]!.record,
          event: {
            ...rows[0]!.event,
            id: item.eventId,
            written: null,
            rest: false,
            tieStart: false,
            tieStop: false,
            soundingMidi: item.midi,
          },
          onset: q(Math.round(item.onset * 480), 480),
          duration: q(Math.round(item.duration * 480), 480),
          midi: item.midi,
          role: 'countermelody' as const,
          reason: item.reason,
          confidence: 'medium' as const,
        };
      const placementRow = item.eventId.startsWith('4d-vc-b1:') ? { ...row, duration: q(1, 2) } : row;
      try {
        placeRow(
          placed,
          busy,
          placementRow,
          part,
          item.kind === 'source' && source ? item.shift : 0,
          metre.barLen,
          item.phraseId,
          item.kind === 'derived' || item.role === 'melodic-reinforcement' || item.lineage.includes(':') ? 'derived' : 'source',
          item.transformation === 'preserved-source' ? 'retained' : item.transformation === 'octave-transfer' ? 'octave-transferred' : 'transformed',
          item.op,
          undefined,
          variableSpans,
          item.voice,
        );
      } catch (error) {
        if (item.classifies && locked.has(item.eventId)) {
          return fail(error instanceof Error ? error.message : `Locked event ${item.eventId} could not be placed.`);
        }
        planned.plan.omissions.push({ eventId: item.eventId, reason: 'The placement overlapped a voice that was already used.' });
        continue;
      }
      if (item.classifies && source) {
        classification.set(source.event.id, {
          eventId: source.event.id,
          disposition: item.shift === 0 ? 'retained' : 'octave-transferred',
          partId: item.partId,
          octaveShift: item.shift,
          reason: item.reason,
        });
      }
    }
    for (const [id, partId] of Object.entries(planned.plan.foreground)) foregroundByPhrase.set(id, partId);
    answers.push(...planned.plan.answers);
    derivedEvents.push(...planned.plan.derivedLines);
    silence.push(...planned.plan.silence);
    omissions.push(...planned.plan.omissions);
    warnings.push(...planned.plan.warnings);
    for (const item of planned.plan.omissions) {
      if (!item.eventId || !classification.has(item.eventId)) continue;
      const current = classification.get(item.eventId)!;
      if (current.disposition === 'omitted') current.reason = item.reason;
    }
    phrasePlans = planned.plan.plans;
    if (dialoguePlan) dialoguePhase2Placements = planned.plan.placements;
    phase2Distribution = planned.plan.distribution;
    phase2Handovers = planned.plan.handovers;
    timpaniTuning.push(...planned.plan.timpaniTuning);
    harpPedal = planned.plan.harpPedal;
  }

  const bassRows = rows.filter((row) => row.role === 'bass' && !omitted.has(row.event.id));
  if (!phase2) {
  if (octet) {
    const piano = resolved.parts.find((part) => part.partId === 'pn');
    if (!piano) return fail('Coffee Run octet needs a piano seat.');
    for (const row of rows) {
      if (omitted.has(row.event.id)) continue;
      const voice = pianoRetainVoice(row);
      try {
        placeRow(placed, busy, row, piano, 0, metre.barLen, phraseOf(phrases, row.event.bar).id, 'source', 'retained', undefined, undefined, variableSpans, voice, true);
      } catch (error) {
        return fail(error instanceof Error ? error.message : `Source piano event ${row.event.id} could not be retained.`);
      }
      classification.set(row.event.id, {
        eventId: row.event.id,
        disposition: 'retained',
        partId: 'pn',
        octaveShift: 0,
        reason: 'Source piano retained unchanged on the octet piano seat.',
      });
    }
    for (const phrase of phrases) foregroundByPhrase.set(phrase.id, 'pn');
    previousCarrier = 'pn';
    openingCarrierRef.id = 'pn';

    // Companion dialogue: short melodic phrases + overlapping exchanges.
    // Piano stays source-complete; companions remain non-doubling / conflict-checked.
    const coverage = new Map<string, number>(COFFEE_RUN_OCTET_ORCH_IDS.map((id) => [id, 0]));
    const pianoAnchors: OctetPianoAnchor[] = rows
      .filter((row) => !omitted.has(row.event.id))
      .map((row) => ({
        midi: row.midi,
        onset: num(row.onset),
        end: num(row.onset) + num(row.duration),
      }));

    const canSeat = (partId: string): boolean => {
      if (partId === 'bn1' && (coverage.get('bn1') ?? 0) >= COFFEE_RUN_OCTET_BN1_MAX_NOTES) return false;
      if (partId === 'db' && (coverage.get('db') ?? 0) >= COFFEE_RUN_OCTET_DB_MAX_NOTES) return false;
      return true;
    };

    const commitShaped = (
      shaped: { midi: number; onset: number; duration: number },
      part: ResolvedPart,
      row: NoteRow,
      phrase: { id: string },
      lane: string,
      tag: string,
    ): boolean => {
      if (busyOverlap(busy, part.partId, shaped.onset, shaped.onset + shaped.duration)) return false;
      const fake: NoteRow = {
        record: row.record,
        event: { ...row.event, id: `${phrase.id}-octet-${lane}-${part.partId}-${tag}-${row.event.id}`, written: null },
        onset: q(Math.round(shaped.onset * 480), 480),
        duration: q(Math.round(shaped.duration * 480), 480),
        midi: shaped.midi,
        role: 'countermelody',
        reason: 'octet-response',
        confidence: 'medium',
      };
      try {
        placeRow(
          placed,
          busy,
          fake,
          part,
          0,
          metre.barLen,
          phrase.id,
          'derived',
          'transformed',
          `octet-${lane}`,
          undefined,
          variableSpans,
          part.partId === 'hp' && shaped.midi < 60 ? 3 : 1,
        );
      } catch {
        return false;
      }
      coverage.set(part.partId, (coverage.get(part.partId) ?? 0) + 1);
      derivedEvents.push({
        partId: part.partId,
        lineageId: `${phrase.id}.octet-${lane}.${tag}.${row.event.id}`,
        ops: [`octet-${lane}`, tag],
        events: [{ sounding: shaped.midi, duration: shaped.duration, onset: shaped.onset }],
      });
      return true;
    };

    const placeCompanionResponse = (
      row: NoteRow,
      ids: readonly string[],
      phrase: { id: string; startBar: number; endBar: number; kind: 'statement' | 'development' | 'return' },
      phraseIndex: number,
      lane: CoffeeRunOctetLane,
    ): boolean => {
      const bounds = phraseBounds(phrase);
      const sonorityPcs = [...new Set(
        rows
          .filter((item) => item.event.bar >= phrase.startBar && item.event.bar <= phrase.endBar)
          .map((item) => pcOf(item.midi)),
      )];
      for (const partId of ids) {
        if (!canSeat(partId)) continue;
        if (coffeeRunOctetRestGate(row.event.bar, partId, request.seed)) continue;
        const part = resolved.parts.find((item) => item.partId === partId);
        const range = part?.spec.soundingHardRange;
        if (!part || !range) continue;
        const shaped = shapeCoffeeRunOctetCompanion({
          donorMidi: row.midi,
          donorOnset: num(row.onset),
          donorDuration: num(row.duration),
          phraseStart: bounds.start,
          phraseEnd: bounds.end,
          partId,
          range,
          piano: pianoAnchors,
          sonorityPcs,
          seed: request.seed,
          phraseIndex,
          lane,
        });
        if (!shaped) continue;
        if (commitShaped(shaped, part, row, phrase, lane, 'cell')) return true;
      }
      return false;
    };

    const placeDialogueExchange = (
      motifRows: readonly NoteRow[],
      phrase: { id: string; startBar: number; endBar: number; kind: 'statement' | 'development' | 'return' },
      phraseIndex: number,
      primaryIds: readonly string[],
      replyIds: readonly string[],
    ): number => {
      if (motifRows.length < 2) return 0;
      const bounds = phraseBounds(phrase);
      const sonorityPcs = [...new Set(
        rows
          .filter((item) => item.event.bar >= phrase.startBar && item.event.bar <= phrase.endBar)
          .map((item) => pcOf(item.midi)),
      )];
      const motif = motifRows.slice(0, 4).map((row) => ({
        midi: row.midi,
        onset: num(row.onset),
        duration: num(row.duration),
      }));
      const donor = motifRows[0]!;
      let placedCount = 0;

      const tryVoice = (ids: readonly string[], exchange: boolean): string | null => {
        for (const partId of ids) {
          if (!canSeat(partId)) continue;
          if (coffeeRunOctetRestGate(phrase.startBar, partId, request.seed) && !coffeeRunOctetIsMarkerBar(phrase.startBar)) {
            continue;
          }
          const part = resolved.parts.find((item) => item.partId === partId);
          const range = part?.spec.soundingHardRange;
          if (!part || !range) continue;
          const cells = buildCoffeeRunOctetDialoguePhrase({
            motif,
            phraseStart: bounds.start,
            phraseEnd: bounds.end,
            range,
            piano: pianoAnchors,
            sonorityPcs,
            seed: request.seed,
            phraseIndex,
            exchange,
          });
          if (cells.length < 2) continue;
          let local = 0;
          for (const [cellIndex, cell] of cells.entries()) {
            if (!canSeat(partId)) break;
            if (commitShaped(cell, part, donor, phrase, exchange ? 'exchange' : 'phrase', `n${cellIndex}`)) {
              local += 1;
            }
          }
          if (local >= 2) {
            placedCount += local;
            return partId;
          }
        }
        return null;
      };

      const primary = tryVoice(primaryIds, false);
      const replyPool = replyIds.filter((id) => id !== primary);
      tryVoice(replyPool, true);
      return placedCount;
    };

    for (const [phraseIndex, phrase] of phrases.entries()) {
      const palette = coffeeRunOctetPhrasePalette(phraseIndex, phrase.kind);
      const inPhrase = (row: NoteRow) => row.event.bar >= phrase.startBar && row.event.bar <= phrase.endBar;

      // Chamber dialogue: coherent phrase + overlapping transformed reply.
      const line = melodyRows.filter(inPhrase);
      if (line.length >= 2) {
        const dialogueOrder = coffeeRunOctetCarrierOrder('answer', phraseIndex, palette)
          .filter((id) => (COFFEE_RUN_OCTET_DIALOGUE_IDS as readonly string[]).includes(id));
        const replyOrder = coffeeRunOctetCarrierOrder('counter', phraseIndex + 1, palette)
          .filter((id) => (COFFEE_RUN_OCTET_DIALOGUE_IDS as readonly string[]).includes(id));
        placeDialogueExchange(line, phrase, phraseIndex, dialogueOrder, replyOrder);
      }

      // Supportive bass — present, not a continuous shadow.
      const bassLane = bassRows.filter(inPhrase);
      const bassOrder = coffeeRunOctetCarrierOrder('bass', phraseIndex, palette);
      bassLane.forEach((row, index) => {
        if (index % 2 === 1) return;
        placeCompanionResponse(row, bassOrder, phrase, phraseIndex, 'bass');
      });

      const supports = rows.filter(
        (row) => inPhrase(row) && !omitted.has(row.event.id) && row.role === 'harmonic_support',
      );
      const colourOrder = coffeeRunOctetCarrierOrder('colour', phraseIndex, palette);
      const seenBars = new Set<number>();
      for (const row of supports) {
        if (seenBars.has(row.event.bar)) continue;
        if (phrase.kind === 'return' && row.event.bar === phrase.endBar) continue;
        if (!placeCompanionResponse(row, colourOrder, phrase, phraseIndex, 'colour')) continue;
        seenBars.add(row.event.bar);
      }
    }

    // Marker windows: Cemetery / Toward black / Credits — expressive dialogue coverage.
    for (const bar of COFFEE_RUN_OCTET_MARKER_BARS) {
      const inBar = melodyRows.filter((row) => row.event.bar === bar);
      const donors = inBar.length >= 2
        ? inBar
        : rows.filter((row) => row.event.bar === bar && !omitted.has(row.event.id)).slice(0, 4);
      if (donors.length < 2) continue;
      const phrase = phraseOf(phrases, bar);
      const order = coffeeRunOctetMarkerDialogueOrder(bar, request.seed);
      placeDialogueExchange(donors, phrase, phrases.indexOf(phrase) + bar, order, [...order].reverse());
    }

    // Floor coverage so every companion speaks, without db flooding.
    for (const [seatIndex, partId] of COFFEE_RUN_OCTET_ORCH_IDS.entries()) {
      if (!canSeat(partId)) continue;
      const floor = partId === 'db' ? 6 : 3;
      const donors = partId === 'db'
        ? bassRows
        : partId === 'picc' || partId === 'tp1'
          ? melodyRows
          : rows.filter((row) => row.role === 'harmonic_support' || row.role === 'countermelody' || row.role === 'melody');
      let guard = 0;
      while ((coverage.get(partId) ?? 0) < floor && donors.length && guard < 20) {
        const donor = donors[(seatIndex * 3 + guard * 2) % donors.length]!;
        const phrase = phraseOf(phrases, donor.event.bar);
        const lane: CoffeeRunOctetLane = partId === 'db' ? 'bass' : partId === 'hp' || partId === 'bcl' ? 'colour' : 'answer';
        placeCompanionResponse(donor, [partId], phrase, phrases.indexOf(phrase), lane);
        guard += 1;
      }
    }
  }
  if (!octet) {
  for (const phrase of phrases) {
    const line = melodyRows.filter((row) => row.event.bar >= phrase.startBar && row.event.bar <= phrase.endBar);
    if (!line.length) {
      foregroundByPhrase.set(phrase.id, previousCarrier ?? 'vn1');
      continue;
    }
    const centre = line.reduce((sum, row) => sum + row.midi, 0) / line.length;
    const plan = planFor(phrase.id);
    const avoid = phrase.kind === 'return' && openingCarrierRef.id ? null : previousCarrier;
    const preferred = plan
      ? plan.foregroundIds
      : phrase.kind === 'return' && openingCarrierRef.id
        ? [openingCarrierRef.id, ...melodyOrder(centre)]
        : melodyOrder(centre);
    const spans = line.flatMap((row) => sliceNote(row.onset, row.duration, metre.barLen, variableSpans).map((piece) => ({ start: num(piece.onset), end: num(piece.onset) + num(piece.duration) })));
    const choice = tryCarrier(resolved.parts, preferred, line.map((row) => row.midi), busy, spans, avoid);
    const fallback = choice ?? tryCarrier(resolved.parts, plan ? plan.foregroundIds : melodyOrder(centre), line.map((row) => row.midi), busy, spans, null);
    if (!fallback) return fail(`No chamber instrument can hold the melody in ${phrase.id} without clipping a note.`);
    if (!openingCarrierRef.id) openingCarrierRef.id = fallback.part.partId;
    foregroundByPhrase.set(phrase.id, fallback.part.partId);
    for (const row of line) {
      const disposition = fallback.shift === 0 ? 'retained' : 'octave-transferred';
      placeRow(placed, busy, row, fallback.part, fallback.shift, metre.barLen, phrase.id, 'source', disposition, undefined, undefined, variableSpans);
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

  if (bassRows.length) {
    const spans = bassRows.flatMap((row) => sliceNote(row.onset, row.duration, metre.barLen, variableSpans).map((piece) => ({ start: num(piece.onset), end: num(piece.onset) + num(piece.duration) })));
    const choice = tryCarrier(resolved.parts, phrasePlans?.[0]?.bassIds ?? ['db', 'vc', 'bn'], bassRows.map((row) => row.midi), busy, spans, null);
    if (!choice) return fail('No bass instrument can hold the bass lane without clipping.');
    for (const row of bassRows) {
      const disposition = choice.shift === 0 ? 'retained' : 'octave-transferred';
      placeRow(placed, busy, row, choice.part, choice.shift, metre.barLen, phraseOf(phrases, row.event.bar).id, 'source', disposition, undefined, undefined, variableSpans);
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
    const ending = isSymphonicScoreEnding(phrase.endBar, scoreEndBar) && row.event.bar === scoreEndBar && row.role !== 'countermelody';
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
    const supportPlan = planFor(phrase.id);
    if (symphonic && symphonicSettings?.activity === 'sparse' && row.role === 'harmonic_support' && !locked.has(row.event.id)) {
      classification.set(row.event.id, { eventId: row.event.id, disposition: 'omitted', partId: null, octaveShift: 0, reason: 'Symphonic activity is sparse. Short inner colour was left out.' });
      omissions.push({ eventId: row.event.id, reason: 'Sparse symphonic limit.' });
      continue;
    }
    const ids = supportPlan
      ? (row.role === 'countermelody' || row.role === 'rhythmic_figure' ? supportPlan.answerIds : supportPlan.supportIds)
      : row.role === 'countermelody'
        ? ['vc', 'va', 'cl', 'bn', 'hn', 'vn2']
        : row.role === 'rhythmic_figure'
          ? ['vn2', 'va', 'cl', 'vn1']
          : ['va', 'hn', 'cl', 'vn2', 'bn'];
    const foreground = foregroundByPhrase.get(phrase.id) ?? null;
    const spans = sliceNote(row.onset, row.duration, metre.barLen, variableSpans).map((piece) => ({ start: num(piece.onset), end: num(piece.onset) + num(piece.duration) }));
    const choice = tryCarrier(resolved.parts, ids.filter((id) => id !== foreground), [row.midi], busy, spans, foreground);
    if (!choice) {
      if (locked.has(row.event.id)) return fail(`Locked event ${row.event.id} has no free instrument in range.`);
      classification.set(row.event.id, { eventId: row.event.id, disposition: 'omitted', partId: null, octaveShift: 0, reason: 'No free instrument in range. The note was not clipped.' });
      omissions.push({ eventId: row.event.id, reason: 'No free instrument in range.' });
      continue;
    }
    const band = partBand[choice.part.partId] ?? 'middle';
    const box = BANDS[band];
    if (row.role === 'harmonic_support' && (row.midi + choice.shift < box[0] - 12 || row.midi + choice.shift > box[1] + 12)) {
      if (locked.has(row.event.id)) return fail(`Locked event ${row.event.id} falls outside the register plan.`);
      classification.set(row.event.id, { eventId: row.event.id, disposition: 'omitted', partId: null, octaveShift: 0, reason: 'Register plan refused this inner note. Silence instead of a clash with the lane.' });
      omissions.push({ eventId: row.event.id, reason: 'Register plan.' });
      continue;
    }
    const disposition = choice.shift === 0 ? 'retained' : 'octave-transferred';
    placeRow(placed, busy, row, choice.part, choice.shift, metre.barLen, phrase.id, 'source', disposition, undefined, undefined, variableSpans);
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
    for (let bar = 1; bar <= scoreEndBar; bar += 1) {
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
  } // !octet: chamber/symphonic redistribute source lanes

  for (const [phraseIndex, phrase] of phrases.entries()) {
    // Octet companions already carry shaped responses; skip the classic melody-answer doubler.
    if (octet) continue;
    const answerPlan = planFor(phrase.id);
    if (answerPlan && answerPlan.counterline === 'silence') continue;
    if (mode !== 'developing' || phrase.kind === 'statement' || phrase.kind === 'return' || isSymphonicScoreEnding(phrase.endBar, scoreEndBar)) continue;
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
    const bounds = phraseBounds(phrase);
    const phraseStart = bounds.start;
    const phraseEnd = bounds.end;
    const midpoint = phraseStart + (phraseEnd - phraseStart) / 2;
    let accepted: { op: OperatorId; partId: string; notes: Array<{ onset: number; midi: number; duration: number }> } | null = null;
    for (const op of order) {
      const params = op === 'fragment-head' ? { count: 3 } : op === 'augment' ? { factor: 2 } : { beats: answerBeat(metre, phrase.startBar) };
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
      const ids = answerPlan
        ? answerPlan.answerIds
        : octet
          ? coffeeRunOctetCarrierOrder(
            'answer',
            phraseIndex,
            coffeeRunOctetPhrasePalette(phraseIndex, phrase.kind),
          )
          : foreground && ['fl', 'ob', 'cl', 'vn1'].includes(foreground)
            ? ['vn2', 'va', 'vc', 'bn', 'hn']
            : ['fl', 'ob', 'cl', 'vn1', 'hn'];
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
        placeRow(placed, busy, fake, part, 0, metre.barLen, phrase.id, 'derived', 'transformed', accepted.op, undefined, variableSpans);
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
  }

  if (!phase2 && symphonic && phrasePlans && symphonicSettings) {
    for (const row of bassRows) {
      const folded = foldIntoRange(row.midi, TIMPANI_RANGE);
      if (folded === null || timpaniTuning.includes(folded)) continue;
      timpaniTuning.push(folded);
      if (timpaniTuning.length === 4) break;
    }
    const pedal = new Map<number, number>();
    for (const row of rows) {
      if (omitted.has(row.event.id)) continue;
      const pc = pcOf(row.midi);
      const alter = spellMidi(row.midi).alter;
      const prior = pedal.get(pc);
      if (prior === undefined) pedal.set(pc, alter);
      else if (prior !== alter) pedal.set(pc, 99);
    }
    const conflicts = [...pedal.entries()].filter((entry) => entry[1] === 99).map((entry) => entry[0]);
    harpPedal = [...pedal.entries()].filter((entry) => entry[1] !== 99).map(([pc, alter]) => `${pc}:${alter}`).join(' ');
    if (conflicts.length) warnings.push(`Harp pedal cannot hold two spellings of pitch class ${conflicts.join(', ')}. Conflicting harp notes rest.`);
    const harpCap = symphonicSettings.families.harp === 'limited' ? 2 : 6;
    let harpCount = 0;
    for (const plan of phrasePlans) {
      const harp = resolved.parts.find((part) => part.partId === 'hp');
      if (plan.harp && harp && harpCount < harpCap) {
        const supports = rows.filter((row) => row.role === 'harmonic_support' && !omitted.has(row.event.id) && row.event.bar >= plan.startBar && row.event.bar <= plan.endBar && pedal.get(pcOf(row.midi)) !== 99 && row.midi >= HARP_RANGE[0] && row.midi <= HARP_RANGE[1]);
        for (const row of supports) {
          if (harpCount >= harpCap) break;
          try {
            placeRow(placed, busy, row, harp, 0, metre.barLen, plan.phraseId, 'source', 'retained', undefined, undefined, variableSpans, row.midi >= 60 ? 1 : 3);
            harpCount += 1;
          } catch {
            warnings.push(`Harp rests through part of ${plan.phraseId}. The texture overlapped or exceeded a conservative grip.`);
          }
        }
      }
      const timpani = resolved.parts.find((part) => part.partId === 'timp');
      if (plan.timpani && timpani && timpaniTuning.length) {
        const row = bassRows.find((item) => item.event.bar >= plan.startBar && item.event.bar <= plan.endBar);
        const folded = row ? foldIntoRange(row.midi, TIMPANI_RANGE) : null;
        if (row && folded !== null && timpaniTuning.includes(folded)) {
          const fake = { ...row, midi: folded, event: { ...row.event, id: `${plan.phraseId}-timp` } };
          try {
            placeRow(placed, busy, fake, timpani, 0, metre.barLen, plan.phraseId, 'derived', 'transformed', 'timpani-tuning', spellMidi(folded), variableSpans);
          } catch {
            warnings.push(`Timpani rest in ${plan.phraseId}. The declared tuning could not enter without a collision.`);
          }
        }
      }
      const percussion = resolved.parts.find((part) => part.partId === 'perc');
      if (plan.percussion !== 'none' && percussion) {
        const attack = melodyRows.find((row) => row.event.bar >= plan.startBar && row.event.bar <= plan.endBar && !silentBars.has(row.event.bar));
        if (attack) {
          const gm = plan.percussion === 'bass-drum' ? BASS_DRUM_GM : SUSPENDED_CYMBAL_GM;
          const duration = qCmp(attack.duration, q(1)) < 0 ? attack.duration : q(1);
          const fake = { ...attack, duration, midi: gm, event: { ...attack.event, id: `${plan.phraseId}-perc` } };
          try {
            placeRow(placed, busy, fake, percussion, 0, metre.barLen, plan.phraseId, 'derived', 'transformed', plan.percussion, spellMidi(gm), variableSpans);
          } catch {
            warnings.push(`Percussion rests in ${plan.phraseId}. No simultaneous roll was added.`);
          }
        }
      }
      if (plan.doubling) {
        const head = melodyRows.find((row) => row.event.bar >= plan.startBar && row.event.bar <= plan.endBar);
        if (head) {
          const spans = sliceNote(head.onset, head.duration, metre.barLen, variableSpans).slice(0, 1).map((piece) => ({ start: num(piece.onset), end: num(piece.onset) + num(piece.duration) }));
          const carrier = tryCarrier(resolved.parts, plan.supportIds, [head.midi], busy, spans, foregroundByPhrase.get(plan.phraseId) ?? null);
          if (carrier) {
            const short = { ...head, duration: spans.length ? q(Math.round((spans[0]!.end - spans[0]!.start) * 480), 480) : head.duration, event: { ...head.event, id: `${plan.phraseId}-double` } };
            try {
              placeRow(placed, busy, short, carrier.part, carrier.shift, metre.barLen, plan.phraseId, 'derived', 'transformed', 'reinforcement', undefined, variableSpans);
            } catch {
              warnings.push(`${plan.phraseId} reinforcement was left out.`);
            }
          }
        }
      }
    }
    for (const part of resolved.parts) {
      if (!isSymphonicWind(part.partId)) continue;
      const notes = placed.filter((note) => note.partId === part.partId).sort((a, b) => num(a.onset) - num(b.onset));
      let runStart = 0;
      let runEnd = 0;
      let open = false;
      for (const note of notes) {
        const start = num(note.onset);
        const end = start + num(note.duration);
        if (!open || start > runEnd + 0.45) {
          if (open && runEnd - runStart > 8) warnings.push(`Wind endurance heuristic: ${part.name} sounds ${Math.round(runEnd - runStart)} quarters without a rest. This is not player approval.`);
          runStart = start;
        }
        runEnd = Math.max(runEnd, end);
        open = true;
      }
      if (open && runEnd - runStart > 8) warnings.push(`Wind endurance heuristic: ${part.name} sounds ${Math.round(runEnd - runStart)} quarters without a rest. This is not player approval.`);
    }
  }

  const harmonicControl = correction.harmonicDevelopment;
  const harmonicOn = harmonicControl?.bhl?.enabled === true || harmonicControl?.triadPair?.enabled === true;
  let harmonicNotes: ScheduledHarmonicNote[] = [];
  if (harmonicOn && harmonicControl) {
    const bassCarrier = placed.find((note) => bassRows.some((row) => note.sourceIds.includes(row.event.id) && note.origin === 'source'))?.partId ?? null;
    const harmonic = applyPianoChamberHarmonic({
      seed: request.seed,
      beats: metre.beats,
      beatType: metre.beatType,
      barQuarters: num(metre.barLen),
      ...(metre.uniform ? {} : {
        barOriginQuarters: metre.spans.map((span) => num(span.start)),
        barLengths: metre.spans.map((span) => num(span.length)),
        barBeats: metre.spans.map((span) => metre.metres[span.bar]!.numerator),
        barBeatTypes: metre.spans.map((span) => metre.metres[span.bar]!.denominator),
      }),
      phrases: phrases.map((phrase) => ({ id: phrase.id, startBar: phrase.startBar, endBar: phrase.endBar })),
      rows: rows.filter((row) => !omitted.has(row.event.id)).map((row) => ({
        id: row.event.id,
        bar: row.event.bar,
        onset: num(row.onset),
        duration: num(row.duration),
        midi: row.midi,
        role: row.role,
      })),
      busy,
      foregroundByPhrase,
      bassPartId: bassCarrier,
      parts: resolved.parts,
      control: harmonicControl,
    });
    if (!harmonic.ok) return fail(harmonic.error);
    harmonicNotes = harmonic.notes;
    for (const note of harmonicNotes) {
      const part = resolved.parts.find((item) => item.partId === note.partId);
      if (!part) return fail(`Harmonic line named an unknown part ${note.partId}.`);
      const bar = barOfOnset(note.onset);
      const fake: NoteRow = {
        record: rows[0]!.record,
        event: {
          ...rows[0]!.event,
          id: note.syntheticId,
          written: null,
          rest: false,
          tieStart: false,
          tieStop: false,
          soundingMidi: note.pitch.midi,
        },
        onset: note.onset,
        duration: note.duration,
        midi: note.pitch.midi,
        role: 'countermelody',
        reason: note.reason,
        confidence: 'medium',
      };
      try {
        placeRow(placed, busy, fake, part, 0, metre.barLen, phraseOf(phrases, bar).id, 'derived', 'transformed', note.control, note.pitch, variableSpans);
      } catch (error) {
        return fail(error instanceof Error ? error.message : 'The harmonic line overlapped a voice that was already placed.');
      }
      derivedEvents.push({
        partId: note.partId,
        lineageId: note.syntheticId,
        ops: [note.control],
        events: [{ sounding: note.pitch.midi, duration: num(note.duration), onset: num(note.onset) }],
      });
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
    partRegisterBias: partBand,
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
    maxSimultaneous: part.partId === 'hp' ? 4 : part.partId === 'pn' ? (part.spec.maxSimultaneous ?? 10) : 1,
    catalogueInstrumentSound: part.spec.instrumentSound,
    ...(part.partId === 'hp' ? { harpGrandStaff: true } : {}),
    ...(part.partId === 'pn' ? { pianoGrandStaff: true } : {}),
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
    assignments.push({ placementId: id, partId: note.partId, voice: note.voice ?? 1 });
  });
  const tieGroups = new Map<string, string[]>();
  for (const placement of placements) {
    const source = placement.sourceNotationEventIds[0];
    if (!source || source.startsWith('4d-')) continue;
    const list = tieGroups.get(`${placement.logicalVoiceId}:${source}`) ?? [];
    list.push(placement.id);
    tieGroups.set(`${placement.logicalVoiceId}:${source}`, list);
  }
  let built;
  try {
    built = buildE2Score({
      title: octet ? 'Piano to Coffee Run octet' : symphonic ? 'Piano to symphony' : 'Piano to chamber',
      tempo,
      bars: scoreEndBar,
      metres: metre.metres,
      parts: specs,
      placements,
      rests: [],
      assignments,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
  const dialoguePlanResolved = resolveOrchestralDialoguePlan(correction.symphonic);
  const dynamics: Record<string, PartDynamicEvent[]> = dialoguePlanResolved && phase2Distribution && dialoguePhase2Placements
    ? (dialoguePlanResolved.id === ORCHESTRAL_DIALOGUE_VARIED_REPEAT_48
      ? buildOrchestralDialogueVariedRepeat48PartDynamics(
        built.score.parts.map((part) => part.id),
        dialoguePhase2Placements,
      )
      : buildOrchestralDialogue77241PartDynamics(
        built.score.parts.map((part) => part.id),
        dialoguePhase2Placements,
      ))
    : (() => {
      const legacy: Record<string, PartDynamicEvent[]> = {};
      for (const phrase of phrases) {
        const partId = foregroundByPhrase.get(phrase.id);
        if (!partId) continue;
        const mark = dynamicFor(phrase.kind, melodyRows.some((row) => row.midi === highestMidi && row.event.bar >= phrase.startBar && row.event.bar <= phrase.endBar), isSymphonicScoreEnding(phrase.endBar, scoreEndBar));
        const list = legacy[partId] ?? [];
        list.push({ bar: phrase.startBar, beat: 0, mark });
        legacy[partId] = list;
      }
      return legacy;
    })();
  built.score.partDynamics = dynamics;
  if (dialoguePlanResolved && phase2Distribution) {
    applyDialogueDynamicsVelocities(dynamics, built.score.parts);
  } else {
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
        if (sourceId.startsWith('4d-')) continue;
        const siblings = placements
          .filter((item) => item.sourceNotationEventIds[0] === sourceId && item.logicalVoiceId === placement.logicalVoiceId)
          .sort((a, b) => qCmp(a.attack.onset, b.attack.onset));
        const index = siblings.findIndex((item) => item.id === placement.id);
        const note = event as NoteEvent;
        if (siblings.length < 2) {
          if (note.notation?.tie) delete note.notation.tie;
          continue;
        }
        if (index === siblings.length - 1 && row.event.tieStart) {
          note.notation = { ...note.notation, tie: 'continue' };
        } else if (index === 0 && row.event.tieStop) {
          note.notation = { ...note.notation, tie: 'continue' };
        }
      }
    }
  }
  const expressive = !!(phase2 && symphonicSettings && symphonicSettings.expression === 'expressive' && phrasePlans);
  let expressionReceipt: Phase3ExpressionReceipt | null = null;
  if (expressive && phrasePlans) {
    expressionReceipt = applySymphonicExpression(built.score, phrasePlans);
    warnings.push(...expressionReceipt.breathingWarnings);
  }
  const exported = runEnsembleExportPipeline(built.score);
  if (!exported.ok || !exported.xml) return fail(exported.errors.join(' ') || 'MusicXML export failed.');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'piano-chamber-'));
  let midiBase64 = '';
  let midiSetBase64: string | undefined;
  let midiManifest: SymphonicMidiManifest | undefined;
  if (symphonic) {
    const midiSet = buildSymphonicMidiSet(built.score, tempo);
    if (!midiSet.ok) return fail(midiSet.error);
    midiSetBase64 = midiSet.zipBase64;
    midiManifest = midiSet.manifest;
    const stringsOnly: ScoreModel = {
      ...built.score,
      parts: built.score.parts.filter((part) => ['vn1', 'vn2', 'va', 'vc', 'db'].includes(part.id)),
    };
    const stringsPath = path.join(directory, 'symphony-strings.mid');
    const stringsWrote = writeScoreModelMidiFile(stringsOnly, stringsPath, { bpm: tempo, barMeterMap: built.score.barMeterMap, allowEmpty: true });
    if (!stringsWrote) return fail('Strings MIDI file was not written.');
    midiBase64 = fs.readFileSync(stringsPath).toString('base64');
  } else {
    const midiPath = writeScoreMidi(built.score, directory, 'piano-chamber', built.score.barMeterMap, tempo);
    if (!midiPath) return fail('MIDI export failed.');
    midiBase64 = fs.readFileSync(midiPath).toString('base64');
  }
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
      dynamic: dynamicFor(phrase.kind, false, isSymphonicScoreEnding(phrase.endBar, scoreEndBar)) ?? 'mf',
      handover: phase2
        ? phase2Handovers[phrase.id] === true || (index > 0 && foregroundByPhrase.get(phrase.id) !== foregroundByPhrase.get(phrases[index - 1]!.id))
        : index > 0 && foregroundByPhrase.get(phrase.id) !== foregroundByPhrase.get(phrases[index - 1]!.id),
      ending: isSymphonicScoreEnding(phrase.endBar, scoreEndBar),
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
    ...(symphonic && phrasePlans ? {
      symphonic: {
        plans: phrasePlans,
        timpaniTuning,
        harpPedal,
        conventions: [
          'Trumpets 1–3 are B-flat.',
          'Trombones 1–3 are tenor trombones at concert pitch.',
          'Bass clarinet is B-flat in treble clef, sounding a major ninth down.',
          'Cor anglais is in F.',
          'Contrabassoon sounds one octave below the written pitch.',
          'Percussion is one player: bass drum GM 36 and suspended cymbal GM 57.',
        ],
        ...(phase2Distribution ? { distribution: phase2Distribution } : {}),
        ...(expressionReceipt ? { expression: expressionReceipt } : {}),
      },
    } : {}),
    listeningQuestions: [
      'Does the inferred melody still read as the theme after the instrument handover?',
      'Do the added answers sound necessary, or would the bar be clearer as silence?',
      'Does the ending release, or does an inner part keep the harmony spinning?',
      ...(phase2Distribution ? [
        'Where the melody changes instrument, does the phrase still read as one line?',
        'Do Violin II, viola, or cello sound like they have a job, or only a copy?',
      ] : []),
      ...(expressionReceipt ? [
        'Do the hairpins follow the phrase contour, or do they only get louder?',
        'Where a wind is marked as too long for one breath, is the warning enough, or should a player hand the line over?',
      ] : []),
      ...(harmonicNotes.length ? [
        'Does the new inner line change the harmony, or does it only double a note that was already there?',
        'Can both triad parents still be recognised where a dialogue was asked for?',
      ] : []),
    ],
    ...(harmonicNotes.length ? {
      harmonicDevelopment: {
        protectedEventIds: [...locked],
        notes: harmonicNotes.map((note) => ({
          control: note.control,
          partId: note.partId,
          onset: num(note.onset),
          duration: num(note.duration),
          midi: note.pitch.midi,
          reason: note.reason,
        })),
      },
    } : {}),
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
    }, ...(harmonicNotes.some((note) => note.control === 'bhl') ? [{
      source: 'bhl_world' as const,
      param: 'B',
      invoked: true,
      influenced: true,
      pitchClasses: [...new Set(harmonicNotes.filter((note) => note.control === 'bhl').map((note) => pcOf(note.pitch.midi)))],
      detail: 'World B through buildBhlWorldField and planLiquidHarmony. The inner line is scheduled here. Locked melody, bass, and arrivals stay.',
    }] : [])],
    planners: {
      family: 'chamber_orchestra',
      density: phrases.map((phrase) => ({ bar: phrase.startBar, requested: colourPlan.find((section) => section.section === phrase.id)?.density ?? 'medium', planner: getDensityForBar(densityCurve, phrase.startBar) })),
      register: registerPlan.entries.filter((entry) => entry.sectionIndex === 0).map((entry) => ({ partId: entry.partId, requested: partBand[entry.partId] ?? 'middle', assigned: entry.registerBand })),
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
  return { ok: true, musicXml: exported.xml, midiBase64, ...(midiSetBase64 ? { midiSetBase64, midiManifest } : {}), receipt, score: built.score, fidelity };
}
