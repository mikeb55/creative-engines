"use strict";
/**
 * Composer OS V2 — Release Readiness Gate
 * No output marked shareable unless thresholds pass.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReleaseReadinessGate = runReleaseReadinessGate;
const readinessScorer_1 = require("./readinessScorer");
const mxReadinessScorer_1 = require("./mxReadinessScorer");
const readinessTypes_1 = require("./readinessTypes");
const mxReadinessScorer_2 = require("./mxReadinessScorer");
/** Run release readiness gate. Output is shareable only if both pass. */
function runReleaseReadinessGate(input) {
    const release = (0, readinessScorer_1.computeReleaseReadiness)({
        validationPassed: input.validationPassed,
        exportValid: input.exportValid,
        mxValid: input.mxValid,
    });
    const mx = (0, mxReadinessScorer_1.computeMxReadiness)({
        rhythmicCorrect: input.rhythmicCorrect ?? false,
        registerCorrect: input.registerCorrect ?? false,
        musicXmlValid: input.mxValid ?? false,
        sibeliusSafe: input.sibeliusSafe ?? false,
        chordRehearsalComplete: input.chordRehearsalComplete ?? false,
        exportIntegrity: input.exportIntegrity ?? true,
    });
    const shareable = release.passed &&
        release.overall >= readinessTypes_1.RRG_THRESHOLD &&
        mx.passed &&
        mx.overall >= mxReadinessScorer_2.MX_READINESS_THRESHOLD &&
        input.exportRoundTrip !== false;
    return { shareable, release, mx };
}
