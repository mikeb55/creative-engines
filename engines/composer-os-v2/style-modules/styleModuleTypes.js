"use strict";
/**
 * Composer OS V2 — Style module types
 * Style modules are modifiers only; no independent generation pipelines.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeStyleWeights = normalizeStyleWeights;
exports.styleStackToModuleIds = styleStackToModuleIds;
function normalizeStyleWeights(stack) {
    let p = stack.weights.primary;
    let s = stack.weights.secondary ?? 0;
    let c = stack.weights.colour ?? 0;
    const total = p + s + c || 1;
    return { primary: p / total, secondary: s / total, colour: c / total };
}
function styleStackToModuleIds(stack) {
    const ids = [stack.primary];
    if (stack.secondary)
        ids.push(stack.secondary);
    if (stack.colour)
        ids.push(stack.colour);
    return ids;
}
