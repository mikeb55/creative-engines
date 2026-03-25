/**
 * Combine extractors → ReferenceBehaviourProfile.
 */

import type { ReferenceBehaviourProfile } from './behaviourExtractionTypes';
import { extractFormArc } from './referenceFormExtractor';
import { extractDensityBand } from './referenceDensityExtractor';
import { extractRegisterSpreadMidi } from './referenceRegisterExtractor';
import { extractMotifContourSample } from './referenceMotifExtractor';
import type { ReferencePiece } from './referencePieceTypes';

function cadenceDensityHint(piece: ReferencePiece): number {
  const ch = piece.chordSegments.length;
  const bars = piece.totalBars;
  if (bars <= 0 || ch <= 0) return 0;
  return Math.min(1, ch / bars);
}

export function extractReferenceBehaviour(piece: ReferencePiece): ReferenceBehaviourProfile {
  const warnings = [...piece.warnings];
  return {
    formArc: extractFormArc(piece),
    densityBand: extractDensityBand(piece),
    registerSpreadMidi: extractRegisterSpreadMidi(piece),
    harmonicRhythmBars: piece.harmonicRhythmBars,
    motifContourSample: extractMotifContourSample(piece),
    cadenceDensity: cadenceDensityHint(piece),
    warnings,
  };
}
