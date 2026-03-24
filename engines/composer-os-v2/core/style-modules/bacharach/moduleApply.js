"use strict";
/**
 * Bacharach style module — lightweight phrase asymmetry + melodic harmony bias.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bacharachModule = void 0;
exports.applyBacharach = applyBacharach;
const moduleTypes_1 = require("./moduleTypes");
function applyBacharach(context) {
    const overrides = context.styleOverrides ?? {};
    return {
        ...context,
        styleOverrides: {
            ...overrides,
            bacharach: {
                phraseAsymmetry: true,
                melodyFirstHarmony: true,
                chromaticPassingWeight: 0.28,
                avoidCadenceCliches: true,
                elegantColour: true,
            },
        },
    };
}
exports.bacharachModule = {
    id: moduleTypes_1.BACHARACH_MODULE_ID,
    modify: applyBacharach,
};
