/**
 * Duo / shared score: authoritative final pass — exact 4/4 per voice per measure.
 * Runs once, after all musical / performance / expressive layers (no rhythm edits after seal).
 * `guitar_bass_duo` sets score.duoRhythmSnap = eighth_beats (Sibelius-friendly attacks); ECM keeps quarter grid.
 */

import type { MeasureModel, NoteEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { createNote, createRest } from '../score-model/scoreEventBuilder';
import { validateStrictBarMath } from './strictBarMath';
import { expandNotationSafeDurationsInScore, validateNotationSafeRhythm } from './notationSafeRhythm';
import { snapEighthBeat, snapEventToEighthBeatGrid } from './duoEighthBeatGrid';
import { applyBassBeatNotationGrouping } from './bassBeatNotationGrouping';

const EPS = 1e-4;

export type RhythmSnapMode = 'quarter' | 'eighth';

function qBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

function snapBeat(x: number, mode: RhythmSnapMode): number {
  return mode === 'eighth' ? snapEighthBeat(x) : qBeat(x);
}

/** Monophonic timeline: later event wins overlap by shortening the previous duration (may trim to zero). */
function trimOverlapsMonophonic(sorted: ScoreEvent[], mode: RhythmSnapMode): ScoreEvent[] {
  const out: ScoreEvent[] = [];
  for (const e of sorted) {
    while (out.length > 0) {
      const last = out[out.length - 1];
      const le = last.startBeat + last.duration;
      if (e.startBeat >= le - EPS) break;
      last.duration = snapBeat(e.startBeat - last.startBeat, mode);
      if (last.duration > EPS) break;
      out.pop();
    }
    if (e.duration > EPS) out.push(e);
  }
  return out;
}

/**
 * Build a single monophonic voice line: snap, remove overlaps (split/trim notes), gap-fill with rests,
 * trim anything past beat 4 (split long notes at bar end).
 */
function rebuildMonophonicVoiceLine(events: ScoreEvent[], voice: number, mode: RhythmSnapMode): ScoreEvent[] {
  const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
  for (const e of sorted) {
    if (mode === 'eighth') {
      snapEventToEighthBeatGrid(e);
    } else {
      (e as { startBeat: number }).startBeat = qBeat((e as { startBeat: number }).startBeat);
      (e as { duration: number }).duration = qBeat((e as { duration: number }).duration);
    }
  }
  const trimmed = trimOverlapsMonophonic(sorted, mode);
  const filtered = trimmed.filter((e) => e.duration > EPS);
  if (filtered.length === 0) {
    return [createRest(0, BEATS_PER_MEASURE, voice)];
  }
  const out: ScoreEvent[] = [];
  let cursor = 0;
  for (const e of filtered) {
    let sb = e.startBeat;
    if (sb >= BEATS_PER_MEASURE - EPS) break;
    let dur = e.duration;
    if (sb + dur > BEATS_PER_MEASURE + EPS) {
      dur = snapBeat(BEATS_PER_MEASURE - sb, mode);
    }
    if (dur <= EPS) continue;
    if (sb > cursor + EPS) {
      out.push(createRest(cursor, snapBeat(sb - cursor, mode), voice));
      cursor = sb;
    }
    if (e.kind === 'note') {
      const n = e as NoteEvent;
      const nn = createNote(n.pitch, sb, dur, voice, n.motifRef);
      if (n.articulation) nn.articulation = n.articulation;
      if (n.velocity !== undefined) nn.velocity = n.velocity;
      out.push(nn);
    } else {
      out.push(createRest(sb, dur, voice));
    }
    cursor = snapBeat(sb + dur, mode);
  }
  if (cursor < BEATS_PER_MEASURE - EPS) {
    out.push(createRest(cursor, snapBeat(BEATS_PER_MEASURE - cursor, mode), voice));
  }
  return out;
}

/** One measure, one monophonic line (voice 1) — used for bass clarity. */
function finalizeMeasureMonoVoice1(m: MeasureModel, mode: RhythmSnapMode): void {
  const raw = m.events.filter((e) => e.kind === 'note' || e.kind === 'rest');
  if (raw.length === 0) {
    m.events = [createRest(0, BEATS_PER_MEASURE, 1)];
    return;
  }
  m.events = rebuildMonophonicVoiceLine(raw, 1, mode);
}

/** One measure: each voice ID gets its own monophonic line (guitar may use multiple voices in theory). */
function finalizeMeasurePerVoiceLines(m: MeasureModel, mode: RhythmSnapMode): void {
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
    out.push(...rebuildMonophonicVoiceLine(byVoice.get(v)!, v, mode));
  }
  m.events = out;
}

/** Mutates measure events to exact bar length per voice (4/4). Bass is forced to a single monophonic voice. */
export function finalizeMeasureBarMathPerVoice(
  m: MeasureModel,
  opts?: { forceBassMonoVoice1?: boolean; rhythmSnap?: RhythmSnapMode }
): void {
  const mode: RhythmSnapMode = opts?.rhythmSnap ?? 'quarter';
  if (opts?.forceBassMonoVoice1) {
    finalizeMeasureMonoVoice1(m, mode);
  } else {
    finalizeMeasurePerVoiceLines(m, mode);
  }
}

/** Mutates score: every measure normalized; bass part collapsed to monophonic voice 1 per measure. */
export function finalizeScoreBarMathPerVoice(score: ScoreModel): void {
  const mode: RhythmSnapMode = score.duoRhythmSnap === 'eighth_beats' ? 'eighth' : 'quarter';
  for (const p of score.parts) {
    const forceBassMono = p.instrumentIdentity === 'acoustic_upright_bass';
    for (const m of p.measures) {
      finalizeMeasureBarMathPerVoice(m, { forceBassMonoVoice1: forceBassMono, rhythmSnap: mode });
    }
  }
}

/** Deep-freeze rhythm payloads so any post-return mutation throws (import safety / pipeline contract). */
export function freezeScoreRhythmAfterFinalize(score: ScoreModel): void {
  Object.freeze(score.parts);
  for (const p of score.parts) {
    Object.freeze(p);
    Object.freeze(p.measures);
    for (const m of p.measures) {
      Object.freeze(m);
      Object.freeze(m.events);
      for (const e of m.events) {
        Object.freeze(e);
      }
    }
  }
}

/**
 * Authoritative end of rhythm pipeline: finalize → validate once → freeze parts.
 * Call only after all passes that may alter startBeat/duration (performance, expressive, ECM envelopes).
 */
export function finalizeAndSealDuoScoreBarMath(score: ScoreModel): void {
  finalizeScoreBarMathPerVoice(score);
  /** Guitar–Bass Duo only: eighth-beat seal + Sibelius-friendly bass notation grouping (ECM / other presets skip). */
  if (score.duoRhythmSnap === 'eighth_beats') {
    applyBassBeatNotationGrouping(score);
  }
  expandNotationSafeDurationsInScore(score);
  const v = validateStrictBarMath(score);
  if (!v.valid) {
    throw new Error(`Bar math enforcement failed after finalize: ${v.errors.join('; ')}`);
  }
  const ns = validateNotationSafeRhythm(score);
  if (!ns.valid) {
    throw new Error(`Notation-safe rhythm failed before export: ${ns.errors.join('; ')}`);
  }
  freezeScoreRhythmAfterFinalize(score);
}

/** @deprecated Use finalizeAndSealDuoScoreBarMath — kept for call-site clarity. */
export function assertScoreBarMathExact(score: ScoreModel): void {
  finalizeAndSealDuoScoreBarMath(score);
}
