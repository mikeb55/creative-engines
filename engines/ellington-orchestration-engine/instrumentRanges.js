"use strict";
/**
 * Strict MIDI ranges for big band instruments.
 * All pitches must be clamped before writing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECTION_BANDS = exports.INSTRUMENT_RANGES = void 0;
exports.clamp = clamp;
exports.clampToInstrument = clampToInstrument;
exports.INSTRUMENT_RANGES = {
    'Alto Sax 1': [55, 79],
    'Alto Sax 2': [55, 79],
    'Tenor Sax 1': [46, 70],
    'Tenor Sax 2': [46, 70],
    'Baritone Sax': [36, 63],
    'Trumpet 1': [60, 84],
    'Trumpet 2': [58, 81],
    'Trumpet 3': [55, 78],
    'Trumpet 4': [52, 74],
    'Trombone 1': [48, 72],
    'Trombone 2': [45, 69],
    'Trombone 3': [43, 67],
    'Bass Trombone': [36, 60],
    'Piano': [36, 84],
    'Bass': [28, 52],
    'Drums': [0, 0],
};
/** Section register bands (concert MIDI) — vertical order. */
exports.SECTION_BANDS = {
    bass: [28, 52],
    bari: [36, 63],
    trombones: [36, 72],
    tenors: [46, 70],
    altos: [55, 79],
    trumpets: [52, 84],
    piano: [36, 84],
};
function clamp(pitch, min, max) {
    if (min === 0 && max === 0)
        return pitch;
    return Math.max(min, Math.min(max, pitch));
}
function clampToInstrument(pitch, instName) {
    const range = exports.INSTRUMENT_RANGES[instName];
    if (!range || (range[0] === 0 && range[1] === 0))
        return pitch;
    return clamp(pitch, range[0], range[1]);
}
