/**
 * Duo export-truth builder (V100a).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { DuoExportTruth } from './duoTypes';

function findDuoPart(score: ScoreModel, role: 'guitar' | 'bass') {
  if (role === 'guitar') {
    return score.parts.find(
      (p) => p.id === 'guitar' || p.instrumentIdentity === 'clean_electric_guitar'
    );
  }
  return score.parts.find(
    (p) => p.id === 'bass' || p.instrumentIdentity === 'acoustic_upright_bass'
  );
}

/** Per-bar chord symbols from guitar (upper) and bass (lower) duo parts. */
export function extractDuoBarsFromScore(score: ScoreModel): { upper: string[]; lower: string[] } {
  const guitar = findDuoPart(score, 'guitar');
  const bass = findDuoPart(score, 'bass');
  if (!guitar || !bass) {
    throw new Error('Duo export truth: guitar and bass parts required');
  }
  if (guitar.measures.length !== bass.measures.length) {
    throw new Error('Duo export truth: guitar and bass bar counts must match');
  }
  return {
    upper: guitar.measures.map((m) => m.chord ?? ''),
    lower: bass.measures.map((m) => m.chord ?? ''),
  };
}

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
