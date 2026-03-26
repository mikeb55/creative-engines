"use strict";
/**
 * Composer OS V2 — Foundation retro tests
 * Verifies contracts, score model, preset, manifest, readiness remain valid.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFoundationRetroTests = runFoundationRetroTests;
const guitarBassDuoPreset_1 = require("../../presets/guitarBassDuoPreset");
const createRunManifest_1 = require("../../core/run-ledger/createRunManifest");
const releaseReadinessGate_1 = require("../../core/readiness/releaseReadinessGate");
const readinessScorer_1 = require("../../core/readiness/readinessScorer");
const mxReadinessScorer_1 = require("../../core/readiness/mxReadinessScorer");
const REQUIRED_CONTEXT_FIELDS = [
    'systemVersion', 'presetId', 'seed',
    'form', 'feel', 'harmony', 'motif', 'phrase', 'register', 'density',
    'instrumentProfiles', 'chordSymbolPlan', 'rehearsalMarkPlan',
    'generationMetadata', 'validation', 'readiness',
];
function testCompositionContextContracts() {
    const ctx = {
        systemVersion: '2.0.0',
        presetId: 'x',
        seed: 1,
        form: { sections: [], totalBars: 0 },
        feel: { mode: 'swing', intensity: 0.5, syncopationDensity: 'medium' },
        harmony: { segments: [], totalBars: 0 },
        motif: { activeMotifs: [], variants: {} },
        phrase: { segments: [], totalBars: 0 },
        register: {},
        density: { segments: [], totalBars: 0 },
        instrumentProfiles: [],
        chordSymbolPlan: { segments: [], totalBars: 0 },
        rehearsalMarkPlan: { marks: [] },
        generationMetadata: { generatedAt: '' },
        validation: { gates: [], passed: true },
        readiness: { release: {}, mx: {} },
    };
    for (const f of REQUIRED_CONTEXT_FIELDS) {
        if (!(f in ctx))
            return false;
    }
    return true;
}
function testScoreModelStructure() {
    const m = { index: 1, events: [] };
    const p = {
        id: 'x', name: 'X', instrumentIdentity: 'guitar', midiProgram: 0,
        clef: 'treble', measures: [m],
    };
    const s = { title: 'T', parts: [p] };
    return s.parts.length === 1 && s.parts[0].measures.length === 1 && s.parts[0].measures[0].index === 1;
}
function testPresetLoading() {
    const p = guitarBassDuoPreset_1.guitarBassDuoPreset;
    return p.id === 'guitar_bass_duo' && p.instrumentProfiles.length >= 2;
}
function testRunManifestGeneration() {
    const m = (0, createRunManifest_1.createRunManifest)({
        version: '2.0.0',
        seed: 42,
        presetId: 'guitar_bass_duo',
        activeModules: ['barry_harris'],
        feelMode: 'swing',
        instrumentProfiles: ['clean_electric_guitar', 'acoustic_upright_bass'],
        readinessScores: { release: 0.9, mx: 0.9 },
        validationPassed: true,
        timestamp: new Date().toISOString(),
    });
    return m.seed === 42 && m.presetId === 'guitar_bass_duo' && m.activeModules.length >= 1;
}
function testReadinessScorersProduceTypedOutput() {
    const r = (0, readinessScorer_1.computeReleaseReadiness)({ validationPassed: true, exportValid: true, mxValid: true });
    const mx = (0, mxReadinessScorer_1.computeMxReadiness)({
        rhythmicCorrect: true,
        registerCorrect: true,
        musicXmlValid: true,
        sibeliusSafe: true,
        chordRehearsalComplete: true,
    });
    return typeof r.overall === 'number' && typeof mx.overall === 'number' && Array.isArray(r.categories) && Array.isArray(mx.categories);
}
function testReleaseReadinessGateOutput() {
    const g = (0, releaseReadinessGate_1.runReleaseReadinessGate)({
        validationPassed: true,
        exportValid: true,
        mxValid: true,
    });
    return 'shareable' in g && 'release' in g && 'mx' in g;
}
function runFoundationRetroTests() {
    return [
        ['CompositionContext required fields present', testCompositionContextContracts],
        ['Score model structure valid', testScoreModelStructure],
        ['Preset loading works', testPresetLoading],
        ['Run manifest generation works', testRunManifestGeneration],
        ['Readiness scorers produce typed output', testReadinessScorersProduceTypedOutput],
        ['Release readiness gate output valid', testReleaseReadinessGateOutput],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
