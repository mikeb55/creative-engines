/**
 * String quartet — parallel fifth / octave avoidance on consecutive-bar slices.
 */

import { snapMidiToRange } from '../voicing/ensembleHarmonyUtils';
import { QUARTET_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import type { MeasureModel, NoteEvent, PartModel } from '../score-model/scoreModelTypes';
import { SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC } from './stringQuartetTypes';

const QUARTET_PART_IDS_ORDER = [SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC] as const;

/** V1 / V2 / Va / Vc — one representative pitch per bar for voice-leading checks. */
export interface QuartetBar {
  barIndex: number;
  midiByPart: [number | undefined, number | undefined, number | undefined, number | undefined];
}

const PAIRS: readonly [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

function intervalClassSemis(a: number, b: number): number {
  return Math.abs(a - b) % 12;
}

function isSimilarMotion(dUpper: number, dLower: number): boolean {
  if (dUpper === 0 || dLower === 0) return false;
  return dUpper * dLower > 0;
}

function violatesParallelFifths(
  hi0: number,
  lo0: number,
  hi1: number,
  lo1: number
): boolean {
  if (intervalClassSemis(hi0, lo0) !== 7 || intervalClassSemis(hi1, lo1) !== 7) return false;
  return isSimilarMotion(hi1 - hi0, lo1 - lo0);
}

function violatesParallelOctaves(hi0: number, lo0: number, hi1: number, lo1: number): boolean {
  if (intervalClassSemis(hi0, lo0) !== 0 || intervalClassSemis(hi1, lo1) !== 0) return false;
  return isSimilarMotion(hi1 - hi0, lo1 - lo0);
}

function violatesPair(hi0: number, lo0: number, hi1: number, lo1: number): boolean {
  return violatesParallelFifths(hi0, lo0, hi1, lo1) || violatesParallelOctaves(hi0, lo0, hi1, lo1);
}

/** True if any consecutive-bar pair still has similar-motion parallel fifths or octaves/unisons. */
export function quartetBarsHaveParallelMotionViolation(bars: QuartetBar[]): boolean {
  if (bars.length < 2) return false;
  for (let bi = 0; bi < bars.length - 1; bi++) {
    const b0 = bars[bi]!;
    const b1 = bars[bi + 1]!;
    for (const [upperIdx, lowerIdx] of PAIRS) {
      const hi0 = b0.midiByPart[upperIdx];
      const lo0 = b0.midiByPart[lowerIdx];
      const hi1 = b1.midiByPart[upperIdx];
      const lo1 = b1.midiByPart[lowerIdx];
      if (hi0 === undefined || lo0 === undefined || hi1 === undefined || lo1 === undefined) continue;
      if (violatesPair(hi0, lo0, hi1, lo1)) return true;
    }
  }
  return false;
}

/** First pitched note in beat order (same heuristic as layout snapshots). */
export function representativeMidiFromMeasure(m: MeasureModel): number | undefined {
  const notes: NoteEvent[] = [];
  for (const ev of m.events) {
    if (ev.kind === 'note') notes.push(ev as NoteEvent);
  }
  if (notes.length === 0) return undefined;
  notes.sort((a, b) => a.startBeat - b.startBeat);
  return Math.round(notes[0]!.pitch);
}

export function extractQuartetBarsFromStringParts(parts: PartModel[], totalBars: number): QuartetBar[] {
  const out: QuartetBar[] = [];
  for (let bar = 1; bar <= totalBars; bar++) {
    const midiByPart: [
      number | undefined,
      number | undefined,
      number | undefined,
      number | undefined,
    ] = [undefined, undefined, undefined, undefined];
    for (let p = 0; p < 4; p++) {
      const part = parts[p];
      if (!part) continue;
      const meas = part.measures[bar - 1];
      if (!meas) continue;
      midiByPart[p] = representativeMidiFromMeasure(meas);
    }
    out.push({ barIndex: bar, midiByPart });
  }
  return out;
}

function boundsForPartIndex(idx: number): readonly [number, number] {
  const id = QUARTET_PART_IDS_ORDER[idx]!;
  return QUARTET_MIDI_BOUNDS[id]!;
}

/**
 * Nudge the upper voice of the pair by ±1 semitone (chromatic step), clamped to part bounds.
 */
/**
 * Detect parallel fifths / octaves between consecutive bars for each part pair; fix by displacing
 * the higher-register part (smaller index in V1…Vc ordering) by one chromatic step.
 */
export function detectAndFixParallelMotion(bars: QuartetBar[]): void {
  if (bars.length < 2) return;
  const maxPasses = 6;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    for (let bi = 0; bi < bars.length - 1; bi++) {
      const b0 = bars[bi]!;
      const b1 = bars[bi + 1]!;
      for (const [upperIdx, lowerIdx] of PAIRS) {
        const hi0 = b0.midiByPart[upperIdx];
        const lo0 = b0.midiByPart[lowerIdx];
        const hi1 = b1.midiByPart[upperIdx];
        const lo1 = b1.midiByPart[lowerIdx];
        if (
          hi0 === undefined ||
          lo0 === undefined ||
          hi1 === undefined ||
          lo1 === undefined
        ) {
          continue;
        }
        if (!violatesPair(hi0, lo0, hi1, lo1)) continue;

        const tryDirs = [1, -1] as const;
        for (const dir of tryDirs) {
          const [ulo, uhi] = boundsForPartIndex(upperIdx);
          const adjHi = snapMidiToRange(hi1 + dir, ulo, uhi);
          if (!violatesPair(hi0, lo0, adjHi, lo1)) {
            b1.midiByPart[upperIdx] = adjHi;
            changed = true;
            break;
          }
        }
      }
    }
    if (!changed) break;
  }
}

function shiftAllPitchedNotesInMeasure(m: MeasureModel, delta: number, lo: number, hi: number): void {
  if (delta === 0) return;
  for (const ev of m.events) {
    if (ev.kind !== 'note') continue;
    const n = ev as NoteEvent;
    n.pitch = snapMidiToRange(Math.round(n.pitch + delta), lo, hi);
    if (n.pitches?.length) {
      n.pitches = n.pitches.map((p) => snapMidiToRange(Math.round(p + delta), lo, hi));
    }
  }
}

/** Apply per-bar per-part deltas from representative alignment to all notes in each string measure. */
export function applyQuartetParallelFixesToStringParts(
  stringParts: PartModel[],
  before: QuartetBar[],
  after: QuartetBar[]
): void {
  if (before.length !== after.length) return;
  for (let i = 0; i < before.length; i++) {
    const a0 = before[i]!;
    const a1 = after[i]!;
    for (let p = 0; p < 4; p++) {
      const prev = a0.midiByPart[p];
      const next = a1.midiByPart[p];
      if (prev === undefined || next === undefined) continue;
      const delta = next - prev;
      if (delta === 0) continue;
      const part = stringParts[p];
      const meas = part?.measures[a1.barIndex - 1];
      if (!meas) continue;
      const [lo, hi] = boundsForPartIndex(p);
      shiftAllPitchedNotesInMeasure(meas, delta, lo, hi);
    }
  }
}

export function runQuartetParallelMotionPass(stringParts: PartModel[], totalBars: number): void {
  const before = extractQuartetBarsFromStringParts(stringParts, totalBars);
  const after: QuartetBar[] = before.map((b) => ({
    barIndex: b.barIndex,
    midiByPart: [...b.midiByPart] as QuartetBar['midiByPart'],
  }));
  detectAndFixParallelMotion(after);
  applyQuartetParallelFixesToStringParts(stringParts, before, after);
}
