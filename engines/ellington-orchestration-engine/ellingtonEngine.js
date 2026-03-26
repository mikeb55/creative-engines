"use strict";
/**
 * Ellington Orchestration Engine — Main entry
 * Converts chord progressions into sectional orchestration plans and voicings.
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
exports.generateOrchestrationPlan = void 0;
exports.runEllingtonEngine = runEllingtonEngine;
exports.generateEllingtonOrchestration = generateEllingtonOrchestration;
const ellingtonGenerator_1 = require("./ellingtonGenerator");
const ellingtonProgressions_1 = require("./ellingtonProgressions");
const ellingtonVoicings_1 = require("./ellingtonVoicings");
__exportStar(require("./ellingtonTypes"), exports);
__exportStar(require("./ellingtonProgressions"), exports);
__exportStar(require("./ellingtonVoicings"), exports);
var ellingtonGenerator_2 = require("./ellingtonGenerator");
Object.defineProperty(exports, "generateOrchestrationPlan", { enumerable: true, get: function () { return ellingtonGenerator_2.generateOrchestrationPlan; } });
function runEllingtonEngine(input) {
    const { progression, parameters, seed } = input;
    return (0, ellingtonGenerator_1.generateOrchestrationPlan)(progression, parameters, seed ?? Date.now());
}
/**
 * Generate full orchestration with voicings for trumpets, trombones, saxes, rhythm.
 * Accepts chord progression as string (e.g. "Dm7 G7 Cmaj7") or ChordSegment[].
 */
function generateEllingtonOrchestration(progression, seed = Date.now()) {
    const segments = (0, ellingtonProgressions_1.parseProgression)(progression);
    const totalBars = segments.reduce((sum, s) => sum + s.bars, 0);
    return {
        trumpets: (0, ellingtonVoicings_1.generateSectionVoicings)(segments, 'trumpets', seed),
        trombones: (0, ellingtonVoicings_1.generateSectionVoicings)(segments, 'trombones', seed + 1),
        saxes: (0, ellingtonVoicings_1.generateSectionVoicings)(segments, 'saxes', seed + 2),
        rhythm: (0, ellingtonVoicings_1.generateSectionVoicings)(segments, 'rhythm', seed + 3),
        progression: segments,
        totalBars,
    };
}
