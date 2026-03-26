"use strict";
/**
 * Composer OS V2 — Density curve planner
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.planDensityCurve = planDensityCurve;
exports.getDensityForBar = getDensityForBar;
function roleToDensity(role) {
    const t = role.metadata.densityTendency;
    if (t === 'sparse')
        return 'sparse';
    if (t === 'dense')
        return 'dense';
    return 'medium';
}
function planDensityCurve(sections, totalBars) {
    const segments = sections.map((s) => ({
        startBar: s.startBar,
        length: s.length,
        level: roleToDensity(s),
    }));
    return { segments, totalBars };
}
function getDensityForBar(plan, bar) {
    for (const seg of plan.segments) {
        if (bar >= seg.startBar && bar < seg.startBar + seg.length)
            return seg.level;
    }
    return 'medium';
}
