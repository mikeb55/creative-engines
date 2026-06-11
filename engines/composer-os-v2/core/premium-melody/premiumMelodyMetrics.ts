import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import { BEATS_PER_BAR } from './premiumMelodyCellLibrary';
import {
  detectPhraseRoles,
  isPremiumMelodyStrongBeat,
  isStructuralLandingIndex,
} from './premiumMelodyPhrase';

/** 0-1 fraction of notes in the dominant onset-class bucket (16th-quantized). */
export function onsetClassDominance(melody: readonly ImportMelodyNote[]): number {
  if (melody.length === 0) return 0;
  const buckets = new Map<number, number>();
  for (const n of melody) {
    const beat = ((n.onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
    const bucket = Math.round(beat * 4) / 4;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  return Math.max(...buckets.values()) / melody.length;
}

/** Shannon entropy of IOI distribution (16th-quantized). */
export function melodyIoiEntropy(melody: readonly ImportMelodyNote[]): number {
  const sorted = [...melody].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  if (sorted.length < 2) return 0;
  const counts = new Map<number, number>();
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    const ioi =
      (sorted[i]!.bar - sorted[i - 1]!.bar) * BEATS_PER_BAR +
      (sorted[i]!.onsetBeat - sorted[i - 1]!.onsetBeat);
    const bucket = Math.round(ioi * 4) / 4;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    total++;
  }
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}

/** Count of distinct duration 3-grams (16th-quantized durations). */
export function durationTrigramDiversity(melody: readonly ImportMelodyNote[]): number {
  const sorted = [...melody].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  if (sorted.length < 3) return 0;
  const trigrams = new Set<string>();
  for (let i = 0; i < sorted.length - 2; i++) {
    const d0 = Math.round(sorted[i]!.durationBeats * 4) / 4;
    const d1 = Math.round(sorted[i + 1]!.durationBeats * 4) / 4;
    const d2 = Math.round(sorted[i + 2]!.durationBeats * 4) / 4;
    trigrams.add(`${d0}-${d1}-${d2}`);
  }
  return trigrams.size;
}

/**
 * True if note density (notes/bar) shows arc shape:
 * peak, valley, rise, or fall in density structure.
 */
export function phraseDensityArcPresent(melody: readonly ImportMelodyNote[]): boolean {
  if (melody.length < 6) return true;
  const sorted = [...melody].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  const abs = (n: ImportMelodyNote) => n.bar * BEATS_PER_BAR + n.onsetBeat;
  const t0 = abs(sorted[0]!);
  const tEnd = abs(sorted[sorted.length - 1]!);
  const span = tEnd - t0;
  if (span <= 0) return true;
  const third = span / 3;
  const zone = [0, 0, 0];
  const zoneTotal = [0, 0, 0];
  const off = (n: ImportMelodyNote) => Math.abs(n.onsetBeat - Math.round(n.onsetBeat)) > 0.11;
  for (const n of sorted) {
    const t = abs(n) - t0;
    const z = t < third ? 0 : t < 2 * third ? 1 : 2;
    zoneTotal[z]! += 1;
    if (off(n)) zone[z]! += 1;
  }
  const rate = (z: number) => (zoneTotal[z]! > 0 ? zone[z]! / zoneTotal[z]! : 0);
  const r0 = rate(0);
  const r1 = rate(1);
  const r2 = rate(2);
  return r0 < r1 && r2 <= r1;
}

/** 0-1 - attacks off the quarter grid (beats 0/1/2/3). */
export function melodySyncopationScore(melody: readonly ImportMelodyNote[]): number {
  if (melody.length === 0) return 0;
  let offGrid = 0;
  for (const n of melody) {
    const beat = ((n.onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
    const onQuarter =
      Math.abs(beat) < 0.05 ||
      Math.abs(beat - 1) < 0.05 ||
      Math.abs(beat - 2) < 0.05 ||
      Math.abs(beat - 3) < 0.05;
    if (!onQuarter) offGrid++;
  }
  return offGrid / melody.length;
}

/** Fraction of attacks on non-integer beats (offbeat ratio). */
export function melodyOffbeatRatio(melody: readonly ImportMelodyNote[]): number {
  if (melody.length === 0) return 0;
  let offbeat = 0;
  for (const n of melody) {
    if (Math.abs(n.onsetBeat - Math.round(n.onsetBeat)) > 0.11) offbeat++;
  }
  return offbeat / melody.length;
}

/** At least one melody attack on beat 1 or 3 at a phrase start or cadence. */
export function melodyStructuralLandingCount(melody: readonly ImportMelodyNote[]): number {
  if (melody.length === 0) return 0;
  const ordered = [...melody].sort(
    (a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch
  );
  const roles = detectPhraseRoles(ordered);
  let count = 0;
  for (let i = 0; i < ordered.length; i++) {
    if (!isStructuralLandingIndex(i, roles)) continue;
    if (isPremiumMelodyStrongBeat(ordered[i]!.onsetBeat)) count++;
  }
  return count;
}

/** Distinct IOI buckets (16th-quantized) across consecutive attacks. */
export function distinctMelodyIoiBuckets(melody: readonly ImportMelodyNote[]): number {
  const sorted = [...melody].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  const buckets = new Set<number>();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    const ioi = (curr.bar - prev.bar) * BEATS_PER_BAR + (curr.onsetBeat - prev.onsetBeat);
    buckets.add(Math.round(ioi * 4) / 4);
  }
  return buckets.size;
}
