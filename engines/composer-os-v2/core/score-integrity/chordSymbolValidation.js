"use strict";
/**
 * Composer OS V2 — Chord symbol validation
 * Chord symbol completeness.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateChordSymbols = validateChordSymbols;
/** Validate chord symbols cover the score. */
function validateChordSymbols(chords, totalBars) {
    const errors = [];
    if (totalBars > 0 && chords.length === 0) {
        errors.push('Chord symbols required but none provided');
    }
    for (const c of chords) {
        if (!c.chord || c.chord.trim() === '') {
            errors.push(`Empty chord symbol at bar ${c.bar}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
