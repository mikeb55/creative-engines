/**
 * Melody V2 — motivic recall: extract from opening phrase, vary on later phrase slots.
 */

import type { MeasureModel, NoteEvent, PartModel } from '../score-model/scoreModelTypes';
import { guitarChordTonesInRange } from './guitarPhraseAuthority';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';

export interface MelodicMotif {
  intervals: number[];
  rhythmicShape: number[];
  sourceBar: number;
}

export interface GoldenPathBarSlice {
  bar: number;
  pitches: number[];
  durations: number[];
}

function voice1NotesInMeasure(m: MeasureModel): NoteEvent[] {
  return m.events
    .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat);
}

export function goldenPathBarsFromGuitarPart(
  guitar: PartModel,
  barRange: [number, number],
): GoldenPathBarSlice[] {
  const [lo, hi] = barRange;
  const out: GoldenPathBarSlice[] = [];
  for (const m of guitar.measures) {
    if (m.index < lo || m.index > hi) continue;
    const notes = voice1NotesInMeasure(m);
    out.push({
      bar: m.index,
      pitches: notes.map((n) => n.pitch),
      durations: notes.map((n) => n.duration),
    });
  }
  return out.sort((a, b) => a.bar - b.bar);
}

/** Extract 2–3 note interval pattern from guitar v1 in bar range (prefers one leap). */
export function extractMelodicMotif(
  bars: readonly GoldenPathBarSlice[],
  barRange: [number, number],
): MelodicMotif | undefined {
  const pitches: number[] = [];
  const durs: number[] = [];
  for (const row of bars) {
    if (row.bar < barRange[0] || row.bar > barRange[1]) continue;
    pitches.push(...row.pitches);
    durs.push(...row.durations);
  }
  if (pitches.length < 2) return undefined;

  let bestStart = 0;
  let bestScore = -1;
  for (let i = 0; i <= pitches.length - 2; i++) {
    const span = Math.min(3, pitches.length - i);
    if (span < 2) continue;
    const ints: number[] = [];
    for (let j = 0; j < span - 1; j++) {
      ints.push(pitches[i + j + 1]! - pitches[i + j]!);
    }
    const hasLeap = ints.some((x) => Math.abs(x) >= 3);
    const stepOnly = ints.every((x) => Math.abs(x) <= 2);
    const score = (hasLeap ? 3 : 0) + (stepOnly ? 0 : 1) + span;
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  const take = Math.min(3, pitches.length - bestStart);
  const sliceP = pitches.slice(bestStart, bestStart + take);
  const sliceD = durs.slice(bestStart, bestStart + take);
  const intervals: number[] = [];
  for (let i = 1; i < sliceP.length; i++) {
    intervals.push(sliceP[i]! - sliceP[i - 1]!);
  }
  if (intervals.length === 0) return undefined;
  return {
    intervals,
    rhythmicShape: sliceD.length ? sliceD : [1],
    sourceBar: barRange[0],
  };
}

function nearestChordTone(pitch: number, chord: string, low: number, high: number): number {
  const pool = guitarChordTonesInRange(chord, low, high);
  const candidates = [pool.root, pool.third, pool.fifth, pool.seventh].map((x) => Math.round(x));
  let best = pitch;
  let bd = 99;
  for (const c of candidates) {
    const cc = clampPitch(c, low, high);
    const d = Math.abs(cc - pitch);
    if (d < bd) {
      bd = d;
      best = cc;
    }
  }
  return best;
}

export function applyMotifVariation(
  motif: MelodicMotif,
  variationType: 'inversion' | 'augmentation' | 'transposition' | 'retrograde',
  startPitch: number,
  chordSymbol: string,
  effectiveLow: number,
  effectiveHigh: number,
): number[] {
  let intervals = [...motif.intervals];
  if (variationType === 'inversion') intervals = intervals.map((x) => -x);
  if (variationType === 'retrograde') intervals = [...intervals].reverse();

  const pitches: number[] = [clampPitch(startPitch, effectiveLow, effectiveHigh)];
  for (const iv of intervals) {
    let next = pitches[pitches.length - 1]! + iv;
    if (variationType === 'transposition') {
      next = nearestChordTone(next, chordSymbol, effectiveLow, effectiveHigh);
    }
    pitches.push(clampPitch(next, effectiveLow, effectiveHigh));
  }
  return pitches;
}

const MOTIF_RECALL_BARS: readonly [number, number][] = [
  [9, 12],
  [17, 20],
  [25, 28],
];

const VARIATION_TYPES = ['transposition', 'inversion', 'augmentation', 'retrograde'] as const;

export function motifVariationTypeForPhraseSlot(phraseSlot: number, seed: number): (typeof VARIATION_TYPES)[number] {
  const idx = (phraseSlot + Math.abs(seed) % 97) % VARIATION_TYPES.length;
  return VARIATION_TYPES[idx]!;
}

export function applyMotifRecallSeedToMeasure(
  m: MeasureModel,
  motif: MelodicMotif,
  variationType: (typeof VARIATION_TYPES)[number],
  chordSymbol: string,
  effectiveLow: number,
  effectiveHigh: number,
  seed: number,
  bar: number,
  seedWeight = 0.5,
): void {
  const notes = voice1NotesInMeasure(m);
  if (notes.length === 0) return;
  const startPitch = notes[0]!.pitch;
  const targetPitches = applyMotifVariation(
    motif,
    variationType,
    startPitch,
    chordSymbol,
    effectiveLow,
    effectiveHigh,
  );
  if (targetPitches.length === 0) return;
  const u = seededUnit(seed, bar, 72001);
  if (u > seedWeight) return;
  const proposed = targetPitches[0]!;
  if (proposed < effectiveLow || proposed > effectiveHigh) return;
  const idx = m.events.findIndex((e) => e.kind === 'note' && (e as NoteEvent).voice === 1);
  if (idx < 0) return;
  const ev = m.events[idx] as NoteEvent;
  m.events[idx] = { ...ev, pitch: proposed };
}

export function extractMotifFromGuitarPart(guitar: PartModel): MelodicMotif | undefined {
  return extractMelodicMotif(goldenPathBarsFromGuitarPart(guitar, [1, 4]), [1, 4]);
}

export function shouldApplyMotifRecallAtBar(bar: number): boolean {
  return MOTIF_RECALL_BARS.some(([lo, hi]) => bar >= lo && bar <= hi);
}

export function motifPhraseSlotForBar(bar: number): number {
  if (bar >= 25) return 3;
  if (bar >= 17) return 2;
  if (bar >= 9) return 1;
  return 0;
}
