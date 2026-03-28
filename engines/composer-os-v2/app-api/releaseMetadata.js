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
        presetId: 'riff_generator',
        displayName: 'Riff Generator',
        capability: 'musicxml_generation',
        honestNote: 'Short loopable riffs (1–4 bars) to projects/riffs; LOCK grid, GCE-gated MusicXML.',
    },
    {
        presetId: 'song_mode',
        displayName: 'Song Mode',
        capability: 'musicxml_generation',
        honestNote: 'Song plan (hooks, sections, rules) then golden-path Guitar–Bass Duo realisation as exported MusicXML.',
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
