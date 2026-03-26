"use strict";
/**
 * Counterpoint Acceptance Generator — deterministic proof that notation architecture works.
 * 8 bars, 2 lines, explicit bar structure, simple counterpoint.
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const barComposer_1 = require("../../shared/barComposer");
const barFirstMusicXMLWriter_1 = require("../../shared/barFirstMusicXMLWriter");
const notationValidation_1 = require("../../shared/notationValidation");
const ROOT = path.resolve(__dirname, '..', '..');
const ACCEPTANCE_DIR = path.join(ROOT, 'outputs', 'counterpoint', 'acceptance');
const OUTPUT_PATH = path.join(ACCEPTANCE_DIR, 'counterpoint_acceptance.musicxml');
const VALIDATION_PATH = path.join(ACCEPTANCE_DIR, 'validation_report.json');
function buildAcceptanceScore() {
    const measures = [];
    const line1Pitches = [60, 62, 64, 65, 67, 65, 64, 60];
    const line2Pitches = [48, 50, 52, 53, 55, 53, 52, 48];
    for (let m = 0; m < 8; m++) {
        const chord = m < 2 ? 'Dm7' : m < 4 ? 'G7' : 'Cmaj7';
        measures.push((0, barComposer_1.composeMeasure)(m, chord, [
            { voice: 1, staff: 1, part: 'P1', events: [{ pitch: line1Pitches[m], startBeat: 0, duration: 4 }] },
            { voice: 1, staff: 1, part: 'P2', events: [{ pitch: line2Pitches[m], startBeat: 0, duration: 4 }] },
        ]));
    }
    return { title: 'Counterpoint Acceptance', measures, parts: ['P1', 'P2'] };
}
function main() {
    fs.mkdirSync(ACCEPTANCE_DIR, { recursive: true });
    const score = buildAcceptanceScore();
    const validation = (0, notationValidation_1.validateAcceptanceScore)(score);
    fs.writeFileSync(VALIDATION_PATH, JSON.stringify(validation, null, 2), 'utf-8');
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }
    const xml = (0, barFirstMusicXMLWriter_1.writeScoreToMusicXML)(score, {
        title: 'Counterpoint Acceptance',
        partNames: { P1: 'Voice 1', P2: 'Voice 2' },
    });
    fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8');
    return { success: true, errors: [] };
}
const result = main();
if (!result.success) {
    console.error('Counterpoint acceptance validation failed:', result.errors);
    process.exit(1);
}
console.log('Counterpoint acceptance:', OUTPUT_PATH);
