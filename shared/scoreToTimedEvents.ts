/**
 * Convert Score (measure-first) to TimedNoteEvent format for existing MusicXML packer.
 */

import type { Score, TimedEvent } from './scoreModel';
import type { TimedNoteEvent } from './notationTimingEngine';
import { DIVISIONS } from './notationTimingConstants';

/** Convert Score to Map<measureIndex, TimedNoteEvent[]>. */
export function scoreToMeasureEvents(score: Score): Map<number, TimedNoteEvent[]> {
  const out = new Map<number, TimedNoteEvent[]>();

  for (const measure of score.measures) {
    const events: TimedNoteEvent[] = [];
    const measureStart = measure.index * 4 * DIVISIONS; // 4 beats per measure

    for (const voice of measure.voices) {
      for (const e of voice.events) {
        const startDivision = measureStart + Math.round(e.startBeat * DIVISIONS);
        const durationDivisions = Math.round(e.duration * DIVISIONS);
        if (durationDivisions <= 0) continue;
        events.push({
          pitch: e.pitch,
          startDivision,
          durationDivisions,
          voice: voice.voice,
          staff: voice.staff,
          part: voice.part,
          tieStart: false,
          tieStop: false,
          rest: e.pitch === 0,
        });
      }
    }

    events.sort((a, b) => a.startDivision - b.startDivision);
    out.set(measure.index, events);
  }

  return out;
}
