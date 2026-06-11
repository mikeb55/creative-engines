/**
 * V85 Phase 3 - BH melody rhythm cell library.
 * 6 cell families: anticipate, delayed, triplet_pickup, and_of_2, long_gap, dotted.
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';

export const BEATS_PER_BAR = 4;

export type BhCellFamily =
  | 'anticipate'
  | 'delayed'
  | 'triplet_pickup'
  | 'and_of_2'
  | 'long_gap'
  | 'dotted';

export interface CellTemplate {
  family: BhCellFamily;
  /** Offset from nearest quarter-beat anchor (beats). */
  anchorOffset: number;
}

export interface BhRhythmEnrichmentMeta {
  familyCounts: Partial<Record<BhCellFamily, number>>;
  totalNotes: number;
  dominantFamily?: BhCellFamily;
  offbeatRatio?: number;
  ioiEntropy?: number;
}

const ALL_FAMILIES: BhCellFamily[] = [
  'anticipate',
  'delayed',
  'triplet_pickup',
  'and_of_2',
  'long_gap',
  'dotted',
];

/** Cell template library per family (multiple templates for intra-family variety). */
const CELL_TEMPLATES: Record<BhCellFamily, CellTemplate[]> = {
  anticipate: [
    { family: 'anticipate', anchorOffset: -0.5 },
    { family: 'anticipate', anchorOffset: -0.25 },
  ],
  delayed: [
    { family: 'delayed', anchorOffset: 0.25 },
    { family: 'delayed', anchorOffset: 0.5 },
  ],
  triplet_pickup: [
    { family: 'triplet_pickup', anchorOffset: -(1 / 3) },
    { family: 'triplet_pickup', anchorOffset: 1 / 3 },
  ],
  and_of_2: [{ family: 'and_of_2', anchorOffset: 0.5 }],
  long_gap: [
    { family: 'long_gap', anchorOffset: 0 },
    { family: 'long_gap', anchorOffset: 0.75 },
  ],
  dotted: [
    { family: 'dotted', anchorOffset: 0.25 },
    { family: 'dotted', anchorOffset: -0.25 },
  ],
};

// ---------------------------------------------------------------------------
// PRNG
// ---------------------------------------------------------------------------

/** mulberry32 seeded PRNG - returns 0..1 floats. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic per-note seed derived from generation seed and note index. */
export function deriveBhMelodyRhythmSeed(baseSeed: number, noteIndex: number): number {
  return ((baseSeed ^ (noteIndex * 2654435761)) >>> 0);
}

// ---------------------------------------------------------------------------
// Family weights
// ---------------------------------------------------------------------------

/**
 * Base weight for a cell family given profile params and phrase position.
 * indexInPhrase / phraseLength drive climax proximity weighting.
 */
export function familyWeightForPhase(
  family: BhCellFamily,
  syncopationShiftRate: number,
  anticipationBias: number,
  indexInPhrase: number,
  phraseLength: number
): number {
  const phaseNorm = phraseLength > 1 ? indexInPhrase / (phraseLength - 1) : 0.5;
  const sparse = phaseNorm < 0.28;
  const landing = phaseNorm > 0.78;
  const dense = !sparse && !landing;
  const base = {
    anticipate: 0.2 + anticipationBias * 0.5 + syncopationShiftRate * 0.15,
    delayed: 0.15 + (1 - anticipationBias) * 0.3,
    triplet_pickup: 0.1 + syncopationShiftRate * 0.2 + anticipationBias * 0.1,
    and_of_2: 0.1 + syncopationShiftRate * 0.25,
    long_gap: 0.1 + (1 - syncopationShiftRate) * 0.2,
    dotted: 0.1 + syncopationShiftRate * 0.15,
  };
  let w = base[family];
  if (sparse) {
    if (family === "long_gap") w *= 2.2;
    if (family === "triplet_pickup" || family === "and_of_2") w *= 0.55;
  } else if (dense) {
    if (family === "anticipate" || family === "and_of_2" || family === "dotted") w *= 1.5;
    if (family === "long_gap") w *= 0.6;
  } else if (landing) {
    if (family === "long_gap" || family === "delayed") w *= 1.35;
    if (family === "triplet_pickup") w *= 0.65;
  }
  return Math.max(0.05, w);
}

// ---------------------------------------------------------------------------
// Template selection
// ---------------------------------------------------------------------------

/**
 * Pick a template within a family.
 * Anti-repeat is handled at family-selection level; within a family pick uniformly.
 */
export function pickWeightedTemplate(
  family: BhCellFamily,
  _recentFamilies: BhCellFamily[],
  rand: () => number
): CellTemplate {
  const templates = CELL_TEMPLATES[family];
  return templates[Math.floor(rand() * templates.length)]!;
}

/**
 * Select a rhythm cell family for one interior note, applying:
 * - Profile-driven base weights (syncopationShiftRate, anticipationBias)
 * - Anti-repeat penalty: >28% recent-window share, or immediate repeat
 * - Triplet cap when projected offbeat rate > 72%
 */
export function selectRhythmCellForNote(
  syncopationShiftRate: number,
  anticipationBias: number,
  indexInPhrase: number,
  phraseLength: number,
  recentFamilies: BhCellFamily[],
  projectedOffbeatRate: number,
  rand: () => number
): BhCellFamily {
  const blocked = new Set<BhCellFamily>();
  if (projectedOffbeatRate > 0.72) {
    blocked.add('triplet_pickup');
    blocked.add('anticipate');
  }

  const recentCount = new Map<BhCellFamily, number>();
  for (const f of recentFamilies) {
    recentCount.set(f, (recentCount.get(f) ?? 0) + 1);
  }
  const recentTotal = Math.max(recentFamilies.length, 1);
  const lastFamily = recentFamilies.length > 0 ? recentFamilies[recentFamilies.length - 1] : undefined;

  const weights: [BhCellFamily, number][] = ALL_FAMILIES.map((f) => {
    if (blocked.has(f)) return [f, 0];
    let w = familyWeightForPhase(f, syncopationShiftRate, anticipationBias, indexInPhrase, phraseLength);
    const share = (recentCount.get(f) ?? 0) / recentTotal;
    if (share > 0.22) w *= 0.25;
    if (lastFamily === f) w *= 0.45;
    return [f, Math.max(0, w)];
  });

  const totalWeight = weights.reduce((s, [, w]) => s + w, 0);
  if (totalWeight === 0) {
    const available = ALL_FAMILIES.filter((f) => !blocked.has(f));
    return available[Math.floor(rand() * available.length)] ?? 'delayed';
  }

  let r = rand() * totalWeight;
  for (const [f, w] of weights) {
    r -= w;
    if (r <= 0) return f;
  }
  return weights[weights.length - 1]![0];
}

// ---------------------------------------------------------------------------
// Onset computation
// ---------------------------------------------------------------------------

/**
 * Compute interior onset from cell family + template.
 * 'and_of_2' always returns 2.5 regardless of current anchor.
 */
export function interiorOnsetFromCellLibrary(
  onsetBeat: number,
  family: BhCellFamily,
  template: CellTemplate
): number {
  const beat = ((onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
  const anchor = Math.round(beat);
  const newBeat = anchor + template.anchorOffset;
  if (newBeat < 0) return Math.max(0, BEATS_PER_BAR + newBeat);
  return Math.max(0, Math.min(BEATS_PER_BAR - 0.25, newBeat));
}

// ---------------------------------------------------------------------------
// Collision resolution
// ---------------------------------------------------------------------------

const GAP_CANDIDATES = [0.25, 1 / 3, 0.5, 0.67, 0.75];

/**
 * Smart collision resolution using gap candidates [0.25, 1/3, 0.5, 0.67, 0.75].
 */
export function resolveBhMelodyOnsetCollisionsSmart(
  notes: readonly ImportMelodyNote[]
): ImportMelodyNote[] {
  const out: ImportMelodyNote[] = [];
  const lastOnsetByBar = new Map<number, number>();
  const allSlots = [0, 0.25, 1 / 3, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75];

  for (const note of notes) {
    let onsetBeat = note.onsetBeat;
    const prev = lastOnsetByBar.get(note.bar);
    if (prev != null && onsetBeat <= prev + 0.2) {
      let resolved = false;
      for (const gap of GAP_CANDIDATES) {
        const candidate = prev + gap;
        if (candidate <= BEATS_PER_BAR - 0.25) {
          onsetBeat = candidate;
          resolved = true;
          break;
        }
      }
      if (!resolved) {
        for (const slot of allSlots) {
          if (slot > prev + 0.2) {
            onsetBeat = slot;
            resolved = true;
            break;
          }
        }
      }
      if (!resolved) onsetBeat = Math.min(BEATS_PER_BAR - 0.25, prev + 0.25);
    }
    lastOnsetByBar.set(note.bar, onsetBeat);
    out.push({ ...note, onsetBeat });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Phase 3 metrics
// ---------------------------------------------------------------------------

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