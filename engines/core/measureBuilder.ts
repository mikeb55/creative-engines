import type { Measure, NoteEvent } from './timing';
import { MEASURE_DIVISIONS } from './timing';

export function createMeasure(index: number, voices: number[]): Measure {
  const v: Record<number, NoteEvent[]> = {};
  voices.forEach((n) => (v[n] = []));
  return { index, voices: v };
}

export function pushNote(
  measure: Measure,
  voice: number,
  pitch: number,
  duration: number,
  cursor: { pos: number }
): void {
  if (cursor.pos + duration > MEASURE_DIVISIONS) {
    throw new Error('Measure overflow');
  }

  measure.voices[voice].push({
    pitch,
    duration,
    voice,
  });

  cursor.pos += duration;
}
