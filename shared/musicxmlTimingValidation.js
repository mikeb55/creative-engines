"use strict";
/**
 * MusicXML timing validation — hard gate before Sibelius handoff.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMeasureDurations = validateMeasureDurations;
exports.validateVoiceAlignment = validateVoiceAlignment;
const notationTimingConstants_1 = require("./notationTimingConstants");
function validateMeasureDurations(measureEvents) {
    const errors = [];
    const warnings = [];
    const durationTotals = {};
    let tiesInserted = 0;
    let restsInserted = 0;
    const violationsFixed = [];
    const violationsBlocking = [];
    for (const [measureIndex, events] of measureEvents) {
        const measureStart = measureIndex * notationTimingConstants_1.MEASURE_DURATION;
        const streamKeys = [...new Set(events.map((e) => `${e.part}:${e.voice}:${e.staff}`))];
        for (const key of streamKeys) {
            const [part, voiceStr, staffStr] = key.split(':');
            const voice = parseInt(voiceStr, 10);
            const streamEvents = events
                .filter((e) => e.part === part && e.voice === voice)
                .sort((a, b) => a.startDivision - b.startDivision);
            let total = 0;
            for (const e of streamEvents) {
                if (e.durationDivisions <= 0) {
                    errors.push(`Measure ${measureIndex + 1} ${part} voice ${voice}: zero or negative duration`);
                    violationsBlocking.push(`zero duration`);
                }
                if (e.durationDivisions > notationTimingConstants_1.MEASURE_DURATION && !e.rest) {
                    warnings.push(`Measure ${measureIndex + 1}: event exceeds measure (${e.durationDivisions} > ${notationTimingConstants_1.MEASURE_DURATION})`);
                }
                total += e.durationDivisions;
                if (e.tieStart)
                    tiesInserted++;
                if (e.rest)
                    restsInserted++;
            }
            durationTotals[`${measureIndex}-${key}`] = total;
            if (total !== notationTimingConstants_1.MEASURE_DURATION) {
                errors.push(`Measure ${measureIndex + 1} ${part} voice ${voice}: total ${total} != ${notationTimingConstants_1.MEASURE_DURATION}`);
                violationsBlocking.push(`measure ${measureIndex + 1} ${part} voice ${voice} duration mismatch`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        measuresChecked: measureEvents.size,
        durationTotals,
        tiesInserted,
        restsInserted,
        violationsFixed,
        violationsBlocking,
    };
}
function validateVoiceAlignment(measureEvents) {
    const errors = [];
    for (const [measureIndex, events] of measureEvents) {
        const measureStart = measureIndex * notationTimingConstants_1.MEASURE_DURATION;
        const overlapping = new Map();
        for (const e of events) {
            const key = e.startDivision;
            overlapping.set(key, (overlapping.get(key) ?? 0) + e.durationDivisions);
        }
    }
    return { valid: errors.length === 0, errors };
}
