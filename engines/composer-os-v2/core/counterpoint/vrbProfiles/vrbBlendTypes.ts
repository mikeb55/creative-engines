/**
 * SQ VRB blend — typed field taxonomy + live pool metadata.
 */

import type { SqVrbProfile } from './sqVrbProfileTypes';

export type MergeMode =
  | 'blend'
  | 'blend-capped'
  | 'soft-boolean'
  | 'hard-switch'
  | 'dominant'
  | 'dominant-custom'
  | 'union-weighted'
  | 'resolver';

export type FieldSpec =
  | { mode: 'blend'; field: string }
  | { mode: 'blend-capped'; field: 'sigma' }
  | { mode: 'soft-boolean'; field: string; threshold?: number }
  | { mode: 'hard-switch'; field: string; activateAt: number }
  | { mode: 'dominant'; field: string }
  | { mode: 'dominant-custom'; field: 'phraseArticulation' }
  | { mode: 'union-weighted'; field: 'chordVocabulary' | 'preferredIntervals' }
  | { mode: 'resolver'; field: 'placementMode' };

export type BlendPart = {
  id: string;
  weight: number;
  profile: SqVrbProfile;
};

export type WeightedToken<T extends string | number> = {
  value: T;
  support: number;
  sources: Record<string, number>;
};

export type VrbBlendMeta = {
  parts: BlendPart[];
  mergedChordVocabulary: WeightedToken<string>[];
  mergedPreferredIntervals: WeightedToken<number>[];
  openness: number;
  fieldSpecs: Partial<Record<keyof SqVrbProfile | string, FieldSpec>>;
  /** Dominant placementMode from source profiles (resolver stub). */
  resolvedPlacementMode?: string;
  /** Hard-switch regime booleans resolved at blend time. */
  regimeBooleans?: Record<string, boolean>;
};
