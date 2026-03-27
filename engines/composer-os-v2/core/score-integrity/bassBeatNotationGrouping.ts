/**
 * Bass-only (acoustic_upright_bass): build each 4/4 bar in beats first, then emit notation-safe
 * durations so MusicXML/Sibelius shows clean quarters, halves, dotted-quarter+eighth — not greedy
 * tick-style fragmentation. Runs after bar-math finalize, before notation-safe expansion.
 *
 * Eighth-note subdivision matches duo attack grid: 8 slots per bar, spacing 0.5 beats (see DUO_ATTACK_GRID_BEATS).
 */

import type { MeasureModel, NoteEvent, PartModel, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { createNote, createRest } from '../score-model/scoreEventBuilder';
const EPS = 1e-5;
const VOICE = 1;

/** Midpoint of eighth slot i (0..7) in beats — same spacing as duo eighth grid (0.5 beats per slot). */
function eighthMidpointBeat(slot: number): number {
  return (slot + 0.5) * 0.5;
}

function pitchAtTime(sorted: ScoreEvent[], t: number): number | null {
  for (const e of sorted) {
    const end = e.startBeat + e.duration;
    if (t >= e.startBeat - EPS && t < end - EPS) {
      if (e.kind === 'rest') return null;
      return (e as NoteEvent).pitch;
    }
  }
  return null;
}

function copyNoteMeta(from: NoteEvent | undefined, to: NoteEvent): void {
  if (!from) return;
  if (from.articulation) to.articulation = from.articulation;
  if (from.velocity !== undefined) to.velocity = from.velocity;
}

function firstNoteTouching(sorted: ScoreEvent[], t: number): NoteEvent | undefined {
  for (const e of sorted) {
    const end = e.startBeat + e.duration;
    if (e.kind === 'note' && t >= e.startBeat - EPS && t < end - EPS) return e as NoteEvent;
  }
  return undefined;
}

/** Eight eighth-slot pitches (null = rest) sampled at slot midpoints. */
function buildEighthSlotPitches(events: ScoreEvent[]): (number | null)[] {
  const raw = events.filter((e) => e.kind === 'note' || e.kind === 'rest');
  if (raw.length === 0) {
    return Array(8).fill(null) as (number | null)[];
  }
  const sorted = [...raw].sort((a, b) => a.startBeat - b.startBeat);
  const out: (number | null)[] = [];
  for (let i = 0; i < 8; i++) {
    out.push(pitchAtTime(sorted, eighthMidpointBeat(i)));
  }
  return out;
}

function emitOneBeat(
  p0: number | null,
  p1: number | null,
  startBeat: number,
  sorted: ScoreEvent[],
  slotBase: number
): ScoreEvent[] {
  const m0 = firstNoteTouching(sorted, eighthMidpointBeat(slotBase));
  const m1 = firstNoteTouching(sorted, eighthMidpointBeat(slotBase + 1));

  if (p0 === null && p1 === null) {
    return [createRest(startBeat, 1, VOICE)];
  }
  if (p0 !== null && p0 === p1) {
    const n = createNote(p0, startBeat, 1, VOICE);
    copyNoteMeta(m0 ?? m1, n);
    return [n];
  }
  const out: ScoreEvent[] = [];
  if (p0 === null) {
    out.push(createRest(startBeat, 0.5, VOICE));
  } else {
    const n = createNote(p0, startBeat, 0.5, VOICE);
    copyNoteMeta(m0, n);
    out.push(n);
  }
  if (p1 === null) {
    out.push(createRest(startBeat + 0.5, 0.5, VOICE));
  } else {
    const n = createNote(p1, startBeat + 0.5, 0.5, VOICE);
    copyNoteMeta(m1, n);
    out.push(n);
  }
  return out;
}

/**
 * Two beats starting at startBeat, consuming slots [0..3] relative to slotOffset.
 */
function emitTwoBeatBlock(
  slots: (number | null)[],
  slotOffset: number,
  startBeat: number,
  sorted: ScoreEvent[]
): ScoreEvent[] {
  const s0 = slots[slotOffset];
  const s1 = slots[slotOffset + 1];
  const s2 = slots[slotOffset + 2];
  const s3 = slots[slotOffset + 3];

  const allNull = s0 === null && s1 === null && s2 === null && s3 === null;
  if (allNull) {
    return [createRest(startBeat, 2, VOICE)];
  }

  const allSamePitch = s0 !== null && s0 === s1 && s1 === s2 && s2 === s3;
  if (allSamePitch) {
    const m = firstNoteTouching(sorted, eighthMidpointBeat(slotOffset));
    const n = createNote(s0!, startBeat, 2, VOICE);
    copyNoteMeta(m, n);
    return [n];
  }

  const tripleEqual = s0 === s1 && s1 === s2;
  const fourthDiffers = s3 !== s2;
  if (tripleEqual && fourthDiffers) {
    const m0 = firstNoteTouching(sorted, eighthMidpointBeat(slotOffset));
    const m3 = firstNoteTouching(sorted, eighthMidpointBeat(slotOffset + 3));

    if (s0 === null) {
      const r = createRest(startBeat, 1.5, VOICE);
      if (s3 === null) {
        return [r, createRest(startBeat + 1.5, 0.5, VOICE)];
      }
      const n = createNote(s3!, startBeat + 1.5, 0.5, VOICE);
      copyNoteMeta(m3, n);
      return [r, n];
    }

    const nLong = createNote(s0!, startBeat, 1.5, VOICE);
    copyNoteMeta(m0, nLong);
    if (s3 === null) {
      return [nLong, createRest(startBeat + 1.5, 0.5, VOICE)];
    }
    const nShort = createNote(s3!, startBeat + 1.5, 0.5, VOICE);
    copyNoteMeta(m3, nShort);
    return [nLong, nShort];
  }

  return [
    ...emitOneBeat(s0, s1, startBeat, sorted, slotOffset),
    ...emitOneBeat(s2, s3, startBeat + 1, sorted, slotOffset + 2),
  ];
}

function rebuildBassMeasure(m: MeasureModel): void {
  const raw = m.events.filter((e) => e.kind === 'note' || e.kind === 'rest');
  if (raw.length === 0) {
    m.events = [createRest(0, BEATS_PER_MEASURE, VOICE)];
    return;
  }

  const sorted = [...raw].sort((a, b) => a.startBeat - b.startBeat);
  const slots = buildEighthSlotPitches(sorted);

  const left = emitTwoBeatBlock(slots, 0, 0, sorted);
  const right = emitTwoBeatBlock(slots, 4, 2, sorted);
  /** No cross-beat merge pass: merging quarters into halves changes rhythm fingerprints and trips duo bass-identity / swing gates. */
  const merged = [...left, ...right].sort((a, b) => a.startBeat - b.startBeat);

  let sum = 0;
  for (const e of merged) sum += e.duration;
  if (Math.abs(sum - BEATS_PER_MEASURE) > 0.01) {
    throw new Error(
      `bassBeatNotationGrouping: measure ${m.index} sum ${sum} != ${BEATS_PER_MEASURE}`
    );
  }

  m.events = merged;
}

/** Mutates bass part measures only; leaves guitar and other parts unchanged. */
export function applyBassBeatNotationGrouping(score: ScoreModel): void {
  const bass: PartModel | undefined = score.parts.find(
    (p) => p.instrumentIdentity === 'acoustic_upright_bass'
  );
  if (!bass) return;
  for (const m of bass.measures) {
    rebuildBassMeasure(m);
  }
}
