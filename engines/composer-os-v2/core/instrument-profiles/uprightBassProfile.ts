/**
 * Composer OS V2 — Acoustic / Upright Bass profile
 * Default: Acoustic Upright Bass (never vocal bass).
 */

import type { BassProfile } from './instrumentProfileTypes';

/** Acoustic Upright Bass — hard range E1–G4 (MIDI 28–67). */
export const ACOUSTIC_UPRIGHT_BASS: BassProfile = {
  instrumentIdentity: 'acoustic_upright_bass',
  midiProgram: 43, // Acoustic Bass
  hardRange: [28, 67], // E1–G4
  preferredWalkingZone: [36, 55], // E2–G3
  upperDangerZone: [60, 67], // C4–G4
  lowerMudZone: [28, 35], // E1–B1
  harmonicAnchorRequirements: {
    rootOnOne: true,
    walkingLine: true,
    chordTones: true,
  },
};
