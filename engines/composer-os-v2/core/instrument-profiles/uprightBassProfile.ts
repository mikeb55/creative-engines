/**
 * Composer OS V2 — Acoustic / Upright Bass profile
 * Default: Acoustic Upright Bass (never vocal bass).
 */

import type { BassProfile } from './instrumentProfileTypes';

/** Concert MIDI bounds for upright bass in score model (E1–G3); matches export without octave fudge. */
export const BASS_HARD_RANGE_LOW = 28;
export const BASS_HARD_RANGE_HIGH = 55;

/** Acoustic Upright Bass — hard range aligned with validator; walking zone stays mid-bass. */
export const ACOUSTIC_UPRIGHT_BASS: BassProfile = {
  instrumentIdentity: 'acoustic_upright_bass',
  midiProgram: 32, // GM Acoustic Bass (0-based); MusicXML uses midi-program 33 (1-based)
  hardRange: [BASS_HARD_RANGE_LOW, BASS_HARD_RANGE_HIGH],
  preferredWalkingZone: [28, 55], // E1–G3
  upperDangerZone: [52, 55], // top of practical upright register
  lowerMudZone: [28, 34], // very low / coupling-prone
  harmonicAnchorRequirements: {
    rootOnOne: true,
    walkingLine: true,
    chordTones: true,
  },
};
