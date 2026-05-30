/**
 * String Quartet MusicContext producer types (V105p1).
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';

export type StringQuartetTextureArchetype =
  | 'chorale'
  | 'arco_melody_accompaniment'
  | 'pad_suspension'
  | 'pizzicato_pulse'
  | 'tremolo_wash'
  | 'contrapuntal_weave'
  | 'duet_support';

export const STRING_QUARTET_TEXTURE_ARCHETYPES: readonly StringQuartetTextureArchetype[] = [
  'chorale',
  'arco_melody_accompaniment',
  'pad_suspension',
  'pizzicato_pulse',
  'tremolo_wash',
  'contrapuntal_weave',
  'duet_support',
];

export type StringQuartetCelloRole = 'root_motion' | 'pedal' | 'bass_counterline';
export type StringQuartetViolaRole = 'hinge_voice' | 'thirds_sevenths' | 'modal_colour';
export type StringQuartetViolin2Role = 'bridge_voice' | 'harmonic_completion' | 'rhythmic_glue';
export type StringQuartetViolin1Role = 'melody' | 'upper_extension' | 'tritonic_float_target';

export interface StringQuartetRoleAssignment {
  cello: StringQuartetCelloRole;
  viola: StringQuartetViolaRole;
  violin_2: StringQuartetViolin2Role;
  violin_1: StringQuartetViolin1Role;
}

/** Preset surface for SQ MusicContext producer — always-on, no feature flag. */
export interface StringQuartetMusicContextPreset {
  key: PitchClass;
  tempo: number;
  seed: number;
  textureArchetype: StringQuartetTextureArchetype;
}

export interface StringQuartetPartLeapStats {
  violin_1: number;
  violin_2: number;
  viola: number;
  cello: number;
}

export interface StringQuartetRealisationDiagnostics {
  voiceCrossingCount: number;
  lowRegisterCrowdingCount: number;
  outerVoiceParallelsCount: number;
  meanLeapPerPart: StringQuartetPartLeapStats;
  lineSmoothnessScore: StringQuartetPartLeapStats;
  registralBalanceScore: number;
  harmonicCompletenessScore: number;
  textureStabilityScore: number;
}
