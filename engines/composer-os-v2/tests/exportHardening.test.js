"use strict";
/**
 * Composer OS V2 — Export hardening tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runExportHardeningTests = runExportHardeningTests;
const exportHardening_1 = require("../core/export/exportHardening");
const musicxmlExporter_1 = require("../core/export/musicxmlExporter");
const runGoldenPath_1 = require("../core/goldenPath/runGoldenPath");
const scoreEventBuilder_1 = require("../core/score-model/scoreEventBuilder");
function testValidExportPasses() {
    const r = (0, runGoldenPath_1.runGoldenPath)(70);
    if (!r.xml)
        return false;
    const result = (0, exportHardening_1.validateExportIntegrity)(r.xml);
    return result.valid;
}
function testMalformedFails() {
    const result = (0, exportHardening_1.validateExportIntegrity)('<invalid>');
    return !result.valid;
}
function testMissingPartListFails() {
    const xml = '<?xml?><score-partwise><part id="p1"><measure number="1"/></part></score-partwise>';
    const result = (0, exportHardening_1.validateExportIntegrity)(xml);
    return !result.valid;
}
function testCorruptStructureFails() {
    const xml = '<score-partwise></score-partwise>';
    const result = (0, exportHardening_1.validateExportIntegrity)(xml);
    return !result.valid;
}
function testExportContainsArticulation() {
    const m = (0, scoreEventBuilder_1.createMeasure)(1, 'Cmaj7');
    const n = (0, scoreEventBuilder_1.createNote)(60, 0, 0.5);
    n.articulation = 'staccato';
    (0, scoreEventBuilder_1.addEvent)(m, n);
    const score = (0, scoreEventBuilder_1.createScore)('T', [{
            id: 'guitar',
            name: 'G',
            instrumentIdentity: 'clean_electric_guitar',
            midiProgram: 27,
            clef: 'treble',
            measures: [m],
        }]);
    const out = (0, musicxmlExporter_1.exportScoreModelToMusicXml)(score);
    return out.success && !!out.xml && out.xml.includes('<staccato');
}
function runExportHardeningTests() {
    return [
        ['Valid export passes', testValidExportPasses],
        ['Malformed XML fails', testMalformedFails],
        ['Missing part-list fails', testMissingPartListFails],
        ['Corrupt structure fails', testCorruptStructureFails],
        ['Export contains articulation', testExportContainsArticulation],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
