/**
 * Validate reference payloads (lightweight — no file I/O).
 */

import type { ReferenceBehaviourProfile } from './behaviourExtractionTypes';
import type { ReferencePiece } from './referencePieceTypes';

export function validateReferencePiece(piece: ReferencePiece): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (piece.totalBars < 1) errors.push('reference piece: totalBars must be >= 1');
  if (!Array.isArray(piece.sections)) errors.push('reference piece: sections required');
  if (!Array.isArray(piece.chordSegments)) errors.push('reference piece: chordSegments required');
  if (typeof piece.sourceKind !== 'string') errors.push('reference piece: sourceKind required');
  return { ok: errors.length === 0, errors };
}

export function validateReferenceBehaviourProfile(p: ReferenceBehaviourProfile): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!p.formArc) errors.push('behaviour profile: formArc required');
  if (!p.densityBand) errors.push('behaviour profile: densityBand required');
  if (typeof p.registerSpreadMidi !== 'number' || !Number.isFinite(p.registerSpreadMidi)) {
    errors.push('behaviour profile: registerSpreadMidi invalid');
  }
  return { ok: errors.length === 0, errors };
}
