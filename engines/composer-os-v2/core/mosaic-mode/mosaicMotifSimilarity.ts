/**
 * Mosaic Mode — pairwise section motif similarity diagnostics (non-blocking).
 */

import type { CoreMotif } from '../motif/motifEngineTypes';
import { similarityMotifShape, type MotifShape } from '../motif/motifShape';

export interface MosaicMotifSimilarityReceipt {
  fromSection: string;
  toSection: string;
  similarity: number;
}

function coreMotifToMotifShape(m: CoreMotif): MotifShape {
  const noteCount = m.intervalPattern.length + 1;
  const attackBeats = m.rhythmPattern.slice(0, noteCount).map((r) => r.startBeat);
  let peakIndex = 0;
  let peakHeight = 0;
  let height = 0;
  for (let i = 0; i < m.intervalPattern.length; i++) {
    height += m.intervalPattern[i]!;
    if (height > peakHeight) {
      peakHeight = height;
      peakIndex = i + 1;
    }
  }
  return {
    startRelativePc: 0,
    peakIndex,
    peakRelativePc: ((peakHeight % 12) + 12) % 12,
    intervalPattern: [...m.intervalPattern],
    contour: [...m.contourPattern],
    attackBeats,
  };
}

export function scoreMosaicMotifSimilarity(
  variants: Record<string, CoreMotif>
): MosaicMotifSimilarityReceipt[] {
  const labels = Object.keys(variants);
  const receipts: MosaicMotifSimilarityReceipt[] = [];
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const fromSection = labels[i]!;
      const toSection = labels[j]!;
      const a = coreMotifToMotifShape(variants[fromSection]!);
      const b = coreMotifToMotifShape(variants[toSection]!);
      receipts.push({
        fromSection,
        toSection,
        similarity: similarityMotifShape(a, b),
      });
    }
  }
  return receipts;
}
