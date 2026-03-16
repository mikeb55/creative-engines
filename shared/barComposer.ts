/**
 * Bar composer framework — measure-first composition.
 * Measure always equals exactly 4 beats.
 */

import type { Measure, Voice, TimedEvent } from './scoreModel';
import { measureDurationByStream } from './scoreModel';

export const BEATS_PER_MEASURE = 4;

/** Validate that each voice stream in a measure sums to exactly 4 beats. */
export function validateMeasure(measure: Measure): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const byStream = measureDurationByStream(measure);

  for (const [key, total] of byStream) {
    if (Math.abs(total - BEATS_PER_MEASURE) > 0.001) {
      errors.push(`Measure ${measure.index + 1} ${key}: total ${total.toFixed(2)} != ${BEATS_PER_MEASURE}`);
    }
  }

  for (const v of measure.voices) {
    for (const e of v.events) {
      if (e.duration <= 0) errors.push(`Measure ${measure.index + 1}: zero/negative duration`);
      if (e.startBeat < 0 || e.startBeat >= BEATS_PER_MEASURE) {
        errors.push(`Measure ${measure.index + 1}: startBeat ${e.startBeat} out of range`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Validate entire score. */
export function validateScore(measures: Measure[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const m of measures) {
    const r = validateMeasure(m);
    errors.push(...r.errors);
  }
  return { valid: errors.length === 0, errors };
}

/** Compose a single voice: add events that sum to 4 beats. Fills gaps with rests. */
export function composeVoice(
  voice: number,
  staff: number,
  part: string,
  events: Array<{ pitch: number; startBeat: number; duration: number }>
): Voice {
  const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
  const out: TimedEvent[] = [];
  let cursor = 0;

  for (const e of sorted) {
    if (e.startBeat > cursor) {
      out.push({
        pitch: 0,
        startBeat: cursor,
        duration: e.startBeat - cursor,
        voice,
        staff,
        part,
      });
      cursor = e.startBeat;
    }
    const dur = Math.min(e.duration, BEATS_PER_MEASURE - cursor);
    if (dur > 0) {
      out.push({
        pitch: e.pitch,
        startBeat: cursor,
        duration: dur,
        voice,
        staff,
        part,
      });
      cursor += dur;
    }
  }

  if (cursor < BEATS_PER_MEASURE) {
    out.push({
      pitch: 0,
      startBeat: cursor,
      duration: BEATS_PER_MEASURE - cursor,
      voice,
      staff,
      part,
    });
  }

  return { voice, staff, part, events: out };
}

/** Compose a measure from voice events. Merges voices into one Measure. */
export function composeMeasure(
  index: number,
  chord: string | undefined,
  voiceSpecs: Array<{ voice: number; staff: number; part: string; events: Array<{ pitch: number; startBeat: number; duration: number }> }>
): Measure {
  const voices: Voice[] = voiceSpecs.map(({ voice, staff, part, events }) =>
    composeVoice(voice, staff, part, events)
  );
  return { index, chord, voices };
}
