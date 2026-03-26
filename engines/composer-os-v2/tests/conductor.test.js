"use strict";
/**
 * Composer OS V2 — Conductor tests
 * Contract validity and pipeline execution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runConductorTests = runConductorTests;
const conductor_1 = require("../core/conductor/conductor");
const conductorValidation_1 = require("../core/conductor/conductorValidation");
function testConductorPipelineRuns() {
    const result = (0, conductor_1.runConductorPipeline)(12345, 'guitar_bass_duo');
    if (!result.success)
        return false;
    if (!result.context)
        return false;
    return result.pipelineSteps.length >= 10;
}
function testConductorResultValidation() {
    const result = (0, conductor_1.runConductorPipeline)(1, 'guitar_bass_duo');
    const validation = (0, conductorValidation_1.validateConductorResult)(result);
    return validation.valid;
}
function testConductorUsesPreset() {
    const result = (0, conductor_1.runConductorPipeline)(42, 'guitar_bass_duo');
    if (!result.success || !result.context)
        return false;
    const profiles = result.context.instrumentProfiles;
    return profiles.length >= 2;
}
function testConductorRunManifest() {
    const result = (0, conductor_1.runConductorPipeline)(999, 'ecm_chamber');
    if (!result.success || !result.runManifest)
        return false;
    return result.runManifest.seed === 999 && result.runManifest.presetId === 'ecm_chamber';
}
function testConductorAllPipelineSteps() {
    const result = (0, conductor_1.runConductorPipeline)(0, 'big_band');
    const steps = new Set(result.pipelineSteps.map((s) => s.step));
    const required = ['form', 'feel', 'harmony', 'instrument_behaviour', 'counterpoint_texture', 'score_integrity', 'musicxml_export', 'mx_validation', 'readiness_scoring', 'release_gate'];
    return required.every((s) => steps.has(s));
}
function runConductorTests() {
    return [
        ['Pipeline runs', testConductorPipelineRuns],
        ['Result validation passes', testConductorResultValidation],
        ['Uses preset instrument profiles', testConductorUsesPreset],
        ['Run manifest created', testConductorRunManifest],
        ['All pipeline steps present', testConductorAllPipelineSteps],
    ].map(([name, fn]) => ({ name: name, ok: fn() }));
}
