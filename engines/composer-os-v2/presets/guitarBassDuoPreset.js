"use strict";
/**
 * Composer OS V2 — Guitar/Bass Duo preset
 * Default: Clean Electric Guitar + Acoustic/Upright Bass
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.guitarBassDuoPreset = void 0;
const guitarProfile_1 = require("../core/instrument-profiles/guitarProfile");
const uprightBassProfile_1 = require("../core/instrument-profiles/uprightBassProfile");
exports.guitarBassDuoPreset = {
    id: 'guitar_bass_duo',
    name: 'Guitar/Bass Duo',
    instrumentProfiles: [guitarProfile_1.CLEAN_ELECTRIC_GUITAR, uprightBassProfile_1.ACOUSTIC_UPRIGHT_BASS],
    chordSymbolsEnabled: true,
    rehearsalMarksEnabled: true,
    defaultFeel: {
        mode: 'swing',
        intensity: 0.7,
        syncopationDensity: 'medium',
    },
};
