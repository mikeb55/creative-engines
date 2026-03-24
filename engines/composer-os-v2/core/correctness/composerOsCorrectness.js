"use strict";
/**
 * Single entry for Composer OS correctness gates (paths, bar math, bass identity, performance rules).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERFORMANCE_PASS_ALLOWS_DURATION_OR_BAR_CHANGES = exports.GUITAR_BASS_DUO_BASS_MIDI_PROGRAM_ZERO_BASED = exports.GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND = exports.GUITAR_BASS_DUO_BASS_PART_NAME = exports.validateGuitarBassDuoBassIdentityInMusicXml = exports.validateExportedMusicXmlBarMath = exports.validateStrictBarMath = exports.resolveOpenFolderTarget = void 0;
var composerOsOutputPaths_1 = require("../../app-api/composerOsOutputPaths");
Object.defineProperty(exports, "resolveOpenFolderTarget", { enumerable: true, get: function () { return composerOsOutputPaths_1.resolveOpenFolderTarget; } });
var scoreTitleDefaults_1 = require("../../app-api/scoreTitleDefaults");
Object.defineProperty(exports, "DEFAULT_GUITAR_BASS_DUO_SCORE_TITLE", { enumerable: true, get: function () { return scoreTitleDefaults_1.DEFAULT_GUITAR_BASS_DUO_SCORE_TITLE; } });
Object.defineProperty(exports, "resolveScoreTitleForPreset", { enumerable: true, get: function () { return scoreTitleDefaults_1.resolveScoreTitleForPreset; } });
var strictBarMath_1 = require("../score-integrity/strictBarMath");
Object.defineProperty(exports, "validateStrictBarMath", { enumerable: true, get: function () { return strictBarMath_1.validateStrictBarMath; } });
var validateMusicXmlBarMath_1 = require("../export/validateMusicXmlBarMath");
Object.defineProperty(exports, "validateExportedMusicXmlBarMath", { enumerable: true, get: function () { return validateMusicXmlBarMath_1.validateExportedMusicXmlBarMath; } });
var validateBassIdentityInMusicXml_1 = require("../export/validateBassIdentityInMusicXml");
Object.defineProperty(exports, "validateGuitarBassDuoBassIdentityInMusicXml", { enumerable: true, get: function () { return validateBassIdentityInMusicXml_1.validateGuitarBassDuoBassIdentityInMusicXml; } });
var guitarBassDuoExportNames_1 = require("../instrument-profiles/guitarBassDuoExportNames");
Object.defineProperty(exports, "GUITAR_BASS_DUO_BASS_PART_NAME", { enumerable: true, get: function () { return guitarBassDuoExportNames_1.GUITAR_BASS_DUO_BASS_PART_NAME; } });
Object.defineProperty(exports, "GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND", { enumerable: true, get: function () { return guitarBassDuoExportNames_1.GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND; } });
Object.defineProperty(exports, "GUITAR_BASS_DUO_BASS_MIDI_PROGRAM_ZERO_BASED", { enumerable: true, get: function () { return guitarBassDuoExportNames_1.GUITAR_BASS_DUO_BASS_MIDI_PROGRAM_ZERO_BASED; } });
var performanceRules_1 = require("../performance/performanceRules");
Object.defineProperty(exports, "PERFORMANCE_PASS_ALLOWS_DURATION_OR_BAR_CHANGES", { enumerable: true, get: function () { return performanceRules_1.PERFORMANCE_PASS_ALLOWS_DURATION_OR_BAR_CHANGES; } });
