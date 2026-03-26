"use strict";
/**
 * Composer OS V2 — Section role validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSectionRoles = validateSectionRoles;
function validateSectionRoles(sections) {
    const errors = [];
    if (sections.length === 0)
        errors.push('At least one section required');
    return { valid: errors.length === 0, errors };
}
