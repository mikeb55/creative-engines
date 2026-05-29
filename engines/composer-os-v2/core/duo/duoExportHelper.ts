/**
 * Duo export-truth builder (V100a).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import type { DuoExportTruth } from './duoTypes';

/** Normalise both voices and fingerprint the combined timeline for LOCK. */
export function buildDuoExportTruth(upper: string[], lower: string[]): DuoExportTruth {
  const upperBars = upper.map(normalizeChordSymbol);
  const lowerBars = lower.map(normalizeChordSymbol);
  const checksum = computeMusicContextChecksum([...upperBars, ...lowerBars]);
  return {
    upperBars,
    lowerBars,
    checksum,
    capturedAt: Date.now(),
  };
}
