"use strict";
/**
 * Composer OS V2 — Density curve validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDensityCurve = validateDensityCurve;
function validateDensityCurve(plan, sections) {
    const errors = [];
    const covered = plan.segments.reduce((sum, s) => sum + s.length, 0);
    if (covered !== plan.totalBars)
        errors.push(`Density curve covers ${covered} bars, expected ${plan.totalBars}`);
    if (plan.segments.length !== sections.length)
        errors.push('Density segments must match sections');
    return { valid: errors.length === 0, errors };
}
