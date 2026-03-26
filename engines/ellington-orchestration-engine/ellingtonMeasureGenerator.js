"use strict";
/**
 * Ellington Measure-First Generator — uses engines/core.
 * Each instrument = voice. Uses createMeasure/pushNote. Ranges enforced before export.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSTRUMENTS = void 0;
exports.generateEllingtonScore = generateEllingtonScore;
const measureBuilder_1 = require("../core/measureBuilder");
const validateScore_1 = require("../../scripts/validateScore");
const ellingtonVoicings_1 = require("./ellingtonVoicings");
const ellingtonProgressions_1 = require("./ellingtonProgressions");
const instrumentRanges_1 = require("./instrumentRanges");
const INSTRUMENTS = [
    { id: 'P1', name: 'Alto Sax 1', clef: 'treble', transposition: 9, section: 'saxes', sectionIndex: 0 },
    { id: 'P2', name: 'Alto Sax 2', clef: 'treble', transposition: 9, section: 'saxes', sectionIndex: 1 },
    { id: 'P3', name: 'Tenor Sax 1', clef: 'treble', transposition: 2, section: 'saxes', sectionIndex: 2 },
    { id: 'P4', name: 'Tenor Sax 2', clef: 'treble', transposition: 2, section: 'saxes', sectionIndex: 3 },
    { id: 'P5', name: 'Baritone Sax', clef: 'treble', transposition: 9, section: 'saxes', sectionIndex: 4 },
    { id: 'P6', name: 'Trumpet 1', clef: 'treble', transposition: 2, section: 'trumpets', sectionIndex: 0 },
    { id: 'P7', name: 'Trumpet 2', clef: 'treble', transposition: 2, section: 'trumpets', sectionIndex: 1 },
    { id: 'P8', name: 'Trumpet 3', clef: 'treble', transposition: 2, section: 'trumpets', sectionIndex: 2 },
    { id: 'P9', name: 'Trumpet 4', clef: 'treble', transposition: 2, section: 'trumpets', sectionIndex: 3 },
    { id: 'P10', name: 'Trombone 1', clef: 'bass', transposition: 0, section: 'trombones', sectionIndex: 0 },
    { id: 'P11', name: 'Trombone 2', clef: 'bass', transposition: 0, section: 'trombones', sectionIndex: 1 },
    { id: 'P12', name: 'Trombone 3', clef: 'bass', transposition: 0, section: 'trombones', sectionIndex: 2 },
    { id: 'P13', name: 'Bass Trombone', clef: 'bass', transposition: 0, section: 'trombones', sectionIndex: 3 },
    { id: 'P14', name: 'Piano', clef: 'treble', transposition: 0, section: 'rhythm', sectionIndex: 0 },
    { id: 'P15', name: 'Bass', clef: 'bass', transposition: 0, section: 'rhythm', sectionIndex: 1 },
    { id: 'P16', name: 'Drums', clef: 'treble', transposition: 0, section: 'rhythm', sectionIndex: 2 },
];
exports.INSTRUMENTS = INSTRUMENTS;
const ROOT_MIDI = {
    C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
    'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};
function getRootMidi(chord, octave) {
    const base = chord.split('/')[0];
    const m = base.match(/^([A-Ga-g])([#b])?/i);
    if (!m)
        return 48;
    const root = m[1].charAt(0).toUpperCase() + (m[1].slice(1) || '');
    const alter = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    return (ROOT_MIDI[root] ?? 60) + alter + (octave - 4) * 12;
}
/** Rhythmic durations per bar (sum = 16). Varies by section for interest. */
function getRhythmDurations(inst, barIndex) {
    if (inst.section === 'rhythm' && inst.sectionIndex === 2)
        return [16];
    if (inst.section === 'rhythm' && inst.sectionIndex === 1)
        return [4, 4, 4, 4];
    if (inst.section === 'saxes')
        return [4, 4, 4, 4];
    if (inst.section === 'trumpets')
        return barIndex % 2 === 0 ? [8, 8] : [4, 4, 4, 4];
    if (inst.section === 'trombones')
        return [8, 8];
    return [4, 4, 4, 4];
}
function getPitchForInstrument(inst, pitches, chord) {
    if (inst.section === 'rhythm') {
        if (inst.sectionIndex === 0)
            return pitches[0] ?? getRootMidi(chord, 4);
        if (inst.sectionIndex === 1)
            return getRootMidi(chord, 2);
        return null;
    }
    if (inst.section === 'saxes' && inst.sectionIndex === 4) {
        return pitches.length > 0 ? Math.min(...pitches) : getRootMidi(chord, 4);
    }
    const p = pitches[inst.sectionIndex] ?? null;
    if (p !== null)
        return p;
    if (pitches.length > 0)
        return pitches[0];
    return getRootMidi(chord, 4);
}
/** Generate Ellington orchestration as Score using core measure builder. */
function generateEllingtonScore(progression, options) {
    const segments = (0, ellingtonProgressions_1.parseProgression)(progression);
    const seed = options?.seed ?? Date.now();
    const totalBars = segments.reduce((s, seg) => s + seg.bars, 0);
    const trumpets = (0, ellingtonVoicings_1.generateSectionVoicings)(segments, 'trumpets', seed);
    const trombones = (0, ellingtonVoicings_1.generateSectionVoicings)(segments, 'trombones', seed + 1);
    const saxes = (0, ellingtonVoicings_1.generateSectionVoicings)(segments, 'saxes', seed + 2);
    const rhythm = (0, ellingtonVoicings_1.generateSectionVoicings)(segments, 'rhythm', seed + 3);
    const sectionData = {
        trumpets,
        trombones,
        saxes,
        rhythm,
    };
    const measures = [];
    const voiceIds = INSTRUMENTS.map((_, i) => i + 1);
    for (let barIndex = 0; barIndex < totalBars; barIndex++) {
        const barNum = barIndex + 1;
        const chord = trumpets.find((v) => v.bar === barNum)?.chord ?? saxes[0]?.chord ?? 'Cmaj7';
        const measure = (0, measureBuilder_1.createMeasure)(barIndex, voiceIds);
        for (let vi = 0; vi < INSTRUMENTS.length; vi++) {
            const inst = INSTRUMENTS[vi];
            const voice = vi + 1;
            const cursor = { pos: 0 };
            const data = sectionData[inst.section];
            const barData = data?.find((v) => v.bar === barNum);
            const pitches = barData?.pitches ?? [];
            const concertPitch = getPitchForInstrument(inst, pitches, chord);
            const durations = getRhythmDurations(inst, barIndex);
            if (concertPitch !== null) {
                const clamped = (0, instrumentRanges_1.clampToInstrument)(concertPitch, inst.name);
                const writtenPitch = inst.transposition !== 0 ? clamped + inst.transposition : clamped;
                for (const d of durations) {
                    (0, measureBuilder_1.pushNote)(measure, voice, writtenPitch, d, cursor);
                }
            }
            else {
                for (const d of durations) {
                    (0, measureBuilder_1.pushNote)(measure, voice, 0, d, cursor);
                }
            }
        }
        measures.push(measure);
    }
    const score = { measures };
    (0, validateScore_1.validateScore)(score);
    return score;
}
