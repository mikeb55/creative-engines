"use strict";
/**
 * Simple scoring for Wyble Score (measure-first output).
 * Uses core Score: voices = Record<number, NoteEvent[]>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreWybleMeasureFirst = scoreWybleMeasureFirst;
/** Score based on rhythmic variety and voice balance. */
function scoreWybleMeasureFirst(score) {
    let s = 8;
    const upperEvents = score.measures.flatMap((m) => (m.voices[1] ?? []).filter((e) => e.pitch > 0));
    const lowerEvents = score.measures.flatMap((m) => (m.voices[2] ?? []).filter((e) => e.pitch > 0));
    if (upperEvents.length > 0 && lowerEvents.length > 0)
        s += 0.5;
    const durations = new Set(score.measures.flatMap((m) => [...(m.voices[1] ?? []), ...(m.voices[2] ?? [])].map((e) => e.duration)));
    if (durations.size > 2)
        s += 0.5;
    return Math.min(10, s);
}
