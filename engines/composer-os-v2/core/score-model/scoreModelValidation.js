"use strict";
/**
 * Composer OS V2 — Score model validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateScoreModel = validateScoreModel;
const scoreModelTypes_1 = require("./scoreModelTypes");
/** Validate measure duration sums to BEATS_PER_MEASURE. */
function measureDuration(measure) {
    return measure.events.reduce((sum, e) => sum + e.duration, 0);
}
/** Validate score model structure. */
function validateScoreModel(score) {
    const errors = [];
    if (!score.title?.trim())
        errors.push('Score title required');
    if (!score.parts?.length)
        errors.push('At least one part required');
    for (const part of score.parts) {
        if (!part.id?.trim())
            errors.push(`Part missing id`);
        if (!part.measures?.length)
            errors.push(`Part ${part.id}: no measures`);
        for (const m of part.measures) {
            const dur = measureDuration(m);
            if (Math.abs(dur - scoreModelTypes_1.BEATS_PER_MEASURE) > 0.01) {
                errors.push(`Part ${part.id} measure ${m.index}: duration ${dur} != ${scoreModelTypes_1.BEATS_PER_MEASURE}`);
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
