"use strict";
/**
 * Composer OS V2 — Score integrity tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScoreIntegrityTests = runScoreIntegrityTests;
const scoreIntegrityGate_1 = require("../core/score-integrity/scoreIntegrityGate");
const barMathValidation_1 = require("../core/score-integrity/barMathValidation");
const chordSymbolValidation_1 = require("../core/score-integrity/chordSymbolValidation");
const guitarProfile_1 = require("../core/instrument-profiles/guitarProfile");
function testBarMathValidPasses() {
    const r = (0, barMathValidation_1.validateBarMath)([
        { index: 0, duration: 4 },
        { index: 1, duration: 4 },
    ]);
    return r.valid;
}
function testBarMathInvalidFails() {
    const r = (0, barMathValidation_1.validateBarMath)([
        { index: 0, duration: 3 },
        { index: 1, duration: 4 },
    ]);
    return !r.valid;
}
function testScoreIntegrityGateEmptyBars() {
    const r = (0, scoreIntegrityGate_1.runScoreIntegrityGate)({
        bars: [],
        instruments: [],
        chordSymbols: [],
        rehearsalMarks: [],
    });
    return r.passed;
}
function testScoreIntegrityGateValidBars() {
    const r = (0, scoreIntegrityGate_1.runScoreIntegrityGate)({
        bars: [{ index: 0, duration: 4 }],
        instruments: [guitarProfile_1.CLEAN_ELECTRIC_GUITAR],
        chordSymbols: [{ bar: 1, chord: 'Cmaj7' }],
        rehearsalMarks: [],
    });
    return r.passed;
}
function testChordSymbolValidationEmptyFailsWhenRequired() {
    const r = (0, chordSymbolValidation_1.validateChordSymbols)([], 4);
    return !r.valid;
}
function testChordSymbolValidationValidPasses() {
    const r = (0, chordSymbolValidation_1.validateChordSymbols)([{ bar: 1, chord: 'Cm7' }], 4);
    return r.valid;
}
function runScoreIntegrityTests() {
    return [
        ['Bar math valid passes', testBarMathValidPasses],
        ['Bar math invalid fails', testBarMathInvalidFails],
        ['Integrity gate empty bars passes', testScoreIntegrityGateEmptyBars],
        ['Integrity gate valid bars passes', testScoreIntegrityGateValidBars],
        ['Chord symbols empty fails when required', testChordSymbolValidationEmptyFailsWhenRequired],
        ['Chord symbols valid passes', testChordSymbolValidationValidPasses],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
