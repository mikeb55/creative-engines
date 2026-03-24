/**
 * Composer OS V2 — Instrument profile types
 */

import type { MidiPitch } from '../primitives/primitiveTypes';

/** Instrument identity — canonical name. */
export type InstrumentIdentity =
  | 'clean_electric_guitar'
  | 'acoustic_upright_bass'
  | string;

/** Guitar texture requirement. */
export interface GuitarTextureRequirement {
  melody: boolean;
  dyads: boolean;
  triads: boolean;
  fourNoteChords: boolean;
}

/** Bass harmonic anchor requirement. */
export interface BassHarmonicAnchorRequirement {
  rootOnOne: boolean;
  walkingLine: boolean;
  chordTones: boolean;
}

/** Base instrument profile shape. */
export interface InstrumentProfileBase {
  instrumentIdentity: InstrumentIdentity;
  midiProgram: number;
  midiChannel?: number;
  hardRange: [MidiPitch, MidiPitch];
}

/** Guitar-specific profile. */
export interface GuitarProfile extends InstrumentProfileBase {
  instrumentIdentity: 'clean_electric_guitar';
  preferredMelodicZone: [MidiPitch, MidiPitch];
  preferredDyadZone: [MidiPitch, MidiPitch];
  preferredTriadZone: [MidiPitch, MidiPitch];
  preferredFourNoteChordZone: [MidiPitch, MidiPitch];
  highDangerZone: [MidiPitch, MidiPitch];
  textureRequirements: GuitarTextureRequirement;
}

/** Bass-specific profile. */
export interface BassProfile extends InstrumentProfileBase {
  instrumentIdentity: 'acoustic_upright_bass';
  preferredWalkingZone: [MidiPitch, MidiPitch];
  upperDangerZone: [MidiPitch, MidiPitch];
  lowerMudZone: [MidiPitch, MidiPitch];
  harmonicAnchorRequirements: BassHarmonicAnchorRequirement;
}

/** Union of all instrument profiles. */
export type InstrumentProfile = GuitarProfile | BassProfile;
