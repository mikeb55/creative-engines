"use strict";
/**
 * Composer OS V2 — Register map planner
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.planGuitarRegisterMap = planGuitarRegisterMap;
exports.planBassRegisterMap = planBassRegisterMap;
const guitarProfile_1 = require("../instrument-profiles/guitarProfile");
const uprightBassProfile_1 = require("../instrument-profiles/uprightBassProfile");
function planGuitarRegisterMap(sections) {
    const [melLow, melHigh] = guitarProfile_1.CLEAN_ELECTRIC_GUITAR.preferredMelodicZone;
    const [dangerLow] = guitarProfile_1.CLEAN_ELECTRIC_GUITAR.highDangerZone;
    const plans = sections.map((s) => {
        const lift = s.role === 'contrast';
        return {
            sectionLabel: s.label,
            preferredZone: lift ? [melLow + 2, melHigh] : [melLow, melHigh - 2],
            dangerZone: [dangerLow, melHigh + 12],
            ceilingTendency: lift ? melHigh - 2 : melHigh - 4,
            floorTendency: melLow,
            contour: 'stable',
        };
    });
    return { instrumentIdentity: 'clean_electric_guitar', sections: plans };
}
function planBassRegisterMap(sections) {
    const [walkLow, walkHigh] = uprightBassProfile_1.ACOUSTIC_UPRIGHT_BASS.preferredWalkingZone;
    const [upperDanger] = uprightBassProfile_1.ACOUSTIC_UPRIGHT_BASS.upperDangerZone;
    const plans = sections.map((s) => ({
        sectionLabel: s.label,
        preferredZone: [walkLow, walkHigh],
        dangerZone: [upperDanger, upperDanger + 12],
        ceilingTendency: walkHigh - 2,
        floorTendency: walkLow,
        contour: 'stable',
    }));
    return { instrumentIdentity: 'acoustic_upright_bass', sections: plans };
}
