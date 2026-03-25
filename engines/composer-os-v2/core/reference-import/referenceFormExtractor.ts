/**
 * Section / form heuristics from ReferencePiece.
 */

import type { ReferenceFormArc } from './behaviourExtractionTypes';
import type { ReferencePiece } from './referencePieceTypes';

export function extractFormArc(piece: ReferencePiece): ReferenceFormArc {
  if (piece.sections.length >= 4) return 'sectional';
  if (piece.rehearsalMarks.length >= 3) return 'sectional';
  if (piece.sections.length <= 1 && piece.totalBars <= 12) return 'stable';
  if (piece.sections.length <= 1) return 'through_composed';
  return 'sectional';
}
