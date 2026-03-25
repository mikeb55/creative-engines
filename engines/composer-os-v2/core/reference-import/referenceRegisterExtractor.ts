/**
 * Register spread from pitch summaries / samples.
 */

import type { ReferencePiece } from './referencePieceTypes';

export function extractRegisterSpreadMidi(piece: ReferencePiece): number {
  const keys = Object.keys(piece.pitchByPart);
  if (keys.length > 0) {
    let maxSpread = 0;
    for (const k of keys) {
      const p = piece.pitchByPart[k];
      maxSpread = Math.max(maxSpread, p.maxMidi - p.minMidi);
    }
    if (maxSpread > 0) return maxSpread;
  }
  const notes = piece.noteSamples.map((n) => n.midi);
  if (notes.length === 0) return 12;
  const min = Math.min(...notes);
  const max = Math.max(...notes);
  return Math.max(1, max - min);
}
