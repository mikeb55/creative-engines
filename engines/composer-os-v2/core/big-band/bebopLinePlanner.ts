/**
 * Bebop line behaviour metadata (planning only — no pitch generation).
 */

import type { BigBandEraId } from './bigBandResearchTypes';

export interface BebopLineBehaviourMetadata {
  continuousLineMotion: boolean;
  higherHarmonicRhythm: boolean;
  chromaticApproachToneTendency: boolean;
  phraseContinuationAcrossBarlines: boolean;
  lineVsRiff: 'line_primary' | 'riff_primary' | 'balanced';
}

export function planBebopLineBehaviour(era: BigBandEraId, _seed: number): BebopLineBehaviourMetadata | null {
  if (era !== 'bebop') return null;
  return {
    continuousLineMotion: true,
    higherHarmonicRhythm: true,
    chromaticApproachToneTendency: true,
    phraseContinuationAcrossBarlines: true,
    lineVsRiff: 'line_primary',
  };
}
