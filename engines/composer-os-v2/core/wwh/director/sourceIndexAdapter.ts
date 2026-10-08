/**
 * Source index over the V7.2 duo importer.
 * Measure ids come from the file hash and document order, not the printed bar number.
 */

import { createHash } from 'node:crypto';
import type { WwhDuoScore, WwhImportedMeasure, WwhImportedNote } from '../wwhDuoImport';
import { importWwhDuoMusicXml } from '../wwhDuoImport';
import type { Player, Span } from './performancePlanTypes';

export interface SourceEvent {
  id: string;
  measureId: string;
  player: Player;
  order: number;
  noteIndex: number;
  rest: boolean;
  step?: string;
  alter?: number;
  octave?: number;
  duration: number;
  tieStart: boolean;
  tieStop: boolean;
}

export interface SourceMeasure {
  id: string;
  order: number;
  printedNumber: string;
  guitar: WwhImportedMeasure;
  bass: WwhImportedMeasure;
}

export interface SourceIndex {
  sha256: string;
  scoreId: string;
  title: string;
  movementTitle: string;
  composer: string;
  partIds: Record<Player, string>;
  measures: SourceMeasure[];
  events: SourceEvent[];
  byId: Map<string, SourceMeasure>;
  score: WwhDuoScore;
}

export function measureIdFor(scoreId: string, order: number): string {
  return `${scoreId}:m${String(order + 1).padStart(3, '0')}`;
}

export function eventIdFor(measureId: string, player: Player, noteIndex: number): string {
  return `${measureId}:${player}:n${String(noteIndex).padStart(3, '0')}`;
}

function pitchKey(note: WwhImportedNote): string {
  return `${note.voice}|${note.step}|${note.alter ?? 0}|${note.octave}`;
}

/** A tie stop with no earlier start in the same bar arrived from the previous bar. */
export function hasIncomingTie(measure: WwhImportedMeasure): boolean {
  const open = new Map<string, number>();
  for (const note of measure.notes) {
    if (note.rest) continue;
    const key = pitchKey(note);
    if (note.tieStop) {
      const count = open.get(key) ?? 0;
      if (count <= 0) return true;
      open.set(key, count - 1);
    }
    if (note.tieStart) open.set(key, (open.get(key) ?? 0) + 1);
  }
  return false;
}

export function cutAfter(index: SourceIndex, order: number): { safe: boolean; reason: string } {
  const measure = index.measures[order];
  if (!measure) return { safe: false, reason: `no measure at order ${order}` };
  if (order >= index.measures.length - 1) {
    if (measure.guitar.openTieOut || measure.bass.openTieOut) return { safe: false, reason: `${measure.id} still holds a tie` };
    return { safe: true, reason: 'end of score' };
  }
  const next = index.measures[order + 1]!;
  const reasons: string[] = [];
  if (measure.guitar.openTieOut) reasons.push(`guitar tie leaves ${measure.printedNumber}`);
  if (measure.bass.openTieOut) reasons.push(`bass tie leaves ${measure.printedNumber}`);
  if (hasIncomingTie(next.guitar)) reasons.push(`guitar tie enters ${next.printedNumber}`);
  if (hasIncomingTie(next.bass)) reasons.push(`bass tie enters ${next.printedNumber}`);
  if (measure.guitar.hasRepeat || measure.bass.hasRepeat || next.guitar.hasRepeat || next.bass.hasRepeat) {
    reasons.push('repeat navigation');
  }
  if (measure.guitar.hasEnding || measure.bass.hasEnding || next.guitar.hasEnding || next.bass.hasEnding) {
    reasons.push('ending bracket');
  }
  if (reasons.length) return { safe: false, reason: reasons.join('; ') };
  return { safe: true, reason: `clean cut after printed bar ${measure.printedNumber}` };
}

function eventsOf(measureId: string, player: Player, measure: WwhImportedMeasure): SourceEvent[] {
  return measure.notes.map((note, noteIndex) => ({
    id: eventIdFor(measureId, player, noteIndex),
    measureId,
    player,
    order: measure.order,
    noteIndex,
    rest: note.rest,
    step: note.step,
    alter: note.alter,
    octave: note.octave,
    duration: note.duration,
    tieStart: note.tieStart,
    tieStop: note.tieStop,
  }));
}

export function indexSource(xml: string, sha256 = createHash('sha256').update(xml, 'utf8').digest('hex')): SourceIndex {
  const score = importWwhDuoMusicXml(xml);
  const scoreId = sha256.slice(0, 16);
  const measures: SourceMeasure[] = score.guitar.measures.map((guitar, order) => {
    const bass = score.bass.measures[order];
    if (!bass) throw new Error(`missing bass measure at ${order}`);
    return {
      id: measureIdFor(scoreId, order),
      order,
      printedNumber: guitar.number,
      guitar,
      bass,
    };
  });
  const events = measures.flatMap((measure) => [
    ...eventsOf(measure.id, 'guitar', measure.guitar),
    ...eventsOf(measure.id, 'bass', measure.bass),
  ]);
  return {
    sha256,
    scoreId,
    title: score.title,
    movementTitle: score.movementTitle,
    composer: score.composer,
    partIds: { guitar: score.guitar.id, bass: score.bass.id },
    measures,
    events,
    byId: new Map(measures.map((measure) => [measure.id, measure])),
    score,
  };
}

export function expandSpan(index: SourceIndex, span: Span): SourceMeasure[] {
  const first = index.byId.get(span.firstMeasureId);
  const last = index.byId.get(span.lastMeasureId);
  if (!first || !last) {
    throw new Error(`unknown span ${span.firstMeasureId}..${span.lastMeasureId}`);
  }
  if (last.order < first.order) throw new Error(`span ${span.firstMeasureId}..${span.lastMeasureId} runs backward`);
  return index.measures.slice(first.order, last.order + 1);
}

export function sameSpan(left: Span, right: Span): boolean {
  return left.firstMeasureId === right.firstMeasureId && left.lastMeasureId === right.lastMeasureId;
}
