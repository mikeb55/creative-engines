/**
 * Shared premium-melody rhythm cell library.
 * 6 cell families: anticipate, delayed, triplet_pickup, and_of_2, long_gap, dotted.
 */

export const BEATS_PER_BAR = 4;

export type PremiumMelodyCellFamily =
  | 'anticipate'
  | 'delayed'
  | 'triplet_pickup'
  | 'and_of_2'
  | 'long_gap'
  | 'dotted';

export interface PremiumMelodyCellTemplate {
  family: PremiumMelodyCellFamily;
  /** Offset from nearest quarter-beat anchor (beats). */
  anchorOffset: number;
}

export interface PremiumMelodyRhythmEnrichmentMeta {
  familyCounts: Partial<Record<PremiumMelodyCellFamily, number>>;
  totalNotes: number;
  dominantFamily?: PremiumMelodyCellFamily;
  offbeatRatio?: number;
  ioiEntropy?: number;
}

const ALL_FAMILIES: PremiumMelodyCellFamily[] = [
  'anticipate',
  'delayed',
  'triplet_pickup',
  'and_of_2',
  'long_gap',
  'dotted',
];

/** Cell template library per family (multiple templates for intra-family variety). */
const CELL_TEMPLATES: Record<PremiumMelodyCellFamily, PremiumMelodyCellTemplate[]> = {
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

/**
 * Base weight for a cell family given profile params and phrase position.
 * indexInPhrase / phraseLength drive climax proximity weighting.
 */
export function familyWeightForPhase(
  family: PremiumMelodyCellFamily,
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

/**
 * Pick a template within a family.
 * Anti-repeat is handled at family-selection level; within a family pick uniformly.
 */
export function pickWeightedTemplate(
  family: PremiumMelodyCellFamily,
  _recentFamilies: PremiumMelodyCellFamily[],
  rand: () => number
): PremiumMelodyCellTemplate {
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
  recentFamilies: PremiumMelodyCellFamily[],
  projectedOffbeatRate: number,
  rand: () => number,
  projectedOffbeatBlockThreshold = 0.72
): PremiumMelodyCellFamily {
  const blocked = new Set<PremiumMelodyCellFamily>();
  if (projectedOffbeatRate > projectedOffbeatBlockThreshold) {
    blocked.add('triplet_pickup');
    blocked.add('anticipate');
  }

  const recentCount = new Map<PremiumMelodyCellFamily, number>();
  for (const f of recentFamilies) {
    recentCount.set(f, (recentCount.get(f) ?? 0) + 1);
  }
  const recentTotal = Math.max(recentFamilies.length, 1);
  const lastFamily = recentFamilies.length > 0 ? recentFamilies[recentFamilies.length - 1] : undefined;

  const weights: [PremiumMelodyCellFamily, number][] = ALL_FAMILIES.map((f) => {
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

/**
 * Compute interior onset from cell family + template.
 * 'and_of_2' always returns 2.5 regardless of current anchor.
 */
export function interiorOnsetFromCellLibrary(
  onsetBeat: number,
  family: PremiumMelodyCellFamily,
  template: PremiumMelodyCellTemplate
): number {
  const beat = ((onsetBeat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR;
  const anchor = Math.round(beat);
  const newBeat = anchor + template.anchorOffset;
  if (newBeat < 0) return Math.max(0, BEATS_PER_BAR + newBeat);
  return Math.max(0, Math.min(BEATS_PER_BAR - 0.25, newBeat));
}
