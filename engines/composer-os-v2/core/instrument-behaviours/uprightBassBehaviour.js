"use strict";
/**
 * Composer OS V2 — Upright bass behaviour
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.planBassBehaviour = planBassBehaviour;
const densityCurvePlanner_1 = require("../density/densityCurvePlanner");
function planBassBehaviour(sections, densityPlan, registerMap) {
    const perBar = [];
    const regBySection = new Map(registerMap.sections.map((s) => [s.sectionLabel, s]));
    const sectionForBar = (bar) => sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
    for (let bar = 1; bar <= densityPlan.totalBars; bar++) {
        const section = sectionForBar(bar);
        const density = (0, densityCurvePlanner_1.getDensityForBar)(densityPlan, bar);
        const regSection = section ? regBySection.get(section.label) : registerMap.sections[0];
        const [low, high] = regSection?.preferredZone ?? [36, 55];
        const activity = density === 'sparse' ? 'sparse' : density === 'medium' ? 'walking' : 'walking';
        const eventCount = density === 'sparse' ? 2 : 4;
        const harmonicAnchor = true;
        perBar.push({ bar, activity, eventCount, harmonicAnchor, registerTarget: [low, high] });
    }
    return { instrumentIdentity: 'acoustic_upright_bass', perBar };
}
