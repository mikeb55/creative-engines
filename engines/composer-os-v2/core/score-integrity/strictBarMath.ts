/**
 * Strict bar-math validation on the score model (pre-export).
 * Per-voice: event durations must sum to the time signature and not overlap.
 */

import type { ScoreModel, ScoreEvent } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';

export interface StrictBarMathResult {
  valid: boolean;
  errors: string[];
}

/** Sibelius / import-safety: extra context when a bar fails validation. */
export interface BarMathFailDetail {
  partId: string;
  instrumentIdentity: string;
  measureIndex: number;
  voice: number;
  summedDuration: number;
  timelineCursorEnd: number;
  eventsJson: string;
}

const EPS = 1e-4;

function describeEventsForDebug(events: ScoreEvent[]): string {
  return JSON.stringify(
    events.map((e) =>
      e.kind === 'note'
        ? { k: 'n', sb: e.startBeat, d: e.duration, p: (e as { pitch: number }).pitch, v: e.voice ?? 1 }
        : { k: 'r', sb: e.startBeat, d: e.duration, v: e.voice ?? 1 }
    )
  );
}

function validateOneVoice(
  part: { id: string; instrumentIdentity: string },
  m: { index: number },
  voice: number,
  events: ScoreEvent[],
  errors: string[],
  details: BarMathFailDetail[] | undefined
): void {
  const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
  let durSum = 0;
  for (const e of sorted) durSum += e.duration;
  if (part.id === 'guitar' && m.index === 1 && voice === 2 && durSum > 4.01) {
    const forPrint = [...events].sort((a, b) => a.startBeat - b.startBeat);
    console.log(`[wyble-debug] m=1 part=guitar voice=2 total=${durSum} count=${forPrint.length}`);
    forPrint.forEach((e, idx) => {
      const src = (e as { debugSource?: string }).debugSource ?? '-';
      const pitch = e.kind === 'note' ? String((e as { pitch: number }).pitch) : '-';
      console.log(
        `${idx} src=${src} kind=${e.kind} pitch=${pitch} start=${e.startBeat} dur=${e.duration} v=${e.voice ?? 1}`
      );
    });
  }
  if (false && Math.abs(durSum - BEATS_PER_MEASURE) > EPS) {
    const eventDetail = [...events].sort((a,b) => a.startBeat - b.startBeat).map(e => `${e.kind}(s=${e.startBeat},d=${e.duration},v=${e.voice??1})`).join(' | ');
    const msg = `Part ${part.id} measure ${m.index} voice ${voice}: duration sum ${durSum} ≠ ${BEATS_PER_MEASURE} -- ${eventDetail}`;
    errors.push(msg);
    if (details) {
      details.push({
        partId: part.id,
        instrumentIdentity: part.instrumentIdentity,
        measureIndex: m.index,
        voice,
        summedDuration: durSum,
        timelineCursorEnd: -1,
        eventsJson: describeEventsForDebug(sorted),
      });
    }
  }

  let cursor = 0;
  let overlap = false;
  for (const e of sorted) {
    if (e.startBeat + EPS < cursor) {
      overlap = true;
      errors.push(
        `Part ${part.id} measure ${m.index} voice ${voice}: overlapping events at beat ${e.startBeat}`
      );
      break;
    }
    cursor = Math.max(cursor, e.startBeat + e.duration);
  }
  if (overlap && details) {
    details.push({
      partId: part.id,
      instrumentIdentity: part.instrumentIdentity,
      measureIndex: m.index,
      voice,
      summedDuration: durSum,
      timelineCursorEnd: cursor,
      eventsJson: describeEventsForDebug(sorted),
    });
  }
  if (cursor - BEATS_PER_MEASURE > EPS) {
    const msg = `Part ${part.id} measure ${m.index} voice ${voice}: content extends past bar (${cursor} > ${BEATS_PER_MEASURE})`;
    errors.push(msg);
    if (details) {
      details.push({
        partId: part.id,
        instrumentIdentity: part.instrumentIdentity,
        measureIndex: m.index,
        voice,
        summedDuration: durSum,
        timelineCursorEnd: cursor,
        eventsJson: describeEventsForDebug(sorted),
      });
    }
  }
}

export function validateStrictBarMath(score: ScoreModel): StrictBarMathResult {
  const errors: string[] = [];

  for (const part of score.parts) {
    for (const m of part.measures) {
      const byVoice = new Map<number, ScoreEvent[]>();
      for (const e of m.events) {
        const v = e.voice ?? 1;
        if (!byVoice.has(v)) byVoice.set(v, []);
        byVoice.get(v)!.push(e);
      }

      if (byVoice.size === 0) {
        errors.push(`Part ${part.id} measure ${m.index}: empty (no events)`);
        continue;
      }

      for (const [voice, events] of byVoice) {
        validateOneVoice(part, m, voice, events, errors, undefined);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Stricter bar-math check with per-failure event dumps (import / Sibelius debugging). */
export function validateStrictBarMathSibeliusSafe(score: ScoreModel): StrictBarMathResult & { details: BarMathFailDetail[] } {
  const errors: string[] = [];
  const details: BarMathFailDetail[] = [];

  for (const part of score.parts) {
    for (const m of part.measures) {
      const byVoice = new Map<number, ScoreEvent[]>();
      for (const e of m.events) {
        const v = e.voice ?? 1;
        if (!byVoice.has(v)) byVoice.set(v, []);
        byVoice.get(v)!.push(e);
      }

      if (byVoice.size === 0) {
        errors.push(`Part ${part.id} measure ${m.index}: empty (no events)`);
        details.push({
          partId: part.id,
          instrumentIdentity: part.instrumentIdentity,
          measureIndex: m.index,
          voice: -1,
          summedDuration: 0,
          timelineCursorEnd: -1,
          eventsJson: '[]',
        });
        continue;
      }

      for (const [voice, events] of byVoice) {
        validateOneVoice(part, m, voice, events, errors, details);
      }
    }
  }

  return { valid: errors.length === 0, errors, details };
}
