/**
 * Song Mode — thin guitar melody (voice 1 / default) when scheduling yields very high note density.
 */

import type { MeasureModel, NoteEvent, RestEvent } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';

const EPS = 1e-4;

function isMelodyVoice(v: number | undefined): boolean {
  return v === undefined || v === 1;
}

function countMelodyNotes(measures: MeasureModel[]): number {
  let n = 0;
  for (const m of measures) {
    for (const e of m.events) {
      if (e.kind === 'note' && isMelodyVoice((e as NoteEvent).voice)) n++;
    }
  }
  return n;
}

/** Sorted melody-voice timeline (notes + rests) for one measure. */
function melodyTimeline(measure: MeasureModel): typeof measure.events {
  return [...measure.events]
    .filter((e) => {
      const v = (e as { voice?: number }).voice;
      return isMelodyVoice(v);
    })
    .sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
}

/**
 * Note starts exactly where a preceding rest ends, and that rest lasted >= 1 beat — phrase landing / breathe.
 */
function immediatelyAfterLongRest(measure: MeasureModel, noteStartBeat: number): boolean {
  const tl = melodyTimeline(measure);
  const idx = tl.findIndex(
    (e) => e.kind === 'note' && Math.abs((e as NoteEvent).startBeat - noteStartBeat) < EPS
  );
  if (idx <= 0) return false;
  const prev = tl[idx - 1];
  if (!prev || prev.kind !== 'rest') return false;
  const r = prev as RestEvent;
  const prevEnd = r.startBeat + r.duration;
  return Math.abs(prevEnd - noteStartBeat) < EPS && r.duration >= 1 - EPS;
}

/**
 * Higher score ⇒ remove sooner (thin short pick-ups before longer tones; syncopations before beats 1 & 3).
 */
function removalPriority(note: NoteEvent): number {
  const d = note.duration;
  const sb = note.startBeat;
  let score = 0;
  if (d < 0.5 - EPS) score += 100_000;
  /** Mid-beat “.5” attacks (e.g. 1.5, 2.5 quarter beats). */
  const frac = sb % 1;
  if (frac > EPS && Math.abs(frac - 0.5) < 0.08) score += 50_000;
  /** Integer beats 1 or 3 — keep longer when possible. */
  if (Math.abs(sb - 1) < EPS || Math.abs(sb - 3) < EPS) score -= 5000;
  score += (1 - Math.min(d, 2)) * 100;
  score -= sb * 0.01;
  return score;
}

interface Candidate {
  measureIndex: number;
  eventIndex: number;
  removalScore: number;
}

/**
 * Reduce melody note density toward `targetMaxDensity` by converting selected notes to rests (same span).
 */
export function enforceSongModeGuitarDensity(
  measures: MeasureModel[],
  targetMinDensity: number = 0.6,
  targetMaxDensity: number = 0.75,
  seed: number = 12345
): MeasureModel[] {
  void targetMinDensity;
  const totalBeats = measures.length * BEATS_PER_MEASURE;
  const totalNotes = countMelodyNotes(measures);
  const currentDensity = totalBeats > 0 ? totalNotes / totalBeats : 0;

  if (currentDensity <= targetMaxDensity + EPS) {
    return measures;
  }

  const targetNotes = Math.floor(targetMaxDensity * totalBeats);
  const notesToRemove = Math.max(0, totalNotes - targetNotes);

  const candidates: Candidate[] = [];

  for (let mi = 0; mi < measures.length; mi++) {
    const m = measures[mi];
    if (!m) continue;

    const melodyNotes = m.events
      .map((e, i) => ({ e, i }))
      .filter(
        (x): x is { e: NoteEvent; i: number } =>
          x.e.kind === 'note' && isMelodyVoice((x.e as NoteEvent).voice)
      );

    if (melodyNotes.length === 0) continue;

    const sortedByStart = [...melodyNotes].sort(
      (a, b) => (a.e as NoteEvent).startBeat - (b.e as NoteEvent).startBeat
    );
    const firstStart = (sortedByStart[0]!.e as NoteEvent).startBeat;

    for (const { e: note, i: eventIndex } of melodyNotes) {
      const ne = note as NoteEvent;
      if (Math.abs(ne.startBeat - firstStart) < EPS) continue;
      if (ne.startBeat <= EPS) continue;
      if (ne.duration >= 1.5 - EPS) continue;
      if (immediatelyAfterLongRest(m, ne.startBeat)) continue;

      candidates.push({
        measureIndex: mi,
        eventIndex,
        removalScore: removalPriority(ne),
      });
    }
  }

  if (candidates.length === 0 || notesToRemove === 0) {
    return measures;
  }

  candidates.sort((a, b) => {
    if (b.removalScore !== a.removalScore) return b.removalScore - a.removalScore;
    if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
    return a.eventIndex - b.eventIndex;
  });

  const nCand = candidates.length;
  const startAt = ((seed % nCand) + nCand) % nCand;
  const rotated = [...candidates.slice(startAt), ...candidates.slice(0, startAt)];
  const take = Math.min(notesToRemove, rotated.length);
  const removeKeys = new Set<string>();
  for (let k = 0; k < take; k++) {
    const c = rotated[k]!;
    removeKeys.add(`${c.measureIndex}:${c.eventIndex}`);
  }

  return measures.map((m, mi) => ({
    ...m,
    events: m.events.map((e, ei) => {
      if (!removeKeys.has(`${mi}:${ei}`)) return e;
      if (e.kind !== 'note' || !isMelodyVoice((e as NoteEvent).voice)) return e;
      const n0 = e as NoteEvent;
      const rest: RestEvent = {
        kind: 'rest',
        startBeat: n0.startBeat,
        duration: n0.duration,
        voice: n0.voice,
      };
      return rest;
    }),
  }));
}
