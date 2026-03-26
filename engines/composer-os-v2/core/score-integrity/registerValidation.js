"use strict";
/**
 * Composer OS V2 — Register validation
 * Pitch range correctness per instrument.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegister = validateRegister;
/** Validate pitches stay within instrument hard ranges. */
function validateRegister(input) {
    const errors = [];
    const profileMap = new Map(input.instrumentProfiles.map((p) => [p.instrumentIdentity, p]));
    for (const { instrument, pitches } of input.pitchByInstrument) {
        const profile = profileMap.get(instrument);
        if (!profile)
            continue;
        const [low, high] = profile.hardRange;
        for (const p of pitches) {
            if (p < low || p > high) {
                errors.push(`${instrument}: pitch ${p} outside hard range [${low}, ${high}]`);
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
