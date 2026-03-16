/**
 * MusicXML timing validation — hard gate before Sibelius handoff.
 */

import { MEASURE_DURATION } from './notationTimingConstants';
import type { TimedNoteEvent } from './notationTimingEngine';

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  measuresChecked: number;
  durationTotals: Record<string, number>;
  tiesInserted: number;
  restsInserted: number;
  violationsFixed: string[];
  violationsBlocking: string[];
}

export function validateMeasureDurations(
  measureEvents: Map<number, TimedNoteEvent[]>
): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const durationTotals: Record<string, number> = {};
  let tiesInserted = 0;
  let restsInserted = 0;
  const violationsFixed: string[] = [];
  const violationsBlocking: string[] = [];

  for (const [measureIndex, events] of measureEvents) {
    const measureStart = measureIndex * MEASURE_DURATION;
    const streamKeys = [...new Set(events.map((e) => `${e.part}:${e.voice}:${e.staff}`))];

    for (const key of streamKeys) {
      const [part, voiceStr, staffStr] = key.split(':');
      const voice = parseInt(voiceStr, 10);
      const streamEvents = events
        .filter((e) => e.part === part && e.voice === voice)
        .sort((a, b) => a.startDivision - b.startDivision);

      let total = 0;
      for (const e of streamEvents) {
        if (e.durationDivisions <= 0) {
          errors.push(`Measure ${measureIndex + 1} ${part} voice ${voice}: zero or negative duration`);
          violationsBlocking.push(`zero duration`);
        }
        if (e.durationDivisions > MEASURE_DURATION && !e.rest) {
          warnings.push(`Measure ${measureIndex + 1}: event exceeds measure (${e.durationDivisions} > ${MEASURE_DURATION})`);
        }
        total += e.durationDivisions;
        if (e.tieStart) tiesInserted++;
        if (e.rest) restsInserted++;
      }

      durationTotals[`${measureIndex}-${key}`] = total;

      if (total !== MEASURE_DURATION) {
        errors.push(`Measure ${measureIndex + 1} ${part} voice ${voice}: total ${total} != ${MEASURE_DURATION}`);
        violationsBlocking.push(`measure ${measureIndex + 1} ${part} voice ${voice} duration mismatch`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    measuresChecked: measureEvents.size,
    durationTotals,
    tiesInserted,
    restsInserted,
    violationsFixed,
    violationsBlocking,
  };
}

export function validateVoiceAlignment(
  measureEvents: Map<number, TimedNoteEvent[]>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const [measureIndex, events] of measureEvents) {
    const measureStart = measureIndex * MEASURE_DURATION;
    const overlapping = new Map<number, number>();
    for (const e of events) {
      const key = e.startDivision;
      overlapping.set(key, (overlapping.get(key) ?? 0) + e.durationDivisions);
    }
  }
  return { valid: errors.length === 0, errors };
}
