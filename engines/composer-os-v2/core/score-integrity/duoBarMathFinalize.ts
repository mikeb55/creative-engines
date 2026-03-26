/**
 * Duo / shared score: enforce exact 4/4 per voice per measure after all generation passes.
 * Fills gaps with explicit rests; resolves overlaps by truncating earlier events (monophonic per voice).
 */

import type { MeasureModel, NoteEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { createNote, createRest } from '../score-model/scoreEventBuilder';
import { validateStrictBarMath } from './strictBarMath';

const EPS = 1e-4;

function qBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

/** Monophonic timeline: later event wins overlap by shortening the previous duration. */
function trimOverlapsMonophonic(sorted: ScoreEvent[]): ScoreEvent[] {
  const out: ScoreEvent[] = [];
  for (const e of sorted) {
    let cur = e;
    while (out.length > 0) {
      const last = out[out.length - 1];
      const le = last.startBeat + last.duration;
      if (cur.startBeat >= le - EPS) break;
      last.duration = qBeat(cur.startBeat - last.startBeat);
      if (last.duration > EPS) break;
      out.pop();
    }
    if (cur.duration > EPS) out.push(cur);
  }
  return out;
}

function rebuildVoiceLine(events: ScoreEvent[], voice: number): ScoreEvent[] {
  const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
  for (const e of sorted) {
    e.startBeat = qBeat(e.startBeat);
    e.duration = qBeat(e.duration);
  }
  const trimmed = trimOverlapsMonophonic(sorted);
  const filtered = trimmed.filter((e) => e.duration > EPS);
  if (filtered.length === 0) {
    return [createRest(0, BEATS_PER_MEASURE, voice)];
  }
  const out: ScoreEvent[] = [];
  let cursor = 0;
  for (const e of filtered) {
    let sb = e.startBeat;
    if (sb + e.duration > BEATS_PER_MEASURE + EPS) {
      e.duration = qBeat(BEATS_PER_MEASURE - sb);
    }
    const dur = e.duration;
    const ed = sb + dur;
    if (sb > BEATS_PER_MEASURE - EPS) break;
    if (sb > cursor + EPS) {
      out.push(createRest(cursor, qBeat(sb - cursor), voice));
      cursor = sb;
    }
    if (dur <= EPS) continue;
    if (e.kind === 'note') {
      const n = e as NoteEvent;
      const nn = createNote(n.pitch, sb, dur, voice);
      if (n.articulation) nn.articulation = n.articulation;
      if (n.velocity !== undefined) nn.velocity = n.velocity;
      out.push(nn);
    } else {
      out.push(createRest(sb, dur, voice));
    }
    cursor = qBeat(sb + dur);
  }
  if (cursor < BEATS_PER_MEASURE - EPS) {
    out.push(createRest(cursor, qBeat(BEATS_PER_MEASURE - cursor), voice));
  }
  return out;
}

/** Mutates measure events to exact bar length per voice (4/4). */
export function finalizeMeasureBarMathPerVoice(m: MeasureModel): void {
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
  const out: ScoreEvent[] = [];
  for (const v of [...byVoice.keys()].sort((a, b) => a - b)) {
    out.push(...rebuildVoiceLine(byVoice.get(v)!, v));
  }
  m.events = out;
}

/** Mutates score: every measure in every part is normalized per voice. */
export function finalizeScoreBarMathPerVoice(score: ScoreModel): void {
  for (const p of score.parts) {
    for (const m of p.measures) {
      finalizeMeasureBarMathPerVoice(m);
    }
  }
}

/** Final pass + hard check; throws if bar math is still invalid. */
export function assertScoreBarMathExact(score: ScoreModel): void {
  finalizeScoreBarMathPerVoice(score);
  const v = validateStrictBarMath(score);
  if (!v.valid) {
    throw new Error(`Bar math enforcement failed after finalize: ${v.errors.join('; ')}`);
  }
}
