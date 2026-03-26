"use strict";
/**
 * Ellington instrument range validation.
 * Checks that all pitches fall within practical written ranges before export.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEllingtonRanges = validateEllingtonRanges;
const INSTRUMENT_RANGES = {
    'Alto Sax 1': [55, 79], 'Alto Sax 2': [55, 79],
    'Tenor Sax 1': [46, 70], 'Tenor Sax 2': [46, 70],
    'Baritone Sax': [36, 63],
    'Trumpet 1': [55, 84], 'Trumpet 2': [52, 81], 'Trumpet 3': [48, 76], 'Trumpet 4': [48, 72],
    'Trombone 1': [41, 70], 'Trombone 2': [38, 67], 'Trombone 3': [36, 65], 'Bass Trombone': [34, 58],
    'Piano': [36, 84], 'Bass': [28, 55],
};
function validateEllingtonRanges(orch) {
    const violations = [];
    const sections = [
        { name: 'Alto Sax 1', data: orch.saxes, idx: 0 },
        { name: 'Alto Sax 2', data: orch.saxes, idx: 1 },
        { name: 'Tenor Sax 1', data: orch.saxes, idx: 2 },
        { name: 'Tenor Sax 2', data: orch.saxes, idx: 3 },
        { name: 'Baritone Sax', data: orch.saxes, idx: 4 },
        { name: 'Trumpet 1', data: orch.trumpets, idx: 0 },
        { name: 'Trumpet 2', data: orch.trumpets, idx: 1 },
        { name: 'Trumpet 3', data: orch.trumpets, idx: 2 },
        { name: 'Trumpet 4', data: orch.trumpets, idx: 3 },
        { name: 'Trombone 1', data: orch.trombones, idx: 0 },
        { name: 'Trombone 2', data: orch.trombones, idx: 1 },
        { name: 'Trombone 3', data: orch.trombones, idx: 2 },
        { name: 'Bass Trombone', data: orch.trombones, idx: 3 },
        { name: 'Piano', data: orch.rhythm, idx: 0 },
        { name: 'Bass', data: orch.rhythm, idx: 1 },
    ];
    for (const { name, data, idx } of sections) {
        const range = INSTRUMENT_RANGES[name];
        if (!range)
            continue;
        for (const v of data) {
            const pitch = v.pitches[idx] ?? (name === 'Bass' ? 48 : null);
            if (pitch === null)
                continue;
            const [min, max] = range;
            if (pitch < min || pitch > max) {
                violations.push({ instrument: name, bar: v.bar, concertMidi: pitch, min, max });
            }
        }
    }
    return { valid: violations.length === 0, violations };
}
