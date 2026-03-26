"use strict";
/**
 * Composer OS V2 — Score event builder
 * Builds score model from structured plans.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMeasure = createMeasure;
exports.createNote = createNote;
exports.createRest = createRest;
exports.addEvent = addEvent;
exports.createPart = createPart;
exports.createScore = createScore;
/** Create empty measure. */
function createMeasure(index, chord, rehearsalMark) {
    return {
        index,
        events: [],
        chord,
        rehearsalMark,
    };
}
/** Create note event. */
function createNote(pitch, startBeat, duration, voice = 1) {
    return { kind: 'note', pitch, startBeat, duration, voice };
}
/** Create rest event. */
function createRest(startBeat, duration, voice = 1) {
    return { kind: 'rest', startBeat, duration, voice };
}
/** Add event to measure. */
function addEvent(measure, event) {
    measure.events.push(event);
}
/** Create part with empty measures. */
function createPart(id, name, instrumentIdentity, midiProgram, clef, measureCount, chordPerBar, rehearsalPerBar) {
    const measures = [];
    for (let i = 1; i <= measureCount; i++) {
        measures.push(createMeasure(i, chordPerBar(i), rehearsalPerBar(i)));
    }
    return { id, name, instrumentIdentity, midiProgram, clef, measures };
}
/** Create score model. */
function createScore(title, parts, options) {
    return {
        title,
        tempo: options?.tempo,
        timeSignature: { beats: 4, beatType: 4 },
        parts,
    };
}
