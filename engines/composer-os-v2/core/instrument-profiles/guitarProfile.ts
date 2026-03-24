/**
 * Composer OS V2 — Clean Electric Guitar profile
 * Default: Clean Electric Guitar (never acoustic guitar).
 */

import type { GuitarProfile } from './instrumentProfileTypes';

/** Clean Electric Guitar — hard range E2–E6 (MIDI 40–88). */
export const CLEAN_ELECTRIC_GUITAR: GuitarProfile = {
  instrumentIdentity: 'clean_electric_guitar',
  midiProgram: 27, // Clean Guitar
  hardRange: [40, 88], // E2–E6
  preferredMelodicZone: [55, 79], // G3–G5
  preferredDyadZone: [48, 76], // C3–E5
  preferredTriadZone: [48, 76],
  preferredFourNoteChordZone: [48, 72], // C3–C5
  highDangerZone: [84, 88], // E6 area
  textureRequirements: {
    melody: true,
    dyads: true,
    triads: true,
    fourNoteChords: true,
  },
};
