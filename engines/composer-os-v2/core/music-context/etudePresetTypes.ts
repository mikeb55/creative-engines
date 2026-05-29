/**
 * Engine-agnostic etude preset — key / tempo / pattern / difficulty (V96b).
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';

export type EtudeDifficulty = 'easy' | 'medium' | 'hard';

export type EtudePatternType = 'chromatic' | 'pentatonic' | 'whole_tone';

/** Standalone etude preset — no parent engine required. */
export interface StandaloneEtudePreset {
  key: PitchClass;
  tempo: number;
  patternType: EtudePatternType | string;
  difficulty: EtudeDifficulty;
}
