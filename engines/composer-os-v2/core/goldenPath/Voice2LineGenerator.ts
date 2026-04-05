/**
 * Phase 18.3B — Realise Voice 2 from phrase state plans: deterministic templates per state,
 * monophonic line, strictly below Voice 1; trims Voice 1 if duo polyphony would exceed 2.
 */

import type { CompositionContext } from '../compositionContext';
import type { ChordTonesOptions } from '../harmony/chordSymbolAnalysis';
import type { MeasureModel, NoteEvent, PartModel } from '../score-model/scoreModelTypes';
import { addEvent, createNote, createRest } from '../score-model/scoreEventBuilder';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { guitarChordTonesInRange, liftToneToRange } from './guitarPhraseAuthority';
import type { Voice2BarPlan, Voice2PhrasePlan } from './Voice2PhrasePlanner';

const V2_VOICE = 2;
const INNER_LOW = 48;
const MIN_MELODY_INNER_GAP = 2;
const V2_MAX_STEP = 6;

function chordOpts(context: CompositionContext): ChordTonesOptions | undefined {
  return context.generationMetadata?.customHarmonyLocked ? { lockedHarmony: true } : undefined;
}

function minOverlappingV1Pitch(v1: NoteEvent[], t0: number, t1: number): number | undefined {
  let m = Infinity;
  for (const n of v1) {
    const u = n.startBeat + n.duration;
    if (n.startBeat < t1 - 1e-6 && t0 < u - 1e-6) m = Math.min(m, n.pitch);
  }
  return m === Infinity ? undefined : m;
}

function strictCeilingFromMinV1(minV: number): number {
  return minV - MIN_MELODY_INNER_GAP + 1;
}

function placeStrictlyBelowCeiling(ceilingPitch: number, candidate: number, floorMidi: number): number {
  let p = liftToneToRange(candidate, floorMidi, ceilingPitch - 1);
  while (p >= ceilingPitch) p -= 12;
  return Math.max(floorMidi, p);
}

function v2PassesMelodyOverlapRule(v1: NoteEvent[], v2: NoteEvent[]): boolean {
  if (v1.length < 2) return true;
  for (const n of v2) {
    const t0 = n.startBeat;
    const t1 = t0 + n.duration;
    let c = 0;
    for (const x of v1) {
      const u = x.startBeat + x.duration;
      if (x.startBeat < t1 - 1e-6 && t0 < u - 1e-6) c++;
    }
    if (c >= 2) return true;
  }
  return false;
}

function maxSimultaneousGuitarNotes(m: MeasureModel): number {
  const noteSpans = m.events
    .filter((e) => e.kind === 'note' && ((e.voice ?? 1) === 1 || (e.voice ?? 1) === 2))
    .map((e) => ({ t0: e.startBeat, t1: e.startBeat + e.duration }));
  if (noteSpans.length === 0) return 0;
  const times = new Set<number>();
  for (const s of noteSpans) {
    times.add(s.t0);
    times.add(s.t1);
    times.add(s.t0 + (s.t1 - s.t0) * 0.5);
  }
  let maxN = 0;
  for (const t of times) {
    const n = noteSpans.filter((s) => t >= s.t0 && t < s.t1 - 1e-9).length;
    maxN = Math.max(maxN, n);
  }
  return maxN;
}

/** Voice 1 shortens first if more than two simultaneous guitar notes (Voice 2 is not deleted). */
function trimVoice1ForMaxTwoSimultaneous(m: MeasureModel): void {
  for (let guard = 0; guard < 24 && maxSimultaneousGuitarNotes(m) > 2; guard++) {
    const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    if (v1.length === 0) break;
    const longest = [...v1].sort((a, b) => b.duration - a.duration)[0]!;
    const idx = m.events.indexOf(longest);
    if (idx < 0) break;
    const newDur = Math.max(0.25, longest.duration - 0.5);
    m.events[idx] = { ...longest, duration: newDur };
  }
}

function pickAnchorPitch(
  chord: string,
  ceiling: number,
  prev: number | null,
  context: CompositionContext,
  seed: number,
  bar: number,
  salt: number
): number {
  const innerHigh = Math.min(63, ceiling - 1);
  if (innerHigh < INNER_LOW) return clampPitch(prev ?? INNER_LOW + 5, INNER_LOW, Math.max(INNER_LOW, innerHigh));
  const tones = guitarChordTonesInRange(chord, INNER_LOW, innerHigh, chordOpts(context));
  const pool = [tones.third, tones.seventh, tones.fifth, tones.root];
  if (prev === null) {
    const raw = seededUnit(seed, bar, salt) < 0.62 ? tones.third : tones.seventh;
    return placeStrictlyBelowCeiling(ceiling, raw, INNER_LOW);
  }
  let best = placeStrictlyBelowCeiling(ceiling, pool[0]!, INNER_LOW);
  let bd = Math.abs(best - prev);
  for (const raw of pool) {
    const p = placeStrictlyBelowCeiling(ceiling, raw, INNER_LOW);
    const d = Math.abs(p - prev);
    if (d <= V2_MAX_STEP && d < bd) {
      bd = d;
      best = p;
    }
  }
  if (bd <= V2_MAX_STEP) return best;
  const sign = best >= prev ? 1 : -1;
  return clampPitch(prev + sign * Math.min(V2_MAX_STEP, Math.abs(best - prev)), INNER_LOW, innerHigh);
}

function voice2StrictlyBelowOverlappingV1(v1: NoteEvent[], v2: NoteEvent[]): boolean {
  for (const v2n of v2) {
    const t0 = v2n.startBeat;
    const t1 = t0 + v2n.duration;
    for (const v1n of v1) {
      const u1 = v1n.startBeat + v1n.duration;
      if (v1n.startBeat < t1 - 1e-6 && t0 < u1 - 1e-6 && v2n.pitch >= v1n.pitch - MIN_MELODY_INNER_GAP) return false;
    }
  }
  return true;
}

function voice2TotalBeatsInBar(m: MeasureModel): number {
  let s = 0;
  for (const e of m.events) {
    if ((e.voice ?? 1) === V2_VOICE) s += e.duration;
  }
  return s;
}

function appendV2RestToFillBar(m: MeasureModel): void {
  let end = 0;
  for (const e of m.events) {
    if ((e.voice ?? 1) === V2_VOICE) end = Math.max(end, e.startBeat + e.duration);
  }
  if (end < 4 - 1e-4) {
    addEvent(m, createRest(end, 4 - end, V2_VOICE));
    m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
  }
}

function tryCommitV2Events(
  m: MeasureModel,
  v1: NoteEvent[],
  candidates: Array<{ pitch: number; startBeat: number; duration: number }>,
  _chord: string,
  _context: CompositionContext
): boolean {
  const backup = m.events.map((e) => ({ ...e }));
  m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
  const sorted = [...candidates].sort((a, b) => a.startBeat - b.startBeat);
  const head = sorted[0]?.startBeat ?? 0;
  if (head > 1e-4) {
    addEvent(m, createRest(0, head, V2_VOICE));
  }
  for (const c of sorted) {
    addEvent(m, createNote(c.pitch, c.startBeat, c.duration, V2_VOICE));
  }
  m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
  appendV2RestToFillBar(m);
  const v2r = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
  const ok =
    Math.abs(voice2TotalBeatsInBar(m) - 4) < 0.02 &&
    voice2StrictlyBelowOverlappingV1(v1, v2r) &&
    maxSimultaneousGuitarNotes(m) <= 2 &&
    v2PassesMelodyOverlapRule(v1, v2r);
  if (!ok) {
    m.events = backup;
    return false;
  }
  trimVoice1ForMaxTwoSimultaneous(m);
  return true;
}

function emitEnter(
  m: MeasureModel,
  v1: NoteEvent[],
  bp: Voice2BarPlan,
  chord: string,
  context: CompositionContext,
  prevPitch: number | null
): number | null {
  const t0 = Math.min(bp.entryBeat, 1.5);
  /** One sounding line from early entry to bar end (presence + overlap with multiple melody attacks when possible). */
  const d = Math.max(0.5, 4 - t0);
  const minV = minOverlappingV1Pitch(v1, t0, t0 + d);
  if (minV === undefined) return prevPitch;
  const ceil = strictCeilingFromMinV1(minV);
  const p = pickAnchorPitch(chord, ceil, prevPitch, context, context.seed, bp.bar, 9302);
  if (tryCommitV2Events(m, v1, [{ pitch: p, startBeat: t0, duration: d }], chord, context)) return p;
  return prevPitch;
}

function emitFlow(
  m: MeasureModel,
  v1: NoteEvent[],
  bp: Voice2BarPlan,
  chord: string,
  context: CompositionContext,
  seed: number,
  prevPitch: number | null
): number | null {
  const t0 = Math.min(bp.entryBeat, 1);
  const u = seededUnit(seed, bp.bar, 9310);
  const durs =
    u < 0.34 ? [0.5, 1.25, 2.25] : u < 0.67 ? [0.5, 1.5, 2] : [1, 1, 2];
  let bt = t0;
  const pitches: number[] = [];
  const segs: Array<{ pitch: number; startBeat: number; duration: number }> = [];
  let pp = prevPitch;
  for (let i = 0; i < 3; i++) {
    const d = durs[i]!;
    if (bt + d > 4 + 1e-6) break;
    const minV = minOverlappingV1Pitch(v1, bt, bt + d);
    if (minV === undefined) return prevPitch;
    const ceil = strictCeilingFromMinV1(minV);
    const p = pickAnchorPitch(chord, ceil, pp, context, seed, bp.bar, 9311 + i);
    segs.push({ pitch: p, startBeat: bt, duration: d });
    pitches.push(p);
    pp = p;
    bt += d;
  }
  if (segs.length === 0) return prevPitch;
  if (tryCommitV2Events(m, v1, segs, chord, context)) return pitches[pitches.length - 1]!;
  /** Fallback: single mid bar note */
  const mid = t0 + 1;
  const minV2 = minOverlappingV1Pitch(v1, mid, mid + 2);
  if (minV2 === undefined) return prevPitch;
  const ceil2 = strictCeilingFromMinV1(minV2);
  const p2 = pickAnchorPitch(chord, ceil2, prevPitch, context, seed, bp.bar, 9319);
  if (tryCommitV2Events(m, v1, [{ pitch: p2, startBeat: mid, duration: 2 }], chord, context)) return p2;
  return prevPitch;
}

function emitHold(
  m: MeasureModel,
  v1: NoteEvent[],
  bp: Voice2BarPlan,
  chord: string,
  context: CompositionContext,
  seed: number,
  prevPitch: number | null
): number | null {
  const t0 = Math.min(bp.entryBeat, 0.5);
  const u = seededUnit(seed, bp.bar, 9320);
  const durs = u < 0.5 ? [2, 2] : [2.5, 1.5];
  let bt = t0;
  const segs: Array<{ pitch: number; startBeat: number; duration: number }> = [];
  let pp = prevPitch;
  for (let i = 0; i < 2; i++) {
    const d = durs[i]!;
    if (bt + d > 4 + 1e-6) break;
    const minV = minOverlappingV1Pitch(v1, bt, bt + d);
    if (minV === undefined) return prevPitch;
    const ceil = strictCeilingFromMinV1(minV);
    const p = pickAnchorPitch(chord, ceil, pp, context, seed, bp.bar, 9321 + i);
    segs.push({ pitch: p, startBeat: bt, duration: d });
    pp = p;
    bt += d;
  }
  if (segs.length === 0) return prevPitch;
  if (tryCommitV2Events(m, v1, segs, chord, context)) return segs[segs.length - 1]!.pitch;
  return prevPitch;
}

function emitCadence(
  m: MeasureModel,
  v1: NoteEvent[],
  bp: Voice2BarPlan,
  chord: string,
  context: CompositionContext,
  seed: number,
  prevPitch: number | null
): number | null {
  const t0 = Math.min(bp.entryBeat, 1);
  const u = seededUnit(seed, bp.bar, 9330);
  if (u < 0.42) {
    const d1 = 1.25;
    const d2 = 2.75;
    let bt = t0;
    const segs: Array<{ pitch: number; startBeat: number; duration: number }> = [];
    let pp = prevPitch;
    for (let i = 0; i < 2; i++) {
      const d = i === 0 ? d1 : d2;
      const minV = minOverlappingV1Pitch(v1, bt, bt + d);
      if (minV === undefined) return prevPitch;
      const ceil = strictCeilingFromMinV1(minV);
      const p = pickAnchorPitch(chord, ceil, pp, context, seed, bp.bar, 9331 + i);
      segs.push({ pitch: p, startBeat: bt, duration: d });
      pp = p;
      bt += d;
    }
    if (tryCommitV2Events(m, v1, segs, chord, context)) return segs[1]!.pitch;
  }
  const minV = minOverlappingV1Pitch(v1, 0, 4);
  if (minV === undefined) return prevPitch;
  const ceil = strictCeilingFromMinV1(minV);
  const p = pickAnchorPitch(chord, ceil, prevPitch, context, seed, bp.bar, 9338);
  if (tryCommitV2Events(m, v1, [{ pitch: p, startBeat: t0, duration: 4 - t0 }], chord, context)) return p;
  return prevPitch;
}

/**
 * Clear all Voice 2 events, then realise phrase state machine across the part.
 * @returns number of measures that received at least one Voice 2 note
 */
export function applyVoice2PhraseStateMachineLayer(
  guitar: PartModel,
  context: CompositionContext,
  phrasePlans: Voice2PhrasePlan[]
): number {
  for (const m of guitar.measures) {
    m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
  }

  let lastPitch: number | null = null;
  let injected = 0;

  const barPlans: Voice2BarPlan[] = [];
  for (const ph of phrasePlans) {
    for (const b of ph.bars) {
      barPlans.push(b);
    }
  }
  barPlans.sort((a, b) => a.bar - b.bar);

  for (const bp of barPlans) {
    const m = guitar.measures.find((x) => x.index === bp.bar);
    if (!m) continue;
    const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    if (v1.length === 0) continue;
    const chord = m.chord ?? 'Cmaj9';
    const before = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE).length;

    let next: number | null = lastPitch;
    switch (bp.state) {
      case 'enter':
        next = emitEnter(m, v1, bp, chord, context, lastPitch);
        break;
      case 'flow':
        next = emitFlow(m, v1, bp, chord, context, context.seed, lastPitch);
        break;
      case 'hold':
        next = emitHold(m, v1, bp, chord, context, context.seed, lastPitch);
        break;
      case 'cadence':
        next = emitCadence(m, v1, bp, chord, context, context.seed, lastPitch);
        break;
      default:
        break;
    }
    if (next !== null) lastPitch = next;
    const after = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE).length;
    if (after > 0) injected++;
  }

  return injected;
}
