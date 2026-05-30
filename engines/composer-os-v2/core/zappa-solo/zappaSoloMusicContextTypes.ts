/**
 * Zappa Solo MusicContext producer types (V106p2) — melodic dramatist, not harmony engine.
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import type { BarMeterMap } from '../rhythm/barMeterTypes';

export type ZappaModalField =
  | 'dorian'
  | 'mixolydian'
  | 'lydian'
  | 'natural_minor'
  | 'harmonic_minor'
  | 'phrygian';

export const ZAPPA_MODAL_FIELDS: readonly ZappaModalField[] = [
  'dorian',
  'mixolydian',
  'lydian',
  'natural_minor',
  'harmonic_minor',
  'phrygian',
];

/** Dramatic solo arc — four states (not bar-locked punctuation). */
export type ZappaSoloArcState = 'claim' | 'agitation' | 'fracture' | 'crooked_landing';

export type ZappaSoloArcSegment = {
  /** 1-indexed inclusive */
  startBar: number;
  endBar: number;
  state: ZappaSoloArcState;
};

/**
 * Population Composer participation:
 * primary — full solo line over supplied harmony
 * secondary — melodic contamination of other agents' motifs
 * tertiary — pitch-colour pressure only (no chord authorship)
 */
export type ZappaSoloParticipationLevel = 'primary' | 'secondary' | 'tertiary';

export interface ZappaSoloMusicContextPreset {
  /** Supplied harmony — Zappa solo never authors chord symbols. */
  harmonyBars: readonly string[];
  seed?: number;
  bpm?: number;
  key?: PitchClass | string;
  modalField?: ZappaModalField;
  participationLevel?: ZappaSoloParticipationLevel;
  soloArc?: readonly ZappaSoloArcSegment[];
  density?: number;
  dissonanceLevel?: number;
  barMeterMap?: BarMeterMap;
}

export type ZappaSoloRealisationReceipt = {
  modalAnchorRatio: number;
  motifMutationRecurrence: number;
  rhythmicElasticityScore: number;
  targetedDissonanceIndex: number;
  closureRefusalScore: number;
  conversationalAsymmetry: number;
  participationLevel: ZappaSoloParticipationLevel;
  modalField: ZappaModalField;
  barCount: number;
  harmonyChecksum: string;
  noteCount: number;
};
