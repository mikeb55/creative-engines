/**
 * Composer OS V2 — Acoustic / Upright Bass profile
 * Default: Acoustic Upright Bass (never vocal bass).
 */

import type { BassProfile } from './instrumentProfileTypes';

/** Hard range matches guitar profile + register validation (E2–E6 MIDI) — same gate as `guitarProfile.hardRange`. */
export const BASS_HARD_RANGE_LOW = 40;
export const BASS_HARD_RANGE_HIGH = 88;

/** Acoustic Upright Bass — hard range aligned with validator; walking zone stays mid-bass. */
export const ACOUSTIC_UPRIGHT_BASS: BassProfile = {
  instrumentIdentity: 'acoustic_upright_bass',
  midiProgram: 32, // GM Acoustic Bass (0-based); MusicXML uses midi-program 33 (1-based)
  hardRange: [BASS_HARD_RANGE_LOW, BASS_HARD_RANGE_HIGH],
  preferredWalkingZone: [40, 55], // E2–G3
  upperDangerZone: [60, 67], // C4–G4
  lowerMudZone: [40, 43], // low E2–G2 (mud / coupling band)
  harmonicAnchorRequirements: {
    rootOnOne: true,
    walkingLine: true,
    chordTones: true,
  },
};
