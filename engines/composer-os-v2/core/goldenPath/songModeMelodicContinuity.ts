/**
 * Song Mode — melodic continuity: reduce micro zig-zag in pitch contour and trim tiny rests
 * (guitar only; identity-protected bars unchanged; harmony unchanged).
 */

import type { CompositionContext } from '../compositionContext';
import type { MeasureModel, NoteEvent, PartModel, RestEvent, ScoreEvent } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { guitarRestRatio } from '../score-integrity/duoLockQuality';
import { shouldUseUserChordSemanticsForTones } from '../harmony/harmonyChordTonePolicy';
import { getChordForBar } from '../harmony/harmonyResolution';
import { guitarChordTonesInRange } from './guitarPhraseAuthority';
import { clampPitch } from './guitarBassDuoHarmony';
import { isProtectedBar } from '../score-integrity/identityLock';
import { normalizeMeasureToEighthBeatGrid, snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';

const LOW = 55;
const HIGH = 79;
const EPS = 1e-4;
/** Micro zig-zag: opposing steps both ≤ this many semitones. */
const ZIGZAG_MAX_STEP = 3;
/** Absorb rests between short notes up to this duration (beats). */
const MICRO_REST_MAX = 0.25;
/** Notes bordering a micro-rest must be this short or shorter to qualify. */
const SHORT_NOTE_MAX_DUR = 1.5;
/** Match `songModeSpaceC7` swing rest ceiling (whole-guitar `guitarRestRatio`). */
const SWING_GUITAR_REST_TARGET = 0.45;
/** Relaxed gap fill when ratio is still barely above ceiling. */
const MICRO_REST_MAX_RELAXED = 0.5;
const SHORT_NOTE_MAX_DUR_RELAXED = 2.75;

function chordToneOpts(context: CompositionContext) {
  return shouldUseUserChordSemanticsForTones(context) ? ({ lockedHarmony: true } as const) : undefined;
}

function nearestChordPoolMidi(pitch: number, bar: number, context: CompositionContext): number {
  const chord = getChordForBar(bar, context);
  const g = guitarChordTonesInRange(chord, LOW, HIGH, chordToneOpts(context));
  const pool = [g.root, g.third, g.fifth, g.seventh].map((x) => Math.round(x));
  let best = pool[0]!;
  let bd = Math.abs(pitch - best);
  for (const p of pool) {
    const d = Math.abs(pitch - p);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return clampPitch(best, LOW, HIGH);
}

interface NoteRef {
  bar: number;
  eventIndex: number;
}

function getNoteAtRef(guitar: PartModel, r: NoteRef): NoteEvent | undefined {
  const m = guitar.measures.find((x) => x.index === r.bar);
  const e = m?.events[r.eventIndex];
  return e?.kind === 'note' ? (e as NoteEvent) : undefined;
}

function collectGuitarNoteRefs(guitar: PartModel): NoteRef[] {
  const out: NoteRef[] = [];
  const sorted = [...guitar.measures].sort((a, b) => a.index - b.index);
  for (const m of sorted) {
    for (let ei = 0; ei < m.events.length; ei++) {
      if (m.events[ei].kind === 'note') {
        out.push({ bar: m.index, eventIndex: ei });
      }
    }
  }
  return out;
}

function noteTimeOrder(a: NoteRef, b: NoteRef, guitar: PartModel): number {
  const na = getNoteAtRef(guitar, a);
  const nb = getNoteAtRef(guitar, b);
  if (!na || !nb) return 0;
  const ta = a.bar * 4 + na.startBeat;
  const tb = b.bar * 4 + nb.startBeat;
  if (Math.abs(ta - tb) < EPS) return (na.voice ?? 1) - (nb.voice ?? 1);
  return ta - tb;
}

/**
 * Collapse immediate up–down (or down–up) micro-steps on chord tones by nudging the middle pitch
 * toward the midpoint of neighbours (then snap to pool).
 */
function smoothMicroZigzagGuitar(guitar: PartModel, context: CompositionContext): void {
  const refs = collectGuitarNoteRefs(guitar);
  refs.sort((a, b) => noteTimeOrder(a, b, guitar));
  if (refs.length < 3) return;

  for (let i = 1; i < refs.length - 1; i++) {
    const r0 = refs[i - 1]!;
    const r1 = refs[i]!;
    const r2 = refs[i + 1]!;
    if (isProtectedBar(r0.bar, context) || isProtectedBar(r1.bar, context) || isProtectedBar(r2.bar, context)) {
      continue;
    }

    const m0 = guitar.measures.find((m) => m.index === r0.bar);
    const m1 = guitar.measures.find((m) => m.index === r1.bar);
    const m2 = guitar.measures.find((m) => m.index === r2.bar);
    if (!m0 || !m1 || !m2) continue;

    const e0 = m0.events[r0.eventIndex] as NoteEvent;
    const e1 = m1.events[r1.eventIndex] as NoteEvent;
    const e2 = m2.events[r2.eventIndex] as NoteEvent;

    const p0 = e0.pitch;
    const p1 = e1.pitch;
    const p2 = e2.pitch;
    const d1 = p1 - p0;
    const d2 = p2 - p1;
    if (d1 === 0 || d2 === 0) continue;
    if (Math.sign(d1) === Math.sign(d2)) continue;
    if (Math.abs(d1) > ZIGZAG_MAX_STEP || Math.abs(d2) > ZIGZAG_MAX_STEP) continue;

    const mid = Math.round((p0 + p2) / 2);
    e1.pitch = nearestChordPoolMidi(mid, r1.bar, context);
  }
}

function eventsSorted(m: MeasureModel): ScoreEvent[] {
  return [...m.events]
    .filter((e) => e.kind === 'note' || e.kind === 'rest')
    .sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
}

/**
 * Merge small gap-rests between two short notes on the same voice.
 * Returns true if a rest was absorbed.
 */
function trimMicroRestsInMeasure(
  m: MeasureModel,
  bar: number,
  context: CompositionContext,
  microMax: number,
  shortMaxDur: number
): boolean {
  if (isProtectedBar(bar, context)) return false;

  const sorted = eventsSorted(m);
  for (let i = 0; i < sorted.length - 2; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const c = sorted[i + 2];
    if (a.kind !== 'note' || b.kind !== 'rest' || c.kind !== 'note') continue;
    const na = a as NoteEvent;
    const rb = b as RestEvent;
    const nc = c as NoteEvent;
    const va = na.voice ?? 1;
    if ((rb.voice ?? 1) !== va || (nc.voice ?? 1) !== va) continue;
    if (rb.duration > microMax + EPS) continue;
    if (na.duration > shortMaxDur + EPS || nc.duration > shortMaxDur + EPS) continue;
    const gapEnd = na.startBeat + na.duration;
    if (Math.abs(gapEnd - rb.startBeat) > EPS) continue;
    if (Math.abs(rb.startBeat + rb.duration - nc.startBeat) > EPS) continue;
    const hit = m.events.indexOf(b);
    if (hit < 0) continue;
    na.duration = snapAttackBeatToGrid(na.duration + rb.duration);
    m.events.splice(hit, 1);
    return true;
  }
  return false;
}

/**
 * If a voice ends with note + tiny rest to bar end, merge into the note (reduces rest beats).
 */
function absorbTrailingVoiceRestToBarEnd(m: MeasureModel, bar: number, context: CompositionContext): boolean {
  if (isProtectedBar(bar, context)) return false;
  for (const voice of [1, 2] as const) {
    const sorted = eventsSorted(m).filter((e) => (e as { voice?: number }).voice === undefined ? voice === 1 : (e as { voice?: number }).voice === voice);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.kind !== 'note' || b.kind !== 'rest') continue;
      const na = a as NoteEvent;
      const rb = b as RestEvent;
      if (rb.duration > MICRO_REST_MAX_RELAXED + EPS) continue;
      if (Math.abs(na.startBeat + na.duration - rb.startBeat) > EPS) continue;
      if (Math.abs(rb.startBeat + rb.duration - BEATS_PER_MEASURE) > EPS) continue;
      const ri = m.events.indexOf(rb);
      if (ri < 0) continue;
      na.duration = snapAttackBeatToGrid(na.duration + rb.duration);
      m.events.splice(ri, 1);
      return true;
    }
  }
  return false;
}

/** Iteratively trim gaps / trailing bits until rest ratio ≤ target or no progress. */
function fillRestsUntilSwingCeiling(guitar: PartModel, context: CompositionContext): void {
  const bars = [...guitar.measures].map((m) => m.index).sort((a, b) => a - b);
  let iter = 0;
  while (guitarRestRatio(guitar) > SWING_GUITAR_REST_TARGET + 0.002 && iter < 80) {
    iter++;
    let changed = false;
    for (const bar of bars) {
      if (isProtectedBar(bar, context)) continue;
      const m = guitar.measures.find((x) => x.index === bar);
      if (!m) continue;
      while (trimMicroRestsInMeasure(m, bar, context, MICRO_REST_MAX, SHORT_NOTE_MAX_DUR)) changed = true;
      while (trimMicroRestsInMeasure(m, bar, context, MICRO_REST_MAX_RELAXED, SHORT_NOTE_MAX_DUR_RELAXED)) changed = true;
      while (absorbTrailingVoiceRestToBarEnd(m, bar, context)) changed = true;
    }
    if (!changed) break;
    for (const m of guitar.measures) normalizeMeasureToEighthBeatGrid(m);
  }
}

/**
 * Guitar-only: run after Song Mode overlays, before finalize. Does not change chords or bass.
 */
export function applySongModeMelodicContinuityPass(guitar: PartModel, context: CompositionContext): void {
  if (context.presetId !== 'guitar_bass_duo') return;
  if (context.generationMetadata?.songModeHookFirstIdentity !== true) return;
  if (context.form.totalBars !== 32) return;

  smoothMicroZigzagGuitar(guitar, context);

  const bars = [...guitar.measures].map((m) => m.index).sort((a, b) => a - b);
  for (const bar of bars) {
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) continue;
    while (trimMicroRestsInMeasure(m, bar, context, MICRO_REST_MAX, SHORT_NOTE_MAX_DUR)) {
      /* absorb all micro gaps in pass */
    }
  }

  for (const m of guitar.measures) {
    normalizeMeasureToEighthBeatGrid(m);
  }

  fillRestsUntilSwingCeiling(guitar, context);
}
