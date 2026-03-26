"use strict";
/**
 * Global timing standard for all notation engines.
 * Single source of truth — no per-engine duration hacks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DURATION_MAP = exports.MEASURE_DURATION = exports.BEATS_PER_MEASURE = exports.DIVISIONS = void 0;
exports.divisionsToType = divisionsToType;
exports.beatsToDivisions = beatsToDivisions;
exports.DIVISIONS = 4;
exports.BEATS_PER_MEASURE = 4;
exports.MEASURE_DURATION = exports.BEATS_PER_MEASURE * exports.DIVISIONS; // 16 for 4/4
exports.DURATION_MAP = {
    sixteenth: 1,
    eighth: 2,
    quarter: 4,
    half: 8,
    whole: 16,
};
function divisionsToType(divs) {
    if (divs <= 1)
        return '16th';
    if (divs <= 2)
        return 'eighth';
    if (divs <= 4)
        return 'quarter';
    if (divs <= 8)
        return 'half';
    return 'whole';
}
function beatsToDivisions(beats) {
    return Math.round(beats * exports.DIVISIONS);
}
