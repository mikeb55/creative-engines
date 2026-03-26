"use strict";
/**
 * Composer OS V2 — Conductor
 * Pipeline coordinator: form → feel → harmony → instrument → counterpoint → integrity → export → readiness.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runConductorPipeline = runConductorPipeline;
const guitarBassDuoPreset_1 = require("../../presets/guitarBassDuoPreset");
const ecmChamberPreset_1 = require("../../presets/ecmChamberPreset");
const bigBandPreset_1 = require("../../presets/bigBandPreset");
const rhythmEngine_1 = require("../rhythm-engine/rhythmEngine");
const scoreIntegrityGate_1 = require("../score-integrity/scoreIntegrityGate");
const releaseReadinessGate_1 = require("../readiness/releaseReadinessGate");
const createRunManifest_1 = require("../run-ledger/createRunManifest");
function getPreset(presetId) {
    if (presetId === 'guitar_bass_duo')
        return guitarBassDuoPreset_1.guitarBassDuoPreset;
    if (presetId === 'ecm_chamber')
        return ecmChamberPreset_1.ecmChamberPreset;
    if (presetId === 'big_band')
        return bigBandPreset_1.bigBandPreset;
    return guitarBassDuoPreset_1.guitarBassDuoPreset;
}
/** Build a minimal stub context for pipeline execution. */
function buildStubContext(seed, presetId) {
    const preset = getPreset(presetId);
    const feel = preset.defaultFeel;
    const release = (0, releaseReadinessGate_1.runReleaseReadinessGate)({
        validationPassed: true,
        exportValid: true,
        mxValid: true,
    });
    return {
        systemVersion: '2.0.0',
        presetId,
        seed,
        form: { sections: [], totalBars: 0 },
        feel,
        harmony: { segments: [], totalBars: 0 },
        motif: { activeMotifs: [], variants: {} },
        phrase: { segments: [], totalBars: 0 },
        register: {},
        density: { segments: [], totalBars: 0 },
        instrumentProfiles: preset.instrumentProfiles,
        chordSymbolPlan: { segments: [], totalBars: 0 },
        rehearsalMarkPlan: { marks: [] },
        generationMetadata: { generatedAt: new Date().toISOString() },
        validation: { gates: [], passed: true },
        readiness: { release: release.release, mx: release.mx },
    };
}
/**
 * Run the Composer OS pipeline (stub implementation).
 * Steps: form → feel → harmony → instrument behaviour → counterpoint → integrity → export → readiness.
 */
function runConductorPipeline(seed, presetId, activeModules = []) {
    const steps = [];
    const gateResults = [];
    try {
        const context = buildStubContext(seed, presetId);
        // Step 1: form (stub — already in context)
        steps.push({ step: 'form', success: true });
        // Step 2: feel (rhythm engine)
        const constraints = (0, rhythmEngine_1.computeRhythmicConstraints)(context.feel);
        steps.push({ step: 'feel', success: true });
        // Step 3: harmony (stub)
        steps.push({ step: 'harmony', success: true });
        // Step 4: instrument behaviour (stub)
        steps.push({ step: 'instrument_behaviour', success: true });
        // Step 5: counterpoint / texture (stub)
        steps.push({ step: 'counterpoint_texture', success: true });
        // Step 6: score integrity
        const integrityResult = (0, scoreIntegrityGate_1.runScoreIntegrityGate)({
            bars: [],
            instruments: [],
            chordSymbols: [],
            rehearsalMarks: [],
        });
        gateResults.push({
            gate: 'score_integrity',
            passed: integrityResult.passed,
            errors: integrityResult.errors,
        });
        steps.push({ step: 'score_integrity', success: integrityResult.passed });
        // Step 7: MusicXML export (stub)
        steps.push({ step: 'musicxml_export', success: true });
        // Step 8: MX validation (stub)
        steps.push({ step: 'mx_validation', success: true });
        // Step 9: readiness scoring
        const readiness = (0, releaseReadinessGate_1.runReleaseReadinessGate)({
            validationPassed: true,
            exportValid: true,
            mxValid: true,
        });
        steps.push({ step: 'readiness_scoring', success: readiness.release.passed });
        // Step 10: release gate
        steps.push({ step: 'release_gate', success: readiness.shareable });
        const validationPassed = gateResults.every((g) => g.passed);
        const contextWithValidation = {
            ...context,
            validation: { gates: gateResults, passed: validationPassed },
        };
        const runManifest = (0, createRunManifest_1.createRunManifest)({
            version: '2.0.0',
            seed,
            presetId,
            activeModules,
            feelMode: context.feel.mode,
            instrumentProfiles: context.instrumentProfiles.map((p) => p.instrumentIdentity),
            readinessScores: { release: readiness.release.overall, mx: readiness.mx.overall },
            validationPassed,
            timestamp: new Date().toISOString(),
        });
        return {
            success: true,
            context: contextWithValidation,
            pipelineSteps: steps,
            runManifest,
        };
    }
    catch (e) {
        steps.push({ step: 'release_gate', success: false });
        return {
            success: false,
            context: null,
            pipelineSteps: steps,
            error: e instanceof Error ? e.message : String(e),
        };
    }
}
