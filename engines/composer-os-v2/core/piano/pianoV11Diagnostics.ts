/**
 * Evidence read from the finished score.
 * Planning motifs are a separate record and do not prove the sounding line.
 */

import type { NoteEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { integralTicks, PIANO_V11_EXPORT_PPQ, qToNumber } from './pianoExactTiming';

export interface FinalNotePoint {
  bar: number;
  pitch: number;
  onset: number;
  duration: number;
  voice: number;
}

export interface FinalRealisedDiagnostics {
  evidence: 'final-realised-score';
  disclaimer: string;
  opening: FinalNotePoint[];
  bar21Return: FinalNotePoint[];
  phraseRestBars: number[];
  climax: { bars: number[]; highestPitch: number | null; soundingNotes: number; notesPerQuarter: number };
  repetition: { repeatedIntervals: number; intervals: number };
  contour: { up: number; down: number; same: number };
}

const DISCLAIMER = 'Matching a planned motif does not prove the resulting music sounds thematically related.';

function rhNotes(score: ScoreModel, bar: number): FinalNotePoint[] {
  const measure = score.parts[0]?.measures.find((item) => item.index === bar);
  if (!measure) return [];
  const notes: FinalNotePoint[] = [];
  for (const event of measure.events) {
    if (event.kind !== 'note' || (event.voice ?? 1) !== 1) continue;
    notes.push({
      bar,
      pitch: event.pitch,
      onset: event.startBeat,
      duration: event.duration,
      voice: 1,
    });
  }
  return notes.sort((a, b) => a.onset - b.onset);
}

function intervals(notes: readonly FinalNotePoint[]): number[] {
  const out: number[] = [];
  for (let index = 1; index < notes.length; index += 1) out.push(notes[index]!.pitch - notes[index - 1]!.pitch);
  return out;
}

export function finalRealisedDiagnostics(score: ScoreModel): FinalRealisedDiagnostics {
  const opening = rhNotes(score, 1);
  const bar21Return = rhNotes(score, 21);
  const phraseRestBars: number[] = [];
  const rh: FinalNotePoint[] = [];
  let climaxNotes = 0;
  let climaxHigh: number | null = null;
  let climaxQuarters = 0;
  for (const measure of score.parts[0]?.measures ?? []) {
    const hasRest = measure.events.some((event) => event.kind === 'rest' && (event.voice ?? 1) === 1);
    if (hasRest) phraseRestBars.push(measure.index);
    for (const event of measure.events) {
      if (event.kind !== 'note' || (event.voice ?? 1) !== 1) continue;
      rh.push({ bar: measure.index, pitch: event.pitch, onset: event.startBeat, duration: event.duration, voice: 1 });
    }
    if (measure.index === 19 || measure.index === 20) {
      climaxQuarters += measure.measureBeatSpanQuarters ?? 4;
      for (const event of measure.events) {
        if (event.kind !== 'note') continue;
        const pitches = [event.pitch, ...(event.pitches ?? [])];
        climaxNotes += new Set(pitches).size;
        for (const pitch of pitches) climaxHigh = climaxHigh === null ? pitch : Math.max(climaxHigh, pitch);
      }
    }
  }
  const steps = intervals(rh.sort((a, b) => a.bar - b.bar || a.onset - b.onset));
  return {
    evidence: 'final-realised-score',
    disclaimer: DISCLAIMER,
    opening,
    bar21Return,
    phraseRestBars,
    climax: {
      bars: [19, 20],
      highestPitch: climaxHigh,
      soundingNotes: climaxNotes,
      notesPerQuarter: climaxQuarters > 0 ? climaxNotes / climaxQuarters : 0,
    },
    repetition: {
      repeatedIntervals: steps.filter((step) => step === 0).length,
      intervals: steps.length,
    },
    contour: {
      up: steps.filter((step) => step > 0).length,
      down: steps.filter((step) => step < 0).length,
      same: steps.filter((step) => step === 0).length,
    },
  };
}

export function tiedSoundingCount(notes: readonly NoteEvent[]): { attacks: number; tiedFragments: number } {
  const groups = new Map<string, number>();
  for (const note of notes) {
    const id = note.pianoExact?.logicalEventId;
    if (!id) continue;
    groups.set(id, (groups.get(id) ?? 0) + 1);
  }
  let tiedFragments = 0;
  for (const count of groups.values()) if (count > 1) tiedFragments += 1;
  return { attacks: groups.size, tiedFragments };
}

export function absoluteTicks(note: NoteEvent, barStartQuarters: number): { onset: number; duration: number } | null {
  const exact = note.pianoExact;
  if (!exact) return null;
  const onset = integralTicks({ n: Math.round((barStartQuarters + qToNumber(exact.onsetQ)) * 480), d: 480 }, PIANO_V11_EXPORT_PPQ);
  const duration = integralTicks(exact.durationQ, PIANO_V11_EXPORT_PPQ);
  if (onset === null || duration === null) return null;
  return { onset, duration };
}
