"use strict";
/**
 * Keep in sync with releaseMetadata.ts (Node may resolve .js first).
 */
Object.defineProperty(exports, "__esModule", { value: true });
const composerOsConfig_1 = require("./composerOsConfig");
exports.COMPOSER_OS_VERSION = composerOsConfig_1.COMPOSER_OS_VERSION;
exports.COMPOSER_OS_V1_SUPPORTED_MODES = [
    {
        presetId: 'guitar_bass_duo',
        displayName: 'Guitar–Bass Duo',
        capability: 'musicxml_generation',
        honestNote: 'Full golden-path MusicXML generation.',
    },
    {
        presetId: 'ecm_chamber',
        displayName: 'ECM Chamber',
        capability: 'musicxml_generation',
        honestNote: 'Full chamber MusicXML generation (Metheny / Schneider modes).',
    },
    {
        presetId: 'song_mode',
        displayName: 'Song Mode',
        capability: 'song_structure',
        honestNote: 'Structural song + lead-sheet contract as JSON; no MusicXML lead-sheet export in this build.',
    },
    {
        presetId: 'big_band',
        displayName: 'Big Band',
        capability: 'planning_only',
        honestNote: 'Planning JSON only — no full ensemble MusicXML.',
    },
    {
        presetId: 'string_quartet',
        displayName: 'String Quartet',
        capability: 'planning_only',
        honestNote: 'Planning JSON only — no quartet MusicXML.',
    },
];
