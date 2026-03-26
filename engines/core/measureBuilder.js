"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMeasure = createMeasure;
exports.pushNote = pushNote;
const timing_1 = require("./timing");
function createMeasure(index, voices) {
    const v = {};
    voices.forEach((n) => (v[n] = []));
    return { index, voices: v };
}
function pushNote(measure, voice, pitch, duration, cursor) {
    if (cursor.pos + duration > timing_1.MEASURE_DIVISIONS) {
        throw new Error('Measure overflow');
    }
    measure.voices[voice].push({
        pitch,
        duration,
        voice,
    });
    cursor.pos += duration;
}
