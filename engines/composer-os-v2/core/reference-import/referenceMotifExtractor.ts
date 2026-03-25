/**
 * Short contour sample from note samples (behavioural, not motif tracker clone).
 */

import type { ReferencePiece } from './referencePieceTypes';

export function extractMotifContourSample(piece: ReferencePiece, maxIntervals = 8): number[] {
  const notes = piece.noteSamples.slice(0, 32).map((n) => n.midi);
  if (notes.length < 2) return [];
  const out: number[] = [];
  for (let i = 1; i < Math.min(notes.length, maxIntervals + 1); i++) {
    out.push(notes[i] - notes[i - 1]);
  }
  return out;
}
