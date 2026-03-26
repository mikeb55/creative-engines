"use strict";
/**
 * Composer OS V2 — Release Readiness Gate scorer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeReleaseReadiness = computeReleaseReadiness;
const readinessTypes_1 = require("./readinessTypes");
const CATEGORIES = [
    'architecture_discipline',
    'runtime_reliability',
    'musical_readiness',
    'validation_coverage',
    'export_interoperability',
    'user_friction',
];
/** Stub: score release readiness. Returns typed result. */
function computeReleaseReadiness(input) {
    const baseScore = input.validationPassed && input.exportValid ? 0.9 : 0.5;
    const scores = CATEGORIES.map((cat) => {
        let score = baseScore;
        if (cat === 'validation_coverage')
            score = input.validationPassed ? 0.9 : 0.5;
        if (cat === 'export_interoperability')
            score = input.exportValid ? 0.9 : 0.5;
        if (cat === 'architecture_discipline')
            score = 0.9;
        return { category: cat, score, passed: score >= readinessTypes_1.RRG_THRESHOLD };
    });
    const overall = scores.reduce((a, c) => a + c.score, 0) / scores.length;
    const passed = scores.every((c) => c.passed) && overall >= readinessTypes_1.RRG_THRESHOLD;
    return { passed, overall, categories: scores };
}
