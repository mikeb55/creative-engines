"use strict";
/**
 * Deterministic baseline score — 8 measures, quarter notes only.
 * C4 D4 E4 F4 | G4 A4 B4 C5 | repeat pattern.
 * No ties, tuplets, voices, or transposition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEASURE_DURATION = exports.DIVISIONS = void 0;
exports.getBaselineMeasures = getBaselineMeasures;
exports.DIVISIONS = 4;
exports.MEASURE_DURATION = 16; // 4 quarters * 4 divisions
/** MIDI note numbers for C4–C5 (60–72). */
const MELODY = [
    60, 62, 64, 65, // C4 D4 E4 F4
    67, 69, 71, 72, // G4 A4 B4 C5
    72, 71, 69, 67, // C5 B4 A4 G4
    65, 64, 62, 60, // F4 E4 D4 C4
    60, 62, 64, 65,
    67, 69, 71, 72,
    72, 71, 69, 67,
    65, 64, 62, 60,
];
function getBaselineMeasures() {
    const measures = [];
    for (let i = 0; i < 8; i++) {
        measures.push({
            index: i,
            notes: MELODY.slice(i * 4, (i + 1) * 4),
        });
    }
    return measures;
}
