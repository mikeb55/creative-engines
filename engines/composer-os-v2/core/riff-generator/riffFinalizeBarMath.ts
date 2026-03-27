/**
 * Riff scores: snap to eighth or sixteenth grid, monophonic per voice, gap-fill, notation-safe.
 */

import type { MeasureModel, NoteEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { createNote, createRest } from '../score-model/scoreEventBuilder';

const EPS = 1e-4;

function snapGrid(x: number, step: number): number {
  return Math.round(x / step) * step;
}

function snapEvent(e: ScoreEvent, step: number): void {
  if (e.kind !== 'note' && e.kind !== 'rest') return;
  const n = e as { startBeat: number; duration: number };
  let sb = snapGrid(n.startBeat, step);
  let eb = snapGrid(n.startBeat + n.duration, step);
  if (eb > BEATS_PER_MEASURE) eb = BEATS_PER_MEASURE;
  if (eb < sb) eb = sb;
  n.startBeat = sb;
  n.duration = Math.max(0, eb - sb);
}

function rebuildMonophonicVoice(events: ScoreEvent[], voice: number, step: number): ScoreEvent[] {
  const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
  for (const e of sorted) snapEvent(e, step);
  const trimmed: ScoreEvent[] = [];
  for (const e of sorted) {
    if (e.duration <= EPS) continue;
    while (trimmed.length > 0) {
      const last = trimmed[trimmed.length - 1]!;
      const le = last.startBeat + last.duration;
      if (e.startBeat >= le - EPS) break;
      last.duration = Math.max(0, snapGrid(e.startBeat, step) - last.startBeat);
      if (last.duration > EPS) break;
      trimmed.pop();
    }
    if (e.duration > EPS) trimmed.push(e);
  }
  if (trimmed.length === 0) {
    return [createRest(0, BEATS_PER_MEASURE, voice)];
  }
  const out: ScoreEvent[] = [];
  let cursor = 0;
  for (const e of trimmed) {
    let sb = e.startBeat;
    if (sb >= BEATS_PER_MEASURE - EPS) break;
    let dur = e.duration;
    if (sb + dur > BEATS_PER_MEASURE + EPS) {
      dur = snapGrid(BEATS_PER_MEASURE - sb, step);
    }
    if (dur <= EPS) continue;
    if (sb > cursor + EPS) {
      out.push(createRest(cursor, snapGrid(sb - cursor, step), voice));
      cursor = sb;
    }
    if (e.kind === 'note') {
      const n = e as NoteEvent;
      const nn = createNote(n.pitch, sb, dur, voice);
      if (n.articulation) nn.articulation = n.articulation;
      if (n.velocity !== undefined) nn.velocity = n.velocity;
      out.push(nn);
    } else {
      out.push(createRest(sb, dur, voice));
    }
    cursor = snapGrid(sb + dur, step);
  }
  if (cursor < BEATS_PER_MEASURE - EPS) {
    out.push(createRest(cursor, snapGrid(BEATS_PER_MEASURE - cursor, step), voice));
  }
  return out;
}

function finalizeMeasure(m: MeasureModel, step: number): void {
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
    out.push(...rebuildMonophonicVoice(byVoice.get(v)!, v, step));
  }
  m.events = out;
}

/** Mutates score: grid-aligned monophonic voice lines per measure. */
export function finalizeRiffScoreBarMath(score: ScoreModel, grid: 'eighth' | 'sixteenth'): void {
  const step = grid === 'sixteenth' ? 0.25 : 0.5;
  for (const p of score.parts) {
    for (const m of p.measures) {
      finalizeMeasure(m, step);
    }
  }
}
