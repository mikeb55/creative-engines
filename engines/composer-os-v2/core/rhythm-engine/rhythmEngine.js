"use strict";
/**
 * Composer OS V2 — Rhythm Engine
 * Returns rhythmic behaviour constraints, not final notes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeRhythmicConstraints = computeRhythmicConstraints;
const rhythmValidation_1 = require("./rhythmValidation");
/**
 * Convert feel config to rhythmic constraints.
 * Stub: returns typed constraints; no deep generation.
 */
function computeRhythmicConstraints(feel) {
    const result = (0, rhythmValidation_1.validateFeelConfig)(feel);
    if (!result.valid) {
        throw new Error(`Feel config invalid: ${result.errors.join('; ')}`);
    }
    const subdivision = feel.syncopationDensity === 'high' ? 'sixteenth' :
        feel.syncopationDensity === 'medium' ? 'mixed' : 'eighth';
    const offbeatWeight = feel.syncopationDensity === 'high' ? 0.7 :
        feel.syncopationDensity === 'medium' ? 0.5 : 0.3;
    const tripletHint = feel.mode === 'swing' || feel.mode === 'hybrid';
    const phraseDisplacementTendency = feel.mode === 'swing' || feel.mode === 'hybrid' ? 0.3 : 0.1;
    const sustainTendency = feel.intensity < 0.5 ? 0.7 : 0.5;
    const attackDensityTendency = feel.syncopationDensity === 'high' ? 0.7 : feel.syncopationDensity === 'medium' ? 0.5 : 0.3;
    return {
        mode: feel.mode,
        intensity: feel.intensity,
        syncopationDensity: feel.syncopationDensity,
        subdivisionPreference: subdivision,
        offbeatWeight,
        tripletHint,
        phraseDisplacementTendency,
        sustainTendency,
        attackDensityTendency,
    };
}
