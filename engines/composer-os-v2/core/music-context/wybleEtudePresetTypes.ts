/**
 * Wyble etude preset — curated key / tempo / pattern / difficulty (V95).
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';

export type WybleEtudeDifficulty = 'easy' | 'medium' | 'hard';

export type WybleEtudePatternType = 'chromatic' | 'pentatonic' | 'whole_tone';

export interface WybleEtudePreset {
  key: PitchClass;
  tempo: number;
  patternType: WybleEtudePatternType | string;
  difficulty: WybleEtudeDifficulty;
}
