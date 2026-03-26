"use strict";
/**
 * Composer OS V2 — MX Readiness Score
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MX_READINESS_THRESHOLD = void 0;
exports.computeMxReadiness = computeMxReadiness;
/** Default MX threshold. */
exports.MX_READINESS_THRESHOLD = 0.85;
const MX_CATEGORIES = [
    'rhythmic_correctness',
    'register_correctness',
    'musicxml_validity',
    'sibelius_safe_profile',
    'chord_rehearsal_completeness',
    'export_integrity',
];
/** Stub: compute MX readiness. */
function computeMxReadiness(input) {
    const scores = MX_CATEGORIES.map((cat) => {
        let score = 0;
        if (cat === 'rhythmic_correctness' && input.rhythmicCorrect)
            score = 1;
        if (cat === 'register_correctness' && input.registerCorrect)
            score = 1;
        if (cat === 'musicxml_validity' && input.musicXmlValid)
            score = 1;
        if (cat === 'sibelius_safe_profile' && input.sibeliusSafe)
            score = 1;
        if (cat === 'chord_rehearsal_completeness' && input.chordRehearsalComplete)
            score = 1;
        if (cat === 'export_integrity')
            score = input.exportIntegrity !== false ? 1 : 0.5;
        if (score === 0)
            score = 0.5; // placeholder when unknown
        return { category: cat, score, passed: score >= exports.MX_READINESS_THRESHOLD };
    });
    const overall = scores.reduce((a, c) => a + c.score, 0) / scores.length;
    const passed = scores.every((c) => c.passed) && overall >= exports.MX_READINESS_THRESHOLD;
    return { passed, overall, categories: scores };
}
