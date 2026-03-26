"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateScore = validateScore;
const timing_1 = require("../engines/core/timing");
function validateScore(score) {
    for (const m of score.measures) {
        for (const v of Object.keys(m.voices)) {
            const total = m.voices[Number(v)]
                .map((n) => n.duration)
                .reduce((a, b) => a + b, 0);
            if (total !== timing_1.MEASURE_DIVISIONS) {
                throw new Error(`Measure ${m.index} voice ${v} invalid duration ${total}`);
            }
        }
    }
}
