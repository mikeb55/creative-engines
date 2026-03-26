"use strict";
/**
 * Composer OS V2 — Barry Harris style module
 * Movement over static chords, 6th↔dim passing (light), guide tones, stepwise connections.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.barryHarrisModule = void 0;
exports.applyBarryHarris = applyBarryHarris;
const moduleTypes_1 = require("./moduleTypes");
function applyBarryHarris(context) {
    const overrides = context.styleOverrides ?? {};
    return {
        ...context,
        styleOverrides: {
            ...overrides,
            barryHarris: {
                passingMotion: true,
                guideToneEmphasis: true,
                stepwiseVoiceLeading: true,
                dominantGravity: true,
            },
        },
    };
}
exports.barryHarrisModule = {
    id: moduleTypes_1.BARRY_HARRIS_MODULE_ID,
    modify: applyBarryHarris,
};
