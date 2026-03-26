"use strict";
/**
 * Contemporary Counterpoint Engine — Main entry
 * Exposes generateContemporaryCounterpoint(parameters)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateContemporaryCounterpoint = void 0;
exports.runContemporaryCounterpointEngine = runContemporaryCounterpointEngine;
const counterpointTypes_1 = require("./counterpointTypes");
const counterpointGenerator_1 = require("./counterpointGenerator");
__exportStar(require("./counterpointTypes"), exports);
var counterpointGenerator_2 = require("./counterpointGenerator");
Object.defineProperty(exports, "generateContemporaryCounterpoint", { enumerable: true, get: function () { return counterpointGenerator_2.generateContemporaryCounterpoint; } });
function runContemporaryCounterpointEngine(input) {
    const params = { ...counterpointTypes_1.DEFAULT_PARAMS, ...input.parameters };
    const segments = Array.isArray(input.harmonicContext)
        ? input.harmonicContext
        : input.harmonicContext.segments;
    const totalBars = Array.isArray(input.harmonicContext)
        ? segments.reduce((a, s) => a + s.bars, 0)
        : input.harmonicContext.totalBars;
    return (0, counterpointGenerator_1.generateContemporaryCounterpoint)({
        ...params,
        harmonicContext: segments,
        seed: input.seed ?? Date.now(),
    });
}
