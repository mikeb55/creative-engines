"use strict";
/**
 * Composer OS V2 — Metheny style module
 * Lyrical, intervallic, sustain, reduced attack density.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.methenyModule = void 0;
exports.applyMetheny = applyMetheny;
const moduleTypes_1 = require("./moduleTypes");
function applyMetheny(context) {
    const overrides = context.styleOverrides ?? {};
    return {
        ...context,
        styleOverrides: {
            ...overrides,
            metheny: {
                lyricalMotif: true,
                intervallicShapes: true,
                sustainTendency: 0.7,
                attackDensityReduced: true,
                phraseOverBarlines: true,
            },
        },
    };
}
exports.methenyModule = {
    id: moduleTypes_1.METHENY_MODULE_ID,
    modify: applyMetheny,
};
