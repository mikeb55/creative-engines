"use strict";
/**
 * Composer OS V2 — Regression fixture tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRegressionFixturesTests = runRegressionFixturesTests;
const runGoldenPath_1 = require("../../core/goldenPath/runGoldenPath");
const retroTestUtils_1 = require("./retroTestUtils");
const STABLE_SEED = 7777;
function testBarCountFixture() {
    const r = (0, runGoldenPath_1.runGoldenPath)(STABLE_SEED);
    const f = (0, retroTestUtils_1.extractFixture)(r.score, r.plans, r.readiness);
    return f.barCount === 8;
}
function testSectionLabelsFixture() {
    const r = (0, runGoldenPath_1.runGoldenPath)(STABLE_SEED + 1);
    const f = (0, retroTestUtils_1.extractFixture)(r.score, r.plans, r.readiness);
    return f.sectionLabels.length >= 1;
}
function testEventCountsByPart() {
    const r = (0, runGoldenPath_1.runGoldenPath)(STABLE_SEED + 2);
    const f = (0, retroTestUtils_1.extractFixture)(r.score, r.plans, r.readiness);
    const guitarCount = f.eventCountByPart['clean_electric_guitar'] ?? 0;
    const bassCount = f.eventCountByPart['acoustic_upright_bass'] ?? 0;
    return guitarCount >= 8 && bassCount >= 16;
}
function testPitchRangeSummaries() {
    const r = (0, runGoldenPath_1.runGoldenPath)(STABLE_SEED + 3);
    const f = (0, retroTestUtils_1.extractFixture)(r.score, r.plans, r.readiness);
    const guitar = f.pitchRangeByPart['clean_electric_guitar'];
    const bass = f.pitchRangeByPart['acoustic_upright_bass'];
    return !!guitar && guitar[0] >= 55 && guitar[1] <= 88 && !!bass && bass[0] >= 28 && bass[1] <= 55;
}
function testMotifPlacementBars() {
    const r = (0, runGoldenPath_1.runGoldenPath)(STABLE_SEED + 4);
    const f = (0, retroTestUtils_1.extractFixture)(r.score, r.plans, r.readiness);
    return f.motifPlacementBars.length >= 2;
}
function testChordSymbolCount() {
    const r = (0, runGoldenPath_1.runGoldenPath)(STABLE_SEED + 5);
    const f = (0, retroTestUtils_1.extractFixture)(r.score, r.plans, r.readiness);
    return f.chordSymbolCount >= 8;
}
function testRehearsalMarkBars() {
    const r = (0, runGoldenPath_1.runGoldenPath)(STABLE_SEED + 6);
    const f = (0, retroTestUtils_1.extractFixture)(r.score, r.plans, r.readiness);
    return f.rehearsalMarkBars.includes(1) && f.rehearsalMarkBars.includes(5);
}
function testStyleStackMetadata() {
    const r = (0, runGoldenPath_1.runGoldenPath)(STABLE_SEED + 7);
    const f = (0, retroTestUtils_1.extractFixture)(r.score, r.plans, r.readiness);
    return f.styleStackMetadata.primary === 'barry_harris';
}
function testReadinessThresholds() {
    const r = (0, runGoldenPath_1.runGoldenPath)(STABLE_SEED + 8);
    const f = (0, retroTestUtils_1.extractFixture)(r.score, r.plans, r.readiness);
    return f.readinessRelease >= 0 && f.readinessMx >= 0 && r.readiness.release >= 0 && r.readiness.mx >= 0;
}
function testInteractionFixture() {
    const r = (0, runGoldenPath_1.runGoldenPath)(STABLE_SEED + 9);
    const f = (0, retroTestUtils_1.extractFixture)(r.score, r.plans, r.readiness);
    return f.interactionPresent === true;
}
function runRegressionFixturesTests() {
    return [
        ['Bar count fixture', testBarCountFixture],
        ['Section labels fixture', testSectionLabelsFixture],
        ['Event counts by part', testEventCountsByPart],
        ['Pitch range summaries', testPitchRangeSummaries],
        ['Motif placement bars', testMotifPlacementBars],
        ['Chord symbol count', testChordSymbolCount],
        ['Rehearsal mark bars', testRehearsalMarkBars],
        ['Style stack metadata', testStyleStackMetadata],
        ['Readiness thresholds', testReadinessThresholds],
        ['Interaction fixture present', testInteractionFixture],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
