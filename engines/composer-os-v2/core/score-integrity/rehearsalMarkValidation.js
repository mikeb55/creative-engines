"use strict";
/**
 * Composer OS V2 — Rehearsal mark validation
 * Rehearsal mark completeness.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRehearsalMarks = validateRehearsalMarks;
/** Validate rehearsal marks when required. */
function validateRehearsalMarks(marks, required = false) {
    const errors = [];
    if (required && marks.length === 0) {
        errors.push('Rehearsal marks required but none provided');
    }
    for (const m of marks) {
        if (!m.label || m.label.trim() === '') {
            errors.push(`Empty rehearsal mark at bar ${m.bar}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
