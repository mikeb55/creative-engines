"use strict";
/**
 * Acoustic / Upright Bass profile — keep in sync with `uprightBassProfile.ts`.
 * (Committed .js must export the same symbols Node resolves ahead of `.ts`.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACOUSTIC_UPRIGHT_BASS = exports.BASS_HARD_RANGE_HIGH = exports.BASS_HARD_RANGE_LOW = void 0;
/** Concert MIDI bounds for upright bass in score model (E1–G3); matches export without octave fudge. */
exports.BASS_HARD_RANGE_LOW = 28;
exports.BASS_HARD_RANGE_HIGH = 55;
/** Acoustic Upright Bass — hard range aligned with validator; walking zone stays mid-bass. */
exports.ACOUSTIC_UPRIGHT_BASS = {
  instrumentIdentity: "acoustic_upright_bass",
  midiProgram: 32,
  hardRange: [exports.BASS_HARD_RANGE_LOW, exports.BASS_HARD_RANGE_HIGH],
  preferredWalkingZone: [28, 55],
  upperDangerZone: [52, 55],
  lowerMudZone: [28, 34],
  harmonicAnchorRequirements: {
    rootOnOne: true,
    walkingLine: true,
    chordTones: true,
  },
};
