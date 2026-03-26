"use strict";
/**
 * Ellington Template Library — Real-music progression templates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATE_LIBRARY = void 0;
exports.getTemplate = getTemplate;
exports.listTemplateIds = listTemplateIds;
exports.TEMPLATE_LIBRARY = {
    ii_V_I_major: {
        id: 'ii_V_I_major',
        name: 'ii-V-I Major',
        description: 'Classic jazz cadence in major',
        segments: [
            { chord: 'Dm7', bars: 2 },
            { chord: 'G7', bars: 2 },
            { chord: 'Cmaj7', bars: 4 },
        ],
    },
    jazz_blues: {
        id: 'jazz_blues',
        name: 'Jazz Blues',
        description: 'F blues progression',
        segments: [
            { chord: 'F7', bars: 4 },
            { chord: 'Bb7', bars: 2 },
            { chord: 'F7', bars: 2 },
            { chord: 'C7', bars: 2 },
            { chord: 'Bb7', bars: 2 },
        ],
    },
    rhythm_changes_A: {
        id: 'rhythm_changes_A',
        name: 'Rhythm Changes A',
        description: 'I-VI-ii-V in Bb',
        segments: [
            { chord: 'Bb6', bars: 2 },
            { chord: 'G7', bars: 2 },
            { chord: 'Cm7', bars: 2 },
            { chord: 'F7', bars: 2 },
        ],
    },
    beatrice_A: {
        id: 'beatrice_A',
        name: 'Beatrice A',
        description: 'Sam Rivers standard',
        segments: [
            { chord: 'Fmaj7', bars: 2 },
            { chord: 'Gbmaj7#11', bars: 2 },
            { chord: 'Fmaj7', bars: 2 },
            { chord: 'Emaj7#11', bars: 2 },
            { chord: 'Dm7', bars: 2 },
            { chord: 'Ebmaj7#11', bars: 2 },
            { chord: 'Dm7', bars: 2 },
            { chord: 'Cm7', bars: 1 },
            { chord: 'Bb7', bars: 1 },
        ],
    },
    orbit_A: {
        id: 'orbit_A',
        name: 'Orbit A',
        description: 'Wayne Shorter composition',
        segments: [
            { chord: 'Fmaj7b5', bars: 2 },
            { chord: 'G#11/Eb', bars: 2 },
            { chord: 'Dbmaj7', bars: 2 },
            { chord: 'Bmaj7', bars: 2 },
            { chord: 'Bbm9', bars: 2 },
            { chord: 'Abmaj13', bars: 2 },
            { chord: 'Gbmaj7', bars: 2 },
            { chord: 'Emaj9', bars: 2 },
        ],
    },
};
function getTemplate(id) {
    return exports.TEMPLATE_LIBRARY[id];
}
function listTemplateIds() {
    return Object.keys(exports.TEMPLATE_LIBRARY);
}
