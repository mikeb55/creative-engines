"use strict";
/**
 * Style Blend → engine weight mapping
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMapStyleStackTests = runMapStyleStackTests;
const mapStyleStack_1 = require("../app-api/mapStyleStack");
function testBlendStrongOnly() {
    const r = (0, mapStyleStack_1.deriveRawWeightsFromAppStyleStack)({
        primary: 'barry_harris',
        styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
    });
    return r.primary === 1 && r.secondary === 0 && r.colour === 0;
}
function testBlendPrimaryMedium() {
    const r = (0, mapStyleStack_1.deriveRawWeightsFromAppStyleStack)({
        primary: 'barry_harris',
        styleBlend: { primary: 'medium', secondary: 'off', colour: 'off' },
    });
    return r.primary === 0.6 && r.secondary === 0 && r.colour === 0;
}
function testBlendWithSecondaryMedium() {
    const r = (0, mapStyleStack_1.deriveRawWeightsFromAppStyleStack)({
        primary: 'barry_harris',
        secondary: 'metheny',
        styleBlend: { primary: 'strong', secondary: 'medium', colour: 'off' },
    });
    return r.primary === 1 && r.secondary === 0.6 && r.colour === 0;
}
function testBlendIgnoresSecondaryWhenSlotEmpty() {
    const r = (0, mapStyleStack_1.deriveRawWeightsFromAppStyleStack)({
        primary: 'barry_harris',
        styleBlend: { primary: 'strong', secondary: 'medium', colour: 'off' },
    });
    return r.secondary === 0;
}
function testBlendColourPresent() {
    const r = (0, mapStyleStack_1.deriveRawWeightsFromAppStyleStack)({
        primary: 'barry_harris',
        colour: 'triad_pairs',
        styleBlend: { primary: 'strong', secondary: 'off', colour: 'present' },
    });
    return r.colour === 0.4;
}
function testNormalizedWeightsSumToOne() {
    const eng = (0, mapStyleStack_1.mapAppStyleStackToEngine)({
        primary: 'barry_harris',
        secondary: 'metheny',
        styleBlend: { primary: 'strong', secondary: 'medium', colour: 'off' },
    });
    const w = eng.weights;
    const sum = w.primary + (w.secondary ?? 0) + (w.colour ?? 0);
    return Math.abs(sum - 1) < 1e-6;
}
function testLegacyWeightsStillWork() {
    const eng = (0, mapStyleStack_1.mapAppStyleStackToEngine)({
        primary: 'barry_harris',
        weights: { primary: 1, secondary: 0.5, colour: 0.3 },
    });
    const w = eng.weights;
    const sum = w.primary + (w.secondary ?? 0) + (w.colour ?? 0);
    return Math.abs(sum - 1) < 1e-6;
}
function testStyleBlendPreferredOverLegacyWeights() {
    const eng = (0, mapStyleStack_1.mapAppStyleStackToEngine)({
        primary: 'barry_harris',
        weights: { primary: 0.1, secondary: 0.1, colour: 0.1 },
        styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
    });
    return eng.weights.primary === 1 && eng.weights.secondary === 0 && eng.weights.colour === 0;
}
function runMapStyleStackTests() {
    const results = [];
    const t = (name, fn) => results.push({ name, ok: fn() });
    t('Style blend: strong only raw weights', testBlendStrongOnly);
    t('Style blend: primary medium', testBlendPrimaryMedium);
    t('Style blend: secondary medium with module', testBlendWithSecondaryMedium);
    t('Style blend: secondary slot empty → zero', testBlendIgnoresSecondaryWhenSlotEmpty);
    t('Style blend: colour present', testBlendColourPresent);
    t('Style blend: normalized weights sum to 1', testNormalizedWeightsSumToOne);
    t('Legacy numeric weights still work', testLegacyWeightsStillWork);
    t('Style blend wins over legacy weights when both sent', testStyleBlendPreferredOverLegacyWeights);
    return results;
}
