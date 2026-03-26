"use strict";
/**
 * Composer OS V2 — Triad Pairs module
 * Bergonzi structure, Klemons guitar-aware execution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.triadPairsModule = void 0;
exports.applyTriadPairs = applyTriadPairs;
const moduleTypes_1 = require("./moduleTypes");
function applyTriadPairs(context) {
    const overrides = context.styleOverrides ?? {};
    return {
        ...context,
        styleOverrides: {
            ...overrides,
            triadPairs: {
                pairedTriads: true,
                stableVsColourAlternation: true,
                dyadExtraction: true,
                syncopatedPlacement: true,
            },
        },
    };
}
exports.triadPairsModule = {
    id: moduleTypes_1.TRIAD_PAIRS_MODULE_ID,
    modify: applyTriadPairs,
};
