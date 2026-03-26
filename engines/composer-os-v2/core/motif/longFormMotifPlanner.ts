/**
 * Long-form Duo motif continuity — 32 bars built from the 8-bar LOCK grammar with section variation.
 */

import type { BaseMotif, PlacedMotif } from './motifTypes';
import { placeMotifAtBar } from './motifTracker';

/**
 * Places primary motif across four 8-bar cycles: A (LOCK baseline), A' (+colour), B (+contrast transpose), A'' (return + peak).
 */
export function placeMotifsLongFormDuo32(motifs: BaseMotif[], seed: number): PlacedMotif[] {
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

  cycle(0, 0);
  cycle(8, 1);
  cycle(16, 5 + (seed % 3));
  cycle(24, 0);

  return placements;
}
