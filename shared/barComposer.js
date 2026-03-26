"use strict";
/**
 * Bar composer framework — measure-first composition.
 * Measure always equals exactly 4 beats.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BEATS_PER_MEASURE = void 0;
exports.validateMeasure = validateMeasure;
exports.validateScore = validateScore;
exports.composeVoice = composeVoice;
exports.composeMeasure = composeMeasure;
const scoreModel_1 = require("./scoreModel");
exports.BEATS_PER_MEASURE = 4;
/** Validate that each voice stream in a measure sums to exactly 4 beats. */
function validateMeasure(measure) {
    const errors = [];
    const byStream = (0, scoreModel_1.measureDurationByStream)(measure);
    for (const [key, total] of byStream) {
        if (Math.abs(total - exports.BEATS_PER_MEASURE) > 0.001) {
            errors.push(`Measure ${measure.index + 1} ${key}: total ${total.toFixed(2)} != ${exports.BEATS_PER_MEASURE}`);
        }
    }
    for (const v of measure.voices) {
        for (const e of v.events) {
            if (e.duration <= 0)
                errors.push(`Measure ${measure.index + 1}: zero/negative duration`);
            if (e.startBeat < 0 || e.startBeat >= exports.BEATS_PER_MEASURE) {
                errors.push(`Measure ${measure.index + 1}: startBeat ${e.startBeat} out of range`);
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
/** Validate entire score. */
function validateScore(measures) {
    const errors = [];
    for (const m of measures) {
        const r = validateMeasure(m);
        errors.push(...r.errors);
    }
    return { valid: errors.length === 0, errors };
}
/** Compose a single voice: add events that sum to 4 beats. Fills gaps with rests. */
function composeVoice(voice, staff, part, events) {
    const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
    const out = [];
    let cursor = 0;
    for (const e of sorted) {
        if (e.startBeat > cursor) {
            out.push({
                pitch: 0,
                startBeat: cursor,
                duration: e.startBeat - cursor,
                voice,
                staff,
                part,
            });
            cursor = e.startBeat;
        }
        const dur = Math.min(e.duration, exports.BEATS_PER_MEASURE - cursor);
        if (dur > 0) {
            out.push({
                pitch: e.pitch,
                startBeat: cursor,
                duration: dur,
                voice,
                staff,
                part,
            });
            cursor += dur;
        }
    }
    if (cursor < exports.BEATS_PER_MEASURE) {
        out.push({
            pitch: 0,
            startBeat: cursor,
            duration: exports.BEATS_PER_MEASURE - cursor,
            voice,
            staff,
            part,
        });
    }
    return { voice, staff, part, events: out };
}
/** Compose a measure from voice events. Merges voices into one Measure. */
function composeMeasure(index, chord, voiceSpecs) {
    const voices = voiceSpecs.map(({ voice, staff, part, events }) => composeVoice(voice, staff, part, events));
    return { index, chord, voices };
}
