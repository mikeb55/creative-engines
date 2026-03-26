"use strict";
/**
 * Composer OS V2 — Acoustic / Upright Bass profile
 * Default: Acoustic Upright Bass (never vocal bass).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACOUSTIC_UPRIGHT_BASS = void 0;
/** Acoustic Upright Bass — hard range E1–G4 (MIDI 28–67). */
exports.ACOUSTIC_UPRIGHT_BASS = {
    instrumentIdentity: 'acoustic_upright_bass',
    midiProgram: 32, // GM Acoustic Bass (0-based); MusicXML uses midi-program 33 (1-based)
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
