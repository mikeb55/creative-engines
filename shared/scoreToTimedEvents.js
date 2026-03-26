"use strict";
/**
 * Convert Score (measure-first) to TimedNoteEvent format for existing MusicXML packer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreToMeasureEvents = scoreToMeasureEvents;
const notationTimingConstants_1 = require("./notationTimingConstants");
/** Convert Score to Map<measureIndex, TimedNoteEvent[]>. */
function scoreToMeasureEvents(score) {
    const out = new Map();
    for (const measure of score.measures) {
        const events = [];
        const measureStart = measure.index * 4 * notationTimingConstants_1.DIVISIONS; // 4 beats per measure
        for (const voice of measure.voices) {
            for (const e of voice.events) {
                const startDivision = measureStart + Math.round(e.startBeat * notationTimingConstants_1.DIVISIONS);
                const durationDivisions = Math.round(e.duration * notationTimingConstants_1.DIVISIONS);
                if (durationDivisions <= 0)
                    continue;
                events.push({
                    pitch: e.pitch,
                    startDivision,
                    durationDivisions,
                    voice: voice.voice,
                    staff: voice.staff,
                    part: voice.part,
                    tieStart: false,
                    tieStop: false,
                    rest: e.pitch === 0,
                });
            }
        }
        events.sort((a, b) => a.startDivision - b.startDivision);
        out.set(measure.index, events);
    }
    return out;
}
