"use strict";
/**
 * Composer OS V2 — Section role planner
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.planSectionRoles = planSectionRoles;
const ROLE_METADATA = {
    statement: { role: 'statement', densityTendency: 'sparse', registerTendency: 'centre', rhythmActivity: 'low', textureTendency: 'melodic' },
    development: { role: 'development', densityTendency: 'medium', registerTendency: 'centre', rhythmActivity: 'medium', textureTendency: 'mixed' },
    contrast: { role: 'contrast', densityTendency: 'medium', registerTendency: 'lift', rhythmActivity: 'medium', textureTendency: 'mixed' },
    return: { role: 'return', densityTendency: 'sparse', registerTendency: 'centre', rhythmActivity: 'low', textureTendency: 'melodic' },
};
function planSectionRoles(sections, roleMap) {
    return sections.map((s) => ({
        ...s,
        role: roleMap[s.label] ?? 'statement',
        metadata: ROLE_METADATA[roleMap[s.label] ?? 'statement'],
    }));
}
