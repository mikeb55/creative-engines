/**
 * Long-form Duo motif continuity — 16/32 bars built from the 8-bar LOCK grammar with section variation.
 */

import type { BaseMotif, PlacedMotif } from './motifTypes';
import { placeMotifAtBar } from './motifTracker';

function placeMotifsLongFormDuoCycles(
  motifs: BaseMotif[],
  seed: number,
  cycleCount: 2 | 4
): PlacedMotif[] {
  if (motifs.length < 1) return [];
  const m = motifs[0];
  const placements: PlacedMotif[] = [];
  const r = (n: number) => ((seed + n) % 5) - 2;
  const phase = (seed % 11) / 20;
  const identityShift = Math.max(-7, Math.min(7, r(11) + ((seed % 5) - 2) * 2));

  const cycle = (barOffset: number, transpose: number) => {
    placements.push(placeMotifAtBar(m, barOffset + 1, 'original', transpose, 0));
    placements.push(placeMotifAtBar(m, barOffset + 2, 'rhythm_shift', transpose, 0.25 + phase * 0.25));
    placements.push(placeMotifAtBar(m, barOffset + 3, 'transposed', r(1) + transpose, 0));
    placements.push(placeMotifAtBar(m, barOffset + 4, 'transposed', r(2) + transpose, 0.5));
    placements.push(placeMotifAtBar(m, barOffset + 5, 'original', transpose, 0));
    placements.push(placeMotifAtBar(m, barOffset + 6, 'transposed', identityShift + transpose, 0.75));
    placements.push(placeMotifAtBar(m, barOffset + 7, 'inversion_lite', r(4) + transpose, 0.25));
    placements.push(placeMotifAtBar(m, barOffset + 8, 'rhythm_shift', transpose, ((seed * 3) % 4) * 0.25));
  };

  const transposes = [0, 1, 5 + (seed % 3), 0];
  for (let c = 0; c < cycleCount; c++) {
    cycle(c * 8, transposes[c] ?? 0);
  }

  return placements;
}

/**
 * Places primary motif across four 8-bar cycles: A (LOCK baseline), A' (+colour), B (+contrast transpose), A'' (return + peak).
 */
export function placeMotifsLongFormDuo32(motifs: BaseMotif[], seed: number): PlacedMotif[] {
  return placeMotifsLongFormDuoCycles(motifs, seed, 4);
}

/** 16-bar long-form: first two 8-bar cycles only. */
export function placeMotifsLongFormDuo16(motifs: BaseMotif[], seed: number): PlacedMotif[] {
  return placeMotifsLongFormDuoCycles(motifs, seed, 2);
}

export function placeMotifsLongFormDuo(motifs: BaseMotif[], seed: number, totalBars: number): PlacedMotif[] {
  if (totalBars === 32) return placeMotifsLongFormDuo32(motifs, seed);
  if (totalBars === 16) return placeMotifsLongFormDuo16(motifs, seed);
  return placeMotifsLongFormDuo32(motifs, seed);
}
