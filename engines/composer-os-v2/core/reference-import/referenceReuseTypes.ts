/**
 * Applying reference influence — metadata for UI / future engine hints (no note cloning).
 */

export type ReferenceInfluenceStrength = 'subtle' | 'moderate' | 'strong';

export type ReferenceInfluenceMode = 'blend' | 'anchor_sections' | 'hint_only';

export type ReferenceInfluenceTarget =
  | 'song_mode'
  | 'ecm_chamber'
  | 'guitar_bass_duo'
  | 'big_band'
  | 'string_quartet';

export interface ReferenceInfluenceEnvelope {
  target: ReferenceInfluenceTarget;
  mode: ReferenceInfluenceMode;
  strength: ReferenceInfluenceStrength;
  /** Human-readable hints for product layer (never raw score). */
  hints: string[];
  /** Optional opaque key/values for manifests. */
  metadata: Record<string, string>;
}
