"use strict";
/**
 * Composer OS V2 — Score model tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScoreModelTests = runScoreModelTests;
const scoreEventBuilder_1 = require("../core/score-model/scoreEventBuilder");
const scoreModelValidation_1 = require("../core/score-model/scoreModelValidation");
function testMeasureCanContainNotes() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1);
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(60, 0, 2));
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(62, 2, 2));
    return m.events.length === 2 && m.events[0].kind === 'note';
}
function testMeasureCanContainRests() {
    const m = (0, scoreEventBuilder_1.createMeasure)(2);
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createRest)(0, 4));
    return m.events.length === 1 && m.events[0].kind === 'rest';
}
function testMeasureCanHaveChordAndRehearsal() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1, 'Cmaj7', 'A');
    return m.chord === 'Cmaj7' && m.rehearsalMark === 'A';
}
function testEventTyping() {
    const n = (0, scoreEventBuilder_1.createNote)(60, 0, 1);
    const r = (0, scoreEventBuilder_1.createRest)(0, 1);
    return n.kind === 'note' && n.pitch === 60 && r.kind === 'rest';
}
function testPartCreation() {
    const p = (0, scoreEventBuilder_1.createPart)('guitar', 'Guitar', 'clean_electric_guitar', 27, 'treble', 4, (i) => (i <= 2 ? 'Dm7' : 'G7'), (i) => (i === 1 ? 'A' : undefined));
    return p.measures.length === 4 && p.measures[0].chord === 'Dm7' && p.measures[0].rehearsalMark === 'A';
}
function testScoreValidationPassesWhenValid() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1);
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(60, 0, 4));
    const score = (0, scoreEventBuilder_1.createScore)('Test', [{ id: 'p1', name: 'P1', instrumentIdentity: 'guitar', midiProgram: 27, clef: 'treble', measures: [m] }]);
    const r = (0, scoreModelValidation_1.validateScoreModel)(score);
    return r.valid;
}
function testScoreValidationFailsWhenDurationWrong() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1);
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(60, 0, 2)); // only 2 beats
    const score = (0, scoreEventBuilder_1.createScore)('Test', [{ id: 'p1', name: 'P1', instrumentIdentity: 'guitar', midiProgram: 27, clef: 'treble', measures: [m] }]);
    const r = (0, scoreModelValidation_1.validateScoreModel)(score);
    return !r.valid;
}
function runScoreModelTests() {
    return [
        ['Measure can contain notes', testMeasureCanContainNotes],
        ['Measure can contain rests', testMeasureCanContainRests],
        ['Measure can have chord and rehearsal mark', testMeasureCanHaveChordAndRehearsal],
        ['Event typing works correctly', testEventTyping],
        ['Part creation works', testPartCreation],
        ['Score validation passes when valid', testScoreValidationPassesWhenValid],
        ['Score validation fails when duration wrong', testScoreValidationFailsWhenDurationWrong],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
