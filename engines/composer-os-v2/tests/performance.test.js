"use strict";
/**
 * Composer OS V2 — Performance pass tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPerformanceTests = runPerformanceTests;
const performancePass_1 = require("../core/performance/performancePass");
const performanceValidation_1 = require("../core/performance/performanceValidation");
const scoreEventBuilder_1 = require("../core/score-model/scoreEventBuilder");
function testArticulationAdded() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1, 'Cmaj7');
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(60, 0, 0.5));
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(62, 1, 3));
    const score = (0, scoreEventBuilder_1.createScore)('T', [{
            id: 'guitar',
            name: 'G',
            instrumentIdentity: 'clean_electric_guitar',
            midiProgram: 27,
            clef: 'treble',
            measures: [m],
        }]);
    const out = (0, performancePass_1.applyPerformancePass)(score);
    const note1 = out.parts[0].measures[0].events[0];
    const note2 = out.parts[0].measures[0].events[1];
    return note1.articulation === 'staccato' &&
        note2.articulation === 'tenuto';
}
function testNoPitchChanges() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1, 'Cmaj7');
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(60, 0, 2));
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(64, 2, 2));
    const score = (0, scoreEventBuilder_1.createScore)('T', [{
            id: 'guitar',
            name: 'G',
            instrumentIdentity: 'clean_electric_guitar',
            midiProgram: 27,
            clef: 'treble',
            measures: [m],
        }]);
    const out = (0, performancePass_1.applyPerformancePass)(score);
    const valid = (0, performanceValidation_1.validatePerformanceIntegrity)(score, out);
    return valid.valid;
}
function testBarMathPreserved() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1, 'Cmaj7');
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(60, 0, 2));
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(62, 2, 2));
    const score = (0, scoreEventBuilder_1.createScore)('T', [{
            id: 'guitar',
            name: 'G',
            instrumentIdentity: 'clean_electric_guitar',
            midiProgram: 27,
            clef: 'treble',
            measures: [m],
        }]);
    const out = (0, performancePass_1.applyPerformancePass)(score);
    const measure = out.parts[0].measures[0];
    const total = measure.events.reduce((s, e) => s + e.duration, 0);
    return Math.abs(total - 4) < 0.01;
}
function testPitchDriftFails() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1, 'Cmaj7');
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(60, 0, 1));
    const before = (0, scoreEventBuilder_1.createScore)('B', [{
            id: 'guitar',
            name: 'G',
            instrumentIdentity: 'clean_electric_guitar',
            midiProgram: 27,
            clef: 'treble',
            measures: [m],
        }]);
    const m2 = (0, scoreEventBuilder_1.createMeasure)(1, 'Cmaj7');
    (0, scoreEventBuilder_1.addEvent)(m2, (0, scoreEventBuilder_1.createNote)(62, 0, 1));
    const after = (0, scoreEventBuilder_1.createScore)('A', [{
            id: 'guitar',
            name: 'G',
            instrumentIdentity: 'clean_electric_guitar',
            midiProgram: 27,
            clef: 'treble',
            measures: [m2],
        }]);
    const valid = (0, performanceValidation_1.validatePerformanceIntegrity)(before, after);
    return !valid.valid;
}
function runPerformanceTests() {
    return [
        ['Articulation added', testArticulationAdded],
        ['No pitch changes', testNoPitchChanges],
        ['Bar math preserved', testBarMathPreserved],
        ['Pitch drift fails validation', testPitchDriftFails],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
