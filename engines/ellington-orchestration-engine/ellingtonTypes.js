"use strict";
/**
 * Ellington Orchestration Engine — Type definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODE_PARAMS = exports.DEFAULT_PARAMS = exports.REED_SECTIONS = exports.BRASS_SECTIONS = exports.RHYTHM_SECTION = exports.TROMBONE_SECTION = exports.TRUMPET_SECTION = exports.SAX_SECTION = void 0;
exports.SAX_SECTION = ['alto1', 'alto2', 'tenor1', 'tenor2', 'baritone'];
exports.TRUMPET_SECTION = ['trumpet1', 'trumpet2', 'trumpet3', 'trumpet4'];
exports.TROMBONE_SECTION = ['trombone1', 'trombone2', 'trombone3', 'bass_trombone'];
exports.RHYTHM_SECTION = ['piano', 'guitar', 'bass', 'drums'];
exports.BRASS_SECTIONS = [...exports.TRUMPET_SECTION, ...exports.TROMBONE_SECTION];
exports.REED_SECTIONS = exports.SAX_SECTION;
exports.DEFAULT_PARAMS = {
    densityBias: 0.5,
    contrastBias: 0.6,
    backgroundFigureDensity: 0.4,
    tuttiThreshold: 0.85,
    callResponseStrength: 0.6,
    phraseSpan: 4,
    minLeadPersistence: 2,
    minSupportPersistence: 1,
    releaseBars: 2,
    intensificationBars: 2,
};
exports.MODE_PARAMS = {
    classic: {
        densityBias: 0.5,
        contrastBias: 0.65,
        backgroundFigureDensity: 0.4,
        tuttiThreshold: 0.85,
        callResponseStrength: 0.6,
        phraseSpan: 4,
        minLeadPersistence: 2,
        minSupportPersistence: 2,
        releaseBars: 2,
        intensificationBars: 2,
    },
    ballad: {
        densityBias: 0.3,
        contrastBias: 0.4,
        backgroundFigureDensity: 0.25,
        tuttiThreshold: 0.95,
        callResponseStrength: 0.35,
        phraseSpan: 4,
        minLeadPersistence: 3,
        minSupportPersistence: 3,
        releaseBars: 3,
        intensificationBars: 1,
    },
    shout: {
        densityBias: 0.7,
        contrastBias: 0.75,
        backgroundFigureDensity: 0.55,
        tuttiThreshold: 0.75,
        callResponseStrength: 0.7,
        phraseSpan: 2,
        minLeadPersistence: 1,
        minSupportPersistence: 1,
        releaseBars: 1,
        intensificationBars: 3,
    },
};
