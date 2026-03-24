"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStrictBarMath = validateStrictBarMath;
const scoreModelTypes_1 = require("../score-model/scoreModelTypes");
const EPS = 1e-4;
function validateStrictBarMath(score) {
    const errors = [];
    for (const part of score.parts) {
        for (const m of part.measures) {
            const byVoice = new Map();
            for (const e of m.events) {
                const v = e.voice ?? 1;
                if (!byVoice.has(v))
                    byVoice.set(v, []);
                byVoice.get(v).push(e);
            }
            if (byVoice.size === 0) {
                errors.push(`Part ${part.id} measure ${m.index}: empty (no events)`);
                continue;
            }
            for (const [voice, events] of byVoice) {
                const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
                let durSum = 0;
                for (const e of sorted)
                    durSum += e.duration;
                if (Math.abs(durSum - scoreModelTypes_1.BEATS_PER_MEASURE) > EPS) {
                    errors.push(`Part ${part.id} measure ${m.index} voice ${voice}: duration sum ${durSum} ≠ ${scoreModelTypes_1.BEATS_PER_MEASURE}`);
                }
                let cursor = 0;
                for (const e of sorted) {
                    if (e.startBeat + EPS < cursor) {
                        errors.push(`Part ${part.id} measure ${m.index} voice ${voice}: overlapping events at beat ${e.startBeat}`);
                        break;
                    }
                    cursor = Math.max(cursor, e.startBeat + e.duration);
                }
                if (cursor - scoreModelTypes_1.BEATS_PER_MEASURE > EPS) {
                    errors.push(`Part ${part.id} measure ${m.index} voice ${voice}: content extends past bar (${cursor} > ${scoreModelTypes_1.BEATS_PER_MEASURE})`);
                }
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
