"use strict";
/**
 * Composer OS V2 — Lock system tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runControlTests = runControlTests;
const lockManager_1 = require("../core/control/lockManager");
const lockValidation_1 = require("../core/control/lockValidation");
const runGoldenPath_1 = require("../core/goldenPath/runGoldenPath");
const scoreEventBuilder_1 = require("../core/score-model/scoreEventBuilder");
function testLockSnapshotMelody() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1, 'Cmaj7');
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(60, 0, 2));
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(62, 2, 2));
    const score = (0, scoreEventBuilder_1.createScore)('T', [{
            id: 'guitar',
            name: 'Guitar',
            instrumentIdentity: 'clean_electric_guitar',
            midiProgram: 27,
            clef: 'treble',
            measures: [m],
        }]);
    const snap = (0, lockManager_1.createLockSnapshot)(score, { melody: true });
    return !!snap.melody && snap.melody.pitchesByBar.get(1)?.length === 2;
}
function testApplyLocks() {
    const r = (0, runGoldenPath_1.runGoldenPath)(60);
    const ctx = (0, lockManager_1.applyLocks)({ score: r.score }, { melody: true, harmony: true });
    return !!ctx.lockContext?.locks.melody && !!ctx.lockContext?.snapshot.melody;
}
function testLockIntegrityUnchanged() {
    const r = (0, runGoldenPath_1.runGoldenPath)(61);
    const ctx = (0, lockManager_1.applyLocks)({ score: r.score }, { melody: true });
    if (!ctx.lockContext)
        return false;
    const valid = (0, lockValidation_1.validateLockIntegrity)(r.score, r.score, ctx.lockContext);
    return valid.valid;
}
function testLockIntegrityModifiedFails() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1, 'Cmaj7');
    (0, scoreEventBuilder_1.addEvent)(m, (0, scoreEventBuilder_1.createNote)(60, 0, 2));
    const orig = (0, scoreEventBuilder_1.createScore)('O', [{
            id: 'guitar',
            name: 'G',
            instrumentIdentity: 'clean_electric_guitar',
            midiProgram: 27,
            clef: 'treble',
            measures: [m],
        }]);
    const m2 = (0, scoreEventBuilder_1.createMeasure)(1, 'Cmaj7');
    (0, scoreEventBuilder_1.addEvent)(m2, (0, scoreEventBuilder_1.createNote)(62, 0, 2));
    const modified = (0, scoreEventBuilder_1.createScore)('M', [{
            id: 'guitar',
            name: 'G',
            instrumentIdentity: 'clean_electric_guitar',
            midiProgram: 27,
            clef: 'treble',
            measures: [m2],
        }]);
    const ctx = (0, lockManager_1.applyLocks)({ score: orig }, { melody: true });
    if (!ctx.lockContext)
        return false;
    const result = (0, lockValidation_1.validateLockIntegrity)(orig, modified, ctx.lockContext);
    return !result.valid;
}
function testRegenerateWithLocks() {
    const r = (0, runGoldenPath_1.runGoldenPath)(62);
    const ctx = (0, lockManager_1.applyLocks)({ score: r.score }, { bass: true });
    if (!ctx.lockContext)
        return false;
    const out = (0, lockManager_1.regenerateWithLocks)(r.score, r.score, ctx.lockContext);
    return out === r.score;
}
function runControlTests() {
    return [
        ['Lock snapshot captures melody', testLockSnapshotMelody],
        ['Apply locks to context', testApplyLocks],
        ['Lock integrity unchanged passes', testLockIntegrityUnchanged],
        ['Lock integrity modified fails', testLockIntegrityModifiedFails],
        ['Regenerate with locks returns score', testRegenerateWithLocks],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
