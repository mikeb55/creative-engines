"use strict";
/**
 * Composer OS V2 — ECM Chamber preset
 * Minimal chamber jazz configuration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecmChamberPreset = void 0;
const guitarProfile_1 = require("../core/instrument-profiles/guitarProfile");
const uprightBassProfile_1 = require("../core/instrument-profiles/uprightBassProfile");
exports.ecmChamberPreset = {
    id: 'ecm_chamber',
    name: 'ECM Chamber',
    instrumentProfiles: [guitarProfile_1.CLEAN_ELECTRIC_GUITAR, uprightBassProfile_1.ACOUSTIC_UPRIGHT_BASS],
    chordSymbolsEnabled: true,
    rehearsalMarksEnabled: true,
    defaultFeel: {
        mode: 'straight',
        intensity: 0.6,
        syncopationDensity: 'medium',
    },
};
