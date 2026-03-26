"use strict";
/**
 * Composer OS V2 — Sibelius-safe export profile shell
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSibeliusSafe = checkSibeliusSafe;
/** Stub: check Sibelius-safe compliance. */
function checkSibeliusSafe(xml) {
    const issues = [];
    if (!xml.includes('<score-partwise')) {
        issues.push('Missing score-partwise root');
    }
    return {
        safe: issues.length === 0,
        issues,
    };
}
