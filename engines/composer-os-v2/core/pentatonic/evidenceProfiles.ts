/**
 * Passage evidence profiles.
 * Dev 1 `DEFAULT_PENTATONIC_SCORING` stays the default.
 * `wwh-duo-1.1` is the While We're Here duo heuristic:
 * melody and bass outweigh mutable chord-symbol evidence.
 * Friction weight 1.4 is a colour/tension cost. Other weights are unchanged from 1.0.
 * These weights are not musical laws.
 */

import { DEFAULT_PENTATONIC_SCORING } from './evaluate';
import type { PentatonicScoringConfig } from './types';

export const WWH_DUO_PROFILE_ID = 'wwh-duo-1.1';

export const WWH_DUO_EVIDENCE_WEIGHTS: PentatonicScoringConfig['weights'] = {
  melody: 2.6,
  bass: 2,
  harmony: 0.9,
  held: 1,
  target: 1,
  caution: 0.8,
  continuity: 1,
  purpose: 0.8,
  colour: 0.7,
  friction: 1.4,
};

export function scoringForEvidenceProfile(
  profile: 'default' | 'wwh-duo-1.1' | 'wwh-duo-1.0' | undefined,
  override?: Partial<Omit<PentatonicScoringConfig, 'weights'>> & {
    weights?: Partial<PentatonicScoringConfig['weights']>;
  }
): PentatonicScoringConfig {
  const weights =
    profile === WWH_DUO_PROFILE_ID || profile === 'wwh-duo-1.0'
      ? { ...WWH_DUO_EVIDENCE_WEIGHTS }
      : { ...DEFAULT_PENTATONIC_SCORING.weights };
  return {
    minimumSuitability: override?.minimumSuitability ?? DEFAULT_PENTATONIC_SCORING.minimumSuitability,
    retentionMargin: override?.retentionMargin ?? DEFAULT_PENTATONIC_SCORING.retentionMargin,
    weights: { ...weights, ...override?.weights },
  };
}
