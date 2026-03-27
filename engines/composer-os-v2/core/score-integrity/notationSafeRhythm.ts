/**
 * Notation-safe rhythm atoms (beats in 4/4). All duo generation must resolve to these durations
 * before export — no swing/micro-timing in duration; swing feel is articulation/velocity only.
 */

import type { MeasureModel, NoteEvent, PartModel, RestEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { createNote, createRest } from '../score-model/scoreEventBuilder';

const EPS = 1e-4;

/**
 * Allowed note/rest durations in beats (standard notation atoms).
 * 1.0 quarter, 0.5 eighth, 0.25 sixteenth, 1.5 dotted quarter, 0.75 dotted eighth, 2.0 half, 4.0 whole.
 */
export const NOTATION_SAFE_BEAT_DURATIONS_DESC: readonly number[] = [4, 2, 1.5, 1, 0.75, 0.5, 0.25];

const ALLOWED_SET = new Set(NOTATION_SAFE_BEAT_DURATIONS_DESC);

function snapSixteenth(x: number): number {
  return Math.round(x * 4) / 4;
}

export function isNotationSafeDuration(d: number): boolean {
  const x = snapSixteenth(d);
  return ALLOWED_SET.has(x);
}

/** Strong beats / subdivisions: sixteenth grid only (standard 4/4). */
export function isNotationSafeStartBeat(sb: number): boolean {
  const x = snapSixteenth(sb);
  return Math.abs(sb - x) < EPS;
}

/** Greedy decomposition: works for any positive multiple of 1/16 up to 4. */
export function decomposeDurationIntoAllowedPieces(d: number): number[] {
  let r = snapSixteenth(d);
  if (r <= EPS) return [];
  if (isNotationSafeDuration(r)) return [snapSixteenth(r)];
  const out: number[] = [];
  for (const u of NOTATION_SAFE_BEAT_DURATIONS_DESC) {
    while (r >= u - EPS) {
      out.push(u);
      r = snapSixteenth(r - u);
    }
  }
  if (r > EPS) {
    throw new Error(`notation-safe: cannot decompose duration ${d} (remainder ${r})`);
  }
  return out;
}

function expandVoiceEvents(events: ScoreEvent[]): ScoreEvent[] {
  const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
  const out: ScoreEvent[] = [];
  for (const e of sorted) {
    const voice = e.voice ?? 1;
    const pieces = decomposeDurationIntoAllowedPieces(e.duration);
    let t = snapSixteenth(e.startBeat);
    if (pieces.length === 0) continue;
    if (e.kind === 'note') {
      const n = e as NoteEvent;
      pieces.forEach((piece, i) => {
        const nn = createNote(n.pitch, t, piece, voice);
        if (i === 0) {
          if (n.articulation) nn.articulation = n.articulation;
          if (n.velocity !== undefined) nn.velocity = n.velocity;
        }
        out.push(nn);
        t = snapSixteenth(t + piece);
      });
    } else {
      const r = e as RestEvent;
      for (const piece of pieces) {
        out.push(createRest(t, piece, voice));
        t = snapSixteenth(t + piece);
      }
    }
  }
  return out;
}

/** Split every note/rest into allowed duration atoms (same pitch across splits). */
export function expandNotationSafeDurationsInMeasure(m: MeasureModel): void {
  const raw = m.events.filter((e) => e.kind === 'note' || e.kind === 'rest');
  if (raw.length === 0) {
    m.events = [createRest(0, BEATS_PER_MEASURE, 1)];
    return;
  }
  const byVoice = new Map<number, ScoreEvent[]>();
  for (const e of raw) {
    const v = e.voice ?? 1;
    if (!byVoice.has(v)) byVoice.set(v, []);
    byVoice.get(v)!.push(e);
  }
  const rebuilt: ScoreEvent[] = [];
  for (const v of [...byVoice.keys()].sort((a, b) => a - b)) {
    rebuilt.push(...expandVoiceEvents(byVoice.get(v)!));
  }
  m.events = rebuilt;
}

export function expandNotationSafeDurationsInScore(score: ScoreModel): void {
  for (const p of score.parts) {
    for (const m of p.measures) {
      expandNotationSafeDurationsInMeasure(m);
    }
  }
}

export interface NotationSafeRhythmResult {
  valid: boolean;
  errors: string[];
}

/** Pre-export: every note/rest uses an allowed duration; starts on sixteenth grid; sums still 4 per voice. */
export function validateNotationSafeRhythm(score: ScoreModel): NotationSafeRhythmResult {
  const errors: string[] = [];

  const checkPart = (p: PartModel): void => {
    for (const m of p.measures) {
      const byVoice = new Map<number, ScoreEvent[]>();
      for (const e of m.events) {
        if (e.kind !== 'note' && e.kind !== 'rest') continue;
        const v = e.voice ?? 1;
        if (!byVoice.has(v)) byVoice.set(v, []);
        byVoice.get(v)!.push(e);
      }
      for (const [voice, evs] of byVoice) {
        const sorted = [...evs].sort((a, b) => a.startBeat - b.startBeat);
        let sum = 0;
        for (const e of sorted) {
          if (!isNotationSafeStartBeat(e.startBeat)) {
            errors.push(
              `Notation-safe: part ${p.id} m${m.index} v${voice} startBeat ${e.startBeat} not on sixteenth grid`
            );
          }
          if (!isNotationSafeDuration(e.duration)) {
            errors.push(
              `Notation-safe: part ${p.id} m${m.index} v${voice} duration ${e.duration} not in allowed set`
            );
          }
          sum += e.duration;
        }
        if (sorted.length > 0 && Math.abs(sum - BEATS_PER_MEASURE) > EPS) {
          errors.push(
            `Notation-safe: part ${p.id} m${m.index} v${voice} sum ${sum} ≠ ${BEATS_PER_MEASURE}`
          );
        }
      }
    }
  };

  for (const p of score.parts) checkPart(p);

  return { valid: errors.length === 0, errors };
}
