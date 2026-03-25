/**
 * Dual style pairing — songwriter lane vs arranger lane (additive metadata; never blocks).
 */

import type { BigBandComposerId, BigBandEraId } from '../big-band/bigBandResearchTypes';
import type { SongwriterRuleId } from '../song-mode/songwritingResearchTypes';

/** Planning weights for the songwriter-controlled lane (sum ≈ 1). */
export interface SongwriterDomainWeights {
  melody: number;
  harmony: number;
  form: number;
  lyricBehaviour: number;
}

/** Planning weights for the arranger-controlled lane (sum ≈ 1). */
export interface ArrangerDomainWeights {
  orchestration: number;
  density: number;
  sectionInteraction: number;
}

export interface StylePairingInput {
  songwriterStyle: SongwriterRuleId | string;
  arrangerStyle: BigBandComposerId | string;
  /** Optional era hint for confidence tuning (never used to reject). */
  era?: BigBandEraId | string;
  /** Stable seed for deterministic experimental flag in tests. */
  seed?: number;
}

/**
 * Resolved pairing — informational confidence; `experimentalFlag` marks unusual crosses.
 * Combinations are always allowed.
 */
export interface StylePairingResult {
  songwriterStyle: string;
  arrangerStyle: string;
  era: BigBandEraId | string | null;
  songwriterDomain: SongwriterDomainWeights;
  arrangerDomain: ArrangerDomainWeights;
  confidenceScore: number;
  experimentalFlag: boolean;
  /** Human-readable hints for diagnostics / manifests. */
  notes: string[];
}
