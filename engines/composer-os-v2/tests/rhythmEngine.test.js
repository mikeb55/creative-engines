"use strict";
/**
 * Composer OS V2 — Rhythm Engine tests
 * Feel config validation and constraint output.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRhythmEngineTests = runRhythmEngineTests;
const rhythmEngine_1 = require("../core/rhythm-engine/rhythmEngine");
const rhythmValidation_1 = require("../core/rhythm-engine/rhythmValidation");
function testValidFeelReturnsConstraints() {
    const constraints = (0, rhythmEngine_1.computeRhythmicConstraints)({
        mode: 'swing',
        intensity: 0.7,
        syncopationDensity: 'medium',
    });
    return constraints.mode === 'swing' && constraints.intensity === 0.7;
}
function testInvalidIntensityFails() {
    const result = (0, rhythmValidation_1.validateFeelConfig)({
        mode: 'swing',
        intensity: 1.5,
        syncopationDensity: 'low',
    });
    return !result.valid && result.errors.some((e) => e.includes('intensity'));
}
function testStraightHighSyncopationIncoherent() {
    const result = (0, rhythmValidation_1.validateFeelConfig)({
        mode: 'straight',
        intensity: 0.5,
        syncopationDensity: 'high',
    });
    return !result.valid && result.errors.length > 0;
}
function testAllFeelModesValid() {
    const modes = ['swing', 'straight', 'hybrid'];
    for (const mode of modes) {
        const r = (0, rhythmEngine_1.computeRhythmicConstraints)({
            mode,
            intensity: 0.5,
            syncopationDensity: 'low',
        });
        if (r.mode !== mode)
            return false;
    }
    return true;
}
function testSyncopationAffectsOffbeatWeight() {
    const low = (0, rhythmEngine_1.computeRhythmicConstraints)({ mode: 'swing', intensity: 0.5, syncopationDensity: 'low' });
    const high = (0, rhythmEngine_1.computeRhythmicConstraints)({ mode: 'swing', intensity: 0.5, syncopationDensity: 'high' });
    return high.offbeatWeight > low.offbeatWeight;
}
function runRhythmEngineTests() {
    return [
        ['Valid feel returns constraints', testValidFeelReturnsConstraints],
        ['Invalid intensity fails validation', testInvalidIntensityFails],
        ['Straight + high syncopation incoherent', testStraightHighSyncopationIncoherent],
        ['All feel modes valid', testAllFeelModesValid],
        ['Syncopation affects offbeat weight', testSyncopationAffectsOffbeatWeight],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
