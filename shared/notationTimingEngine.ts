/**
 * Canonical notation timing engine.
 * Single source of truth for measure packing, beat accounting, note splitting, rest filling, ties.
 */

import { MEASURE_DURATION, beatsToDivisions } from './notationTimingConstants';

export interface TimedNoteEvent {
  pitch: number;
  startDivision: number;
  durationDivisions: number;
  voice: number;
  staff: number;
  part: string;
  tieStart: boolean;
  tieStop: boolean;
  rest: boolean;
}

export interface MeasureSlice {
  measureIndex: number;
  events: TimedNoteEvent[];
  totalDivisions: number;
}

export interface TimingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Normalize raw events: ensure positive durations, clamp to divisions. */
export function normalizeTimedEvents(
  events: Array<{ pitch: number; startDivision: number; durationDivisions: number; voice?: number; staff?: number; part?: string }>
): TimedNoteEvent[] {
  return events.map((e) => ({
    pitch: e.pitch,
    startDivision: Math.max(0, Math.floor(e.startDivision)),
    durationDivisions: Math.max(1, Math.floor(e.durationDivisions)),
    voice: e.voice ?? 1,
    staff: e.staff ?? 1,
    part: e.part ?? 'P1',
    tieStart: false,
    tieStop: false,
    rest: false,
  }));
}

/** Split events across barlines; add tieStart/tieStop. */
export function splitEventsAcrossBarlines(events: TimedNoteEvent[]): TimedNoteEvent[] {
  const out: TimedNoteEvent[] = [];
  for (const e of events) {
    let start = e.startDivision;
    let dur = e.durationDivisions;
    const origStart = start;

    while (dur > 0) {
      const measureIndex = Math.floor(start / MEASURE_DURATION);
      const measureStart = measureIndex * MEASURE_DURATION;
      const measureEnd = measureStart + MEASURE_DURATION;
      const spaceInMeasure = measureEnd - start;
      const take = Math.min(dur, spaceInMeasure);

      if (take <= 0) break;

      out.push({
        ...e,
        startDivision: start,
        durationDivisions: take,
        tieStart: start > origStart || dur > take,
        tieStop: dur > take,
      });

      start += take;
      dur -= take;
    }
  }
  return out.sort((a, b) => a.startDivision - b.startDivision);
}

/** Fill measure with rests where needed. */
export function fillMeasureRests(
  events: TimedNoteEvent[],
  measureIndex: number,
  voice: number,
  staff: number,
  part: string
): TimedNoteEvent[] {
  const measureStart = measureIndex * MEASURE_DURATION;
  const measureEnd = measureStart + MEASURE_DURATION;
  const voiceEvents = events
    .filter((e) => e.voice === voice && e.staff === staff && e.part === part)
    .sort((a, b) => a.startDivision - b.startDivision);

  const result: TimedNoteEvent[] = [];
  let cursor = measureStart;

  for (const e of voiceEvents) {
    if (e.startDivision > cursor) {
      const restDur = Math.min(e.startDivision - cursor, measureEnd - cursor);
      if (restDur > 0) {
        result.push({
          pitch: 0,
          startDivision: cursor,
          durationDivisions: restDur,
          voice,
          staff,
          part,
          tieStart: false,
          tieStop: false,
          rest: true,
        });
        cursor += restDur;
      }
    }
    const spaceLeft = measureEnd - cursor;
    const actualDur = Math.min(e.durationDivisions, spaceLeft);
    if (actualDur <= 0) continue;
    result.push({
      ...e,
      durationDivisions: actualDur,
      tieStart: e.tieStart,
      tieStop: e.tieStop,
    });
    cursor += actualDur;
  }

  if (cursor < measureEnd) {
    result.push({
      pitch: 0,
      startDivision: cursor,
      durationDivisions: measureEnd - cursor,
      voice,
      staff,
      part,
      tieStart: false,
      tieStop: false,
      rest: true,
    });
  }

  return result.sort((a, b) => a.startDivision - b.startDivision);
}

/** Pack events into measures; ensure each measure sums to MEASURE_DURATION. */
export function packEventsIntoMeasures(
  events: TimedNoteEvent[],
  measureCount: number
): Map<number, TimedNoteEvent[]> {
  const split = splitEventsAcrossBarlines(events);
  const byMeasure = new Map<number, TimedNoteEvent[]>();

  for (const e of split) {
    const m = Math.floor(e.startDivision / MEASURE_DURATION);
    const arr = byMeasure.get(m) ?? [];
    arr.push(e);
    byMeasure.set(m, arr);
  }

  const voiceKeys = [...new Set(split.map((e) => `${e.part}:${e.voice}:${e.staff}`))];
  for (let m = 0; m < measureCount; m++) {
    const measureStart = m * MEASURE_DURATION;
    const result: TimedNoteEvent[] = [];

    for (const key of voiceKeys) {
      const [part, voiceStr, staffStr] = key.split(':');
      const voice = parseInt(voiceStr, 10);
      const staff = parseInt(staffStr, 10);
      const existing = (byMeasure.get(m) ?? []).filter(
        (e) => e.part === part && e.voice === voice && e.staff === staff
      );
      const filled = fillMeasureRests(existing, m, voice, staff, part);
      result.push(...filled);
    }

    result.sort((a, b) => a.startDivision - b.startDivision);
    byMeasure.set(m, result);
  }

  return byMeasure;
}

/** Build voice timeline from raw events (onset in beats, duration in beats). */
export function buildVoiceTimeline(
  rawEvents: Array<{ pitch: number; onsetBeats: number; durationBeats: number; voice?: number; staff?: number; part?: string }>,
  partId: string = 'P1'
): TimedNoteEvent[] {
  const events = rawEvents.map((e) => ({
    pitch: e.pitch,
    startDivision: beatsToDivisions(e.onsetBeats),
    durationDivisions: Math.max(1, beatsToDivisions(e.durationBeats)),
    voice: e.voice ?? 1,
    staff: e.staff ?? 1,
    part: e.part ?? partId,
  }));
  return normalizeTimedEvents(events);
}
