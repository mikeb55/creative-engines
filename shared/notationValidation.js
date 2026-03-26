"use strict";
/**
 * Hard validation gate for acceptance outputs.
 * Machine-checkable assertions before any launcher open.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAcceptanceScore = validateAcceptanceScore;
exports.validateEllingtonAcceptance = validateEllingtonAcceptance;
const barComposer_1 = require("./barComposer");
/** Validate Wyble/Counterpoint: 8 measures, 4 beats each, no negative/zero duration. */
function validateAcceptanceScore(score) {
    const errors = [];
    const warnings = [];
    const measureTotals = {};
    if (score.measures.length !== 8) {
        errors.push(`Expected 8 measures, got ${score.measures.length}`);
    }
    const scoreValidation = (0, barComposer_1.validateScore)(score.measures);
    errors.push(...scoreValidation.errors);
    for (const m of score.measures) {
        for (const v of m.voices) {
            const key = `${m.index}-${v.part}:${v.voice}:${v.staff}`;
            const total = v.events.reduce((sum, e) => sum + e.duration, 0);
            measureTotals[key] = total;
            if (Math.abs(total - barComposer_1.BEATS_PER_MEASURE) > 0.001) {
                errors.push(`Measure ${m.index + 1} ${v.part}:${v.voice}:${v.staff} total ${total.toFixed(2)} != ${barComposer_1.BEATS_PER_MEASURE}`);
            }
            for (const e of v.events) {
                if (e.duration <= 0)
                    errors.push(`Measure ${m.index + 1}: zero/negative duration`);
                if (e.startBeat < 0 || e.startBeat >= barComposer_1.BEATS_PER_MEASURE) {
                    errors.push(`Measure ${m.index + 1}: startBeat ${e.startBeat} out of range`);
                }
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        measuresChecked: score.measures.length,
        measureTotals,
    };
}
/** Ellington written pitch ranges (concert MIDI + transposition = written). */
const ELLINGTON_RANGES = {
    'Alto Sax 1': [55, 79], 'Alto Sax 2': [55, 79],
    'Tenor Sax 1': [46, 70], 'Tenor Sax 2': [46, 70], 'Baritone Sax': [36, 63],
    'Trumpet 1': [55, 84], 'Trumpet 2': [52, 81], 'Trumpet 3': [48, 76], 'Trumpet 4': [48, 72],
    'Trombone 1': [41, 70], 'Trombone 2': [38, 67], 'Trombone 3': [36, 65], 'Bass Trombone': [34, 58],
    'Piano': [36, 84], 'Bass': [28, 55], 'Drums': [0, 0],
};
const ELLINGTON_TRANSPOSITION = {
    'Alto Sax 1': 9, 'Alto Sax 2': 9, 'Tenor Sax 1': 2, 'Tenor Sax 2': 2, 'Baritone Sax': 9,
    'Trumpet 1': 2, 'Trumpet 2': 2, 'Trumpet 3': 2, 'Trumpet 4': 2,
    'Trombone 1': 0, 'Trombone 2': 0, 'Trombone 3': 0, 'Bass Trombone': 0,
    'Piano': 0, 'Bass': 0, 'Drums': 0,
};
const ELLINGTON_PART_NAMES = {
    P1: 'Alto Sax 1', P2: 'Alto Sax 2', P3: 'Tenor Sax 1', P4: 'Tenor Sax 2', P5: 'Baritone Sax',
    P6: 'Trumpet 1', P7: 'Trumpet 2', P8: 'Trumpet 3', P9: 'Trumpet 4',
    P10: 'Trombone 1', P11: 'Trombone 2', P12: 'Trombone 3', P13: 'Bass Trombone',
    P14: 'Piano', P15: 'Bass', P16: 'Drums',
};
/** Validate Ellington: all of above + part list, ranges, transpositions. */
function validateEllingtonAcceptance(score) {
    const base = validateAcceptanceScore(score);
    const errors = [...base.errors];
    for (const m of score.measures) {
        for (const v of m.voices) {
            const instName = ELLINGTON_PART_NAMES[v.part];
            const range = ELLINGTON_RANGES[instName];
            const trans = ELLINGTON_TRANSPOSITION[instName] ?? 0;
            for (const e of v.events) {
                if (e.pitch > 0 && instName && range && range[0] !== 0) {
                    const concertPitch = trans !== 0 ? e.pitch - trans : e.pitch;
                    if (concertPitch < range[0] || concertPitch > range[1]) {
                        errors.push(`Measure ${m.index + 1} ${v.part}: pitch ${e.pitch} (concert ${concertPitch}) outside range [${range[0]}, ${range[1]}]`);
                    }
                }
            }
        }
    }
    return {
        ...base,
        valid: errors.length === 0,
        errors,
    };
}
