"use strict";
/**
 * Composer OS V2 — Rhythm Engine validation
 * Ensures feel settings are internally coherent.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFeelConfig = validateFeelConfig;
/** Validate feel config for internal coherence. */
function validateFeelConfig(feel) {
    const errors = [];
    if (feel.intensity < 0 || feel.intensity > 1) {
        errors.push('feel.intensity must be 0–1');
    }
    const validModes = ['swing', 'straight', 'hybrid'];
    if (!validModes.includes(feel.mode)) {
        errors.push(`feel.mode must be one of: ${validModes.join(', ')}`);
    }
    const validSync = ['low', 'medium', 'high'];
    if (!validSync.includes(feel.syncopationDensity)) {
        errors.push(`feel.syncopationDensity must be one of: ${validSync.join(', ')}`);
    }
    if (feel.mode === 'straight' && feel.syncopationDensity === 'high') {
        errors.push('straight mode with high syncopation is incoherent; prefer hybrid or swing');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
