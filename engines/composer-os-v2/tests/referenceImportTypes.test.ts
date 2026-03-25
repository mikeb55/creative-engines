/**
 * Reference import types + validation.
 */

import { validateReferenceBehaviourProfile, validateReferencePiece } from '../core/reference-import/referenceImportValidation';
import type { ReferencePiece } from '../core/reference-import/referencePieceTypes';

function minimalPiece(over?: Partial<ReferencePiece>): ReferencePiece {
  return {
    sourceKind: 'musicxml',
    totalBars: 4,
    sections: [{ label: 'A', startBar: 1, barCount: 4 }],
    chordSegments: [],
    rehearsalMarks: [],
    pitchByPart: {},
    noteSamples: [],
    harmonicRhythmBars: 0,
    warnings: [],
    partial: false,
    ...over,
  };
}

export function runReferenceImportTypesTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok: validateReferencePiece(minimalPiece()).ok,
    name: 'validateReferencePiece accepts minimal piece',
  });

  out.push({
    ok: !validateReferencePiece(minimalPiece({ totalBars: 0 })).ok,
    name: 'negative: totalBars < 1',
  });

  out.push({
    ok: validateReferenceBehaviourProfile({
      formArc: 'stable',
      densityBand: 'medium',
      registerSpreadMidi: 12,
      harmonicRhythmBars: 1,
      motifContourSample: [2, -1],
      cadenceDensity: 0.3,
      warnings: [],
    }).ok,
    name: 'validateReferenceBehaviourProfile accepts profile',
  });

  out.push({
    ok: !validateReferenceBehaviourProfile({
      formArc: 'unknown',
      densityBand: 'medium',
      registerSpreadMidi: NaN,
      harmonicRhythmBars: 0,
      motifContourSample: [],
      cadenceDensity: 0,
      warnings: [],
    }).ok,
    name: 'negative: invalid register spread',
  });

  return out;
}
