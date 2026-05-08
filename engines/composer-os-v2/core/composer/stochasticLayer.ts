/**
 * Phase 8 — Controlled stochastic layer (bar-level sampling; form arc stays deterministic upstream).
 */

import {
  RHYTHM_DNA_CELL_TABLE,
  type RhythmDnaCellId,
} from './rhythmDnaMotifBinder';

export interface StochasticConfig {
  enabled: boolean;
  varianceLevel: number;
  fixedElements: 'form' | 'motif-identity' | 'section-roles' | 'tension-arc';
}

export const DEFAULT_STOCHASTIC_CONFIG: StochasticConfig = {
  enabled: false,
  varianceLevel: 0,
  fixedElements: 'form',
};

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function seededUnit(seed: number, barIndex: number, salt: number, renderOrdinal: number): number {
  const x = Math.sin(seed * 0.001 + barIndex * 3.7 + salt * 11.13 + renderOrdinal * 79.123) * 10000;
  return x - Math.floor(x);
}

/** Top-N pool size from variance (3 … 8). */
export function chordPoolTopN(stochasticVariance: number): number {
  return 3 + Math.floor(clamp01(stochasticVariance) * 5);
}

/** Generic weighted sample: top-N by ascending cost, inverse-cost weights when variance > 0. */
export function weightedChordSample<T extends { cost: number }>(
  candidates: T[],
  stochasticVariance: number,
  seed: number,
  barIndex: number,
  renderOrdinal: number
): T | undefined {
  if (candidates.length === 0) return undefined;
  const sorted = [...candidates].sort((a, b) => a.cost - b.cost);
  const n = Math.min(sorted.length, chordPoolTopN(stochasticVariance));
  const pool = sorted.slice(0, Math.max(1, n));
  if (stochasticVariance <= 0) {
    return pool[0];
  }
  const weights = pool.map((c) => 1 / (0.01 + c.cost));
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = seededUnit(seed, barIndex, 901, renderOrdinal) * sum;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Inverse-energy cost so lower cost = higher rhythmic preference (matches prior “best energy” shout pick). */
export function rhythmCellCostForId(cellId: string): number {
  const m = RHYTHM_DNA_CELL_TABLE[cellId as RhythmDnaCellId];
  if (!m) return 1;
  return 1 - m.energy * 0.85;
}

/** Weighted sample over allowed RhythmDNA ids using inverse-energy costs. */
export function weightedRhythmSample(
  allowedCellIds: string[],
  stochasticVariance: number,
  seed: number,
  barIndex: number,
  renderOrdinal: number
): string {
  if (allowedCellIds.length === 0) return '';
  const rows = allowedCellIds.map((id) => ({ id, cost: rhythmCellCostForId(id) }));
  const picked = weightedChordSample(rows, stochasticVariance, seed, barIndex, renderOrdinal);
  return picked?.id ?? allowedCellIds[0]!;
}

/** Weighted pick from top candidates by inverse cost; deterministic when varianceLevel = 0. */
export function sampleChordSymbolFromCandidates(
  candidates: Array<{ symbol: string; cost: number }>,
  varianceLevel: number,
  seed: number,
  barIndex: number,
  renderOrdinal: number
): string {
  if (candidates.length === 0) return '';
  const picked = weightedChordSample(candidates, varianceLevel, seed, barIndex, renderOrdinal);
  return picked?.symbol ?? '';
}

/** Rhythm cell pool — weighted sample from allowed ids (deterministic best-cost when variance ≤ 0). */
export function sampleRhythmCellId(
  allowedIds: string[],
  varianceLevel: number,
  seed: number,
  barIndex: number,
  renderOrdinal: number
): string {
  return weightedRhythmSample(allowedIds, varianceLevel, seed, barIndex, renderOrdinal);
}

/** Motif recall: secondary motif allowed when variance > 0.5 and roll under 0.2. */
export function shouldUseSecondaryMotifRecall(varianceLevel: number, seed: number, barIndex: number): boolean {
  if (varianceLevel <= 0.5) return false;
  return seededUnit(seed, barIndex, 707, 0) < 0.2;
}

export function sequenceChordChoicesForBars(
  candidatesPerBar: Array<Array<{ symbol: string; cost: number }>>,
  varianceLevel: number,
  seed: number,
  renderOrdinal: number
): string[] {
  return candidatesPerBar.map((pool, barIndex) =>
    sampleChordSymbolFromCandidates(pool, varianceLevel, seed, barIndex, renderOrdinal)
  );
}

/** Form / section labels stay fixed regardless of stochastic variance (deterministic arc). */
export function fixedFormSectionLabels<T extends { label: string }>(sections: T[]): string[] {
  return sections.map((s) => s.label);
}
