"use strict";
/**
 * Composer OS V2 — Golden path retro tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGoldenPathRetroTests = runGoldenPathRetroTests;
const runGoldenPath_1 = require("../../core/goldenPath/runGoldenPath");
function testEightBarScore() {
    const r = (0, runGoldenPath_1.runGoldenPath)(1);
    const guitar = r.score.parts.find((p) => p.id === 'guitar');
    const bass = r.score.parts.find((p) => p.id === 'bass');
    return (guitar?.measures.length ?? 0) === 8 && (bass?.measures.length ?? 0) === 8;
}
function testSectionsABExist() {
    const r = (0, runGoldenPath_1.runGoldenPath)(2);
    const marks = new Map();
    for (const p of r.score.parts) {
        for (const m of p.measures) {
            if (m.rehearsalMark)
                marks.set(m.index, m.rehearsalMark);
        }
    }
    return marks.get(1) === 'A' && marks.get(5) === 'B';
}
function testRehearsalMarksBars1And5() {
    const r = (0, runGoldenPath_1.runGoldenPath)(3);
    const bars = [];
    for (const p of r.score.parts) {
        for (const m of p.measures) {
            if (m.rehearsalMark)
                bars.push(m.index);
        }
    }
    const unique = [...new Set(bars)];
    return unique.includes(1) && unique.includes(5);
}
function testChordSymbolsAllBars() {
    const r = (0, runGoldenPath_1.runGoldenPath)(4);
    for (const p of r.score.parts) {
        for (const m of p.measures) {
            if (!m.chord || m.chord.trim() === '')
                return false;
        }
    }
    return true;
}
function testExportSucceeds() {
    const r = (0, runGoldenPath_1.runGoldenPath)(5);
    return r.xml !== undefined && r.xml.length > 100;
}
function testMxValidationSucceeds() {
    const r = (0, runGoldenPath_1.runGoldenPath)(6);
    return r.mxValidationPassed;
}
function testRunManifestCreated() {
    const r = (0, runGoldenPath_1.runGoldenPath)(7);
    return r.runManifest !== undefined && typeof r.runManifest.timestamp === 'string';
}
function testBarCountStable() {
    const r = (0, runGoldenPath_1.runGoldenPath)(8);
    return r.score.parts.every((p) => p.measures.length === 8);
}
function testPerformancePassApplied() {
    const r = (0, runGoldenPath_1.runGoldenPath)(19);
    return !!r.xml && (r.xml.includes('<staccato') || r.xml.includes('<tenuto'));
}
function testInteractionPresent() {
    const r = (0, runGoldenPath_1.runGoldenPath)(9);
    return !!r.plans?.interactionPlan?.perSection?.length;
}
function runGoldenPathRetroTests() {
    return [
        ['8-bar score generated', testEightBarScore],
        ['Sections A and B exist', testSectionsABExist],
        ['Rehearsal marks at bars 1 and 5', testRehearsalMarksBars1And5],
        ['Chord symbols in all bars', testChordSymbolsAllBars],
        ['Export succeeds', testExportSucceeds],
        ['MX validation succeeds', testMxValidationSucceeds],
        ['Run manifest created', testRunManifestCreated],
        ['Bar count stable', testBarCountStable],
        ['Performance pass applied', testPerformancePassApplied],
        ['Interaction plan present', testInteractionPresent],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
