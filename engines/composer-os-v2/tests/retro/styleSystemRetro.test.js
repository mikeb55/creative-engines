"use strict";
/**
 * Composer OS V2 — Style System retro tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStyleSystemRetroTests = runStyleSystemRetroTests;
const runGoldenPath_1 = require("../../core/goldenPath/runGoldenPath");
const styleModuleTypes_1 = require("../../core/style-modules/styleModuleTypes");
function testStyleStackLoads() {
    const r = (0, runGoldenPath_1.runGoldenPath)(30);
    return !!r.plans?.styleStack && r.plans.styleStack.primary === 'barry_harris';
}
function testWeightsNormalize() {
    const w = (0, styleModuleTypes_1.normalizeStyleWeights)({
        primary: 'barry_harris',
        secondary: 'metheny',
        colour: 'triad_pairs',
        weights: { primary: 0.6, secondary: 0.25, colour: 0.15 },
    });
    const sum = w.primary + w.secondary + w.colour;
    return Math.abs(sum - 1) < 0.001 && w.primary > 0;
}
function testPrimarySecondaryColourApply() {
    const r = (0, runGoldenPath_1.runGoldenPath)(31);
    const stack = r.plans?.styleStack;
    return !!stack?.secondary && !!stack?.colour && (r.runManifest?.activeModules?.length ?? 0) >= 3;
}
function testMethenyAffectsOutput() {
    const r = (0, runGoldenPath_1.runGoldenPath)(32);
    const modules = r.runManifest?.activeModules ?? [];
    return modules.includes('metheny');
}
function testTriadPairsAffectsOutput() {
    const r = (0, runGoldenPath_1.runGoldenPath)(33);
    const modules = r.runManifest?.activeModules ?? [];
    return modules.includes('triad_pairs');
}
function testStyleBlendIntegrityPasses() {
    const r = (0, runGoldenPath_1.runGoldenPath)(34);
    return r.behaviourGatesPassed;
}
function testStyleStackNotInert() {
    const r = (0, runGoldenPath_1.runGoldenPath)(35);
    const stack = r.plans?.styleStack;
    return !!stack && stack.weights.primary > 0 && (r.runManifest?.activeModules?.length ?? 0) >= 1;
}
function runStyleSystemRetroTests() {
    return [
        ['Style stack loads', testStyleStackLoads],
        ['Weights normalize correctly', testWeightsNormalize],
        ['Primary/secondary/colour all apply', testPrimarySecondaryColourApply],
        ['Metheny affects output', testMethenyAffectsOutput],
        ['Triad pairs affects output', testTriadPairsAffectsOutput],
        ['Style blend integrity passes', testStyleBlendIntegrityPasses],
        ['Style stack not inert', testStyleStackNotInert],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
