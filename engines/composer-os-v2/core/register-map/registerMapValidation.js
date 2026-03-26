"use strict";
/**
 * Composer OS V2 — Register map validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegisterMap = validateRegisterMap;
function validateRegisterMap(map) {
    const errors = [];
    for (const s of map.sections) {
        if (s.preferredZone[0] > s.preferredZone[1])
            errors.push(`Invalid preferred zone for ${s.sectionLabel}`);
        if (s.dangerZone[0] > s.dangerZone[1])
            errors.push(`Invalid danger zone for ${s.sectionLabel}`);
    }
    return { valid: errors.length === 0, errors };
}
