/**
 * Rough density from note samples per bar (not pitch rewriting).
 */

import type { ReferenceDensityBand } from './behaviourExtractionTypes';
import type { ReferencePiece } from './referencePieceTypes';

export function extractDensityBand(piece: ReferencePiece): ReferenceDensityBand {
  if (piece.totalBars < 1) return 'medium';
  if (piece.noteSamples.length === 0 && piece.chordSegments.length > 0) return 'medium';
  const counts = new Map<number, number>();
  for (const n of piece.noteSamples) {
    counts.set(n.barApprox, (counts.get(n.barApprox) ?? 0) + 1);
  }
  let sum = 0;
  let nBars = 0;
  for (let b = 1; b <= piece.totalBars; b++) {
    sum += counts.get(b) ?? 0;
    nBars++;
  }
  const avg = nBars > 0 ? sum / nBars : 0;
  if (avg < 1.5) return 'sparse';
  if (avg > 6) return 'dense';
  return 'medium';
}
