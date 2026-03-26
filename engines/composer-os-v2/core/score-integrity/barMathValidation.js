"use strict";
/**
 * Composer OS V2 — Bar math validation
 * Measure duration correctness.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBarMath = validateBarMath;
const EXPECTED_BEATS = 4;
/** Validate bar durations sum correctly. */
function validateBarMath(bars, expectedBeatsPerBar = EXPECTED_BEATS) {
    const errors = [];
    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        if (bar.duration !== expectedBeatsPerBar) {
            errors.push(`Bar ${bar.index + 1}: expected ${expectedBeatsPerBar} beats, got ${bar.duration}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
