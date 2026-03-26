"use strict";
/**
 * Shared score model — measure-first architecture.
 * Generation: measure → voices → timed events → export
 * NOT: notes → exporter → measures
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyMeasure = emptyMeasure;
exports.emptyVoice = emptyVoice;
exports.voiceDuration = voiceDuration;
exports.measureDurationByStream = measureDurationByStream;
/** Create empty measure. */
function emptyMeasure(index, chord) {
    return { index, chord, voices: [] };
}
/** Create empty voice. */
function emptyVoice(voice, staff, part) {
    return { voice, staff, part, events: [] };
}
/** Sum duration of events in a voice. */
function voiceDuration(voice) {
    return voice.events.reduce((sum, e) => sum + e.duration, 0);
}
/** Sum duration of all voices in a measure (per voice stream). */
function measureDurationByStream(measure) {
    const out = new Map();
    for (const v of measure.voices) {
        const key = `${v.part}:${v.voice}:${v.staff}`;
        out.set(key, (out.get(key) ?? 0) + voiceDuration(v));
    }
    return out;
}
