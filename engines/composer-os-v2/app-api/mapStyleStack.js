"use strict";
/**
 * Map App API style stack to engine StyleStack (validated against registry).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveRawWeightsFromAppStyleStack = deriveRawWeightsFromAppStyleStack;
exports.mapAppStyleStackToEngine = mapAppStyleStackToEngine;
const styleModuleRegistry_1 = require("../core/style-modules/styleModuleRegistry");
function normalizeOptionalId(s) {
    if (s === undefined || s === null)
        return undefined;
    const t = String(s).trim();
    return t === '' ? undefined : t;
}
/** Raw weights before normalization (sum may be > 1). */
const PRIMARY_BLEND = {
    strong: 1.0,
    medium: 0.6,
    light: 0.3,
};
const SECONDARY_BLEND = {
    off: 0,
    light: 0.3,
    medium: 0.6,
};
const COLOUR_BLEND = {
    off: 0,
    subtle: 0.2,
    present: 0.4,
};
/**
 * Derive raw primary/secondary/colour weights from Style Blend or legacy numeric weights.
 * Exported for unit tests.
 */
function deriveRawWeightsFromAppStyleStack(stack) {
    if (stack.styleBlend) {
        const p = PRIMARY_BLEND[stack.styleBlend.primary];
        const sec = normalizeOptionalId(stack.secondary) !== undefined
            ? SECONDARY_BLEND[stack.styleBlend.secondary]
            : 0;
        const col = normalizeOptionalId(stack.colour) !== undefined ? COLOUR_BLEND[stack.styleBlend.colour] : 0;
        return { primary: p, secondary: sec, colour: col };
    }
    const w = stack.weights;
    if (!w) {
        return { primary: 1, secondary: 0, colour: 0 };
    }
    const p = typeof w.primary === 'number' ? w.primary : 1;
    const sec = typeof w.secondary === 'number' ? w.secondary : 0;
    const col = typeof w.colour === 'number' ? w.colour : 0;
    return { primary: p, secondary: sec, colour: col };
}
function mapAppStyleStackToEngine(stack) {
    const primary = stack.primary;
    if (!(0, styleModuleRegistry_1.getStyleModule)(primary)) {
        throw new Error(`Unknown style module: ${primary}`);
    }
    const secondary = normalizeOptionalId(stack.secondary);
    const colour = normalizeOptionalId(stack.colour);
    if (secondary !== undefined && !(0, styleModuleRegistry_1.getStyleModule)(secondary)) {
        throw new Error(`Unknown style module: ${secondary}`);
    }
    if (colour !== undefined && !(0, styleModuleRegistry_1.getStyleModule)(colour)) {
        throw new Error(`Unknown style module: ${colour}`);
    }
    const raw = deriveRawWeightsFromAppStyleStack(stack);
    const total = raw.primary + raw.secondary + raw.colour || 1;
    return {
        primary,
        secondary,
        colour,
        weights: {
            primary: raw.primary / total,
            secondary: raw.secondary / total,
            colour: raw.colour / total,
        },
    };
}
