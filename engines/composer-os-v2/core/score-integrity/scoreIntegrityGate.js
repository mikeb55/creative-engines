"use strict";
/**
 * Composer OS V2 — Score Integrity Gate
 * Release-blocking pre-export structural checks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScoreIntegrityGate = runScoreIntegrityGate;
const barMathValidation_1 = require("./barMathValidation");
const registerValidation_1 = require("./registerValidation");
const chordSymbolValidation_1 = require("./chordSymbolValidation");
const rehearsalMarkValidation_1 = require("./rehearsalMarkValidation");
/** Run score integrity gate. Release-blocking. */
function runScoreIntegrityGate(input) {
    const errors = [];
    const barResult = (0, barMathValidation_1.validateBarMath)(input.bars);
    errors.push(...barResult.errors);
    if (input.pitchByInstrument && input.instruments.length > 0) {
        const regResult = (0, registerValidation_1.validateRegister)({
            instrumentProfiles: input.instruments,
            pitchByInstrument: input.pitchByInstrument,
        });
        errors.push(...regResult.errors);
    }
    const totalBars = input.bars.reduce((sum, b) => sum + b.duration, 0);
    const chordResult = (0, chordSymbolValidation_1.validateChordSymbols)(input.chordSymbols, input.bars.length);
    if (input.chordSymbolsRequired) {
        errors.push(...chordResult.errors);
    }
    const rehearsalResult = (0, rehearsalMarkValidation_1.validateRehearsalMarks)(input.rehearsalMarks, input.rehearsalMarksRequired ?? false);
    if (input.rehearsalMarksRequired) {
        errors.push(...rehearsalResult.errors);
    }
    return {
        passed: errors.length === 0,
        errors,
    };
}
