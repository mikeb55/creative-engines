"use strict";
/**
 * Composer OS V2 — Guitar behaviour (Clean Electric Guitar)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.planGuitarBehaviour = planGuitarBehaviour;
const densityCurvePlanner_1 = require("../density/densityCurvePlanner");
function planGuitarBehaviour(sections, densityPlan, registerMap) {
    const perBar = [];
    const regBySection = new Map(registerMap.sections.map((s) => [s.sectionLabel, s]));
    const sectionForBar = (bar) => sections.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
    for (let bar = 1; bar <= densityPlan.totalBars; bar++) {
        const section = sectionForBar(bar);
        const density = (0, densityCurvePlanner_1.getDensityForBar)(densityPlan, bar);
        const regSection = section ? regBySection.get(section.label) : registerMap.sections[0];
        const [low, high] = regSection?.preferredZone ?? [55, 79];
        let textureMix;
        let eventCount;
        let sustainRatio;
        if (density === 'sparse') {
            textureMix = [{ type: 'melody', weight: 0.7 }, { type: 'dyad', weight: 0.3 }];
            eventCount = 1 + (bar % 2);
            sustainRatio = 0.7;
        }
        else if (density === 'medium') {
            textureMix = [{ type: 'melody', weight: 0.5 }, { type: 'dyad', weight: 0.4 }, { type: 'triad', weight: 0.1 }];
            eventCount = 2;
            sustainRatio = 0.6;
        }
        else {
            textureMix = [{ type: 'melody', weight: 0.4 }, { type: 'dyad', weight: 0.4 }, { type: 'triad', weight: 0.2 }];
            eventCount = 3;
            sustainRatio = 0.5;
        }
        perBar.push({ bar, textureMix, eventCount, sustainRatio, registerTarget: [low, high] });
    }
    return { instrumentIdentity: 'clean_electric_guitar', perBar };
}
