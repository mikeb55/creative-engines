"use strict";
/**
 * Ellington Acceptance Generator — deterministic proof that notation architecture works.
 * 8 bars, proper part list, simple section voicings, ranges enforced.
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
const ACCEPTANCE_DIR = path.join(ROOT, 'outputs', 'ellington', 'acceptance');
const OUTPUT_PATH = path.join(ACCEPTANCE_DIR, 'ellington_acceptance.musicxml');
const VALIDATION_PATH = path.join(ACCEPTANCE_DIR, 'validation_report.json');
const INSTRUMENTS = [
    { id: 'P1', name: 'Alto Sax 1', clef: 'treble', transposition: 9, concertPitch: 67 },
    { id: 'P2', name: 'Alto Sax 2', clef: 'treble', transposition: 9, concertPitch: 64 },
    { id: 'P3', name: 'Tenor Sax 1', clef: 'treble', transposition: 2, concertPitch: 60 },
    { id: 'P4', name: 'Tenor Sax 2', clef: 'treble', transposition: 2, concertPitch: 57 },
    { id: 'P5', name: 'Baritone Sax', clef: 'treble', transposition: 9, concertPitch: 48 },
    { id: 'P6', name: 'Trumpet 1', clef: 'treble', transposition: 2, concertPitch: 67 },
    { id: 'P7', name: 'Trumpet 2', clef: 'treble', transposition: 2, concertPitch: 64 },
    { id: 'P8', name: 'Trumpet 3', clef: 'treble', transposition: 2, concertPitch: 60 },
    { id: 'P9', name: 'Trumpet 4', clef: 'treble', transposition: 2, concertPitch: 57 },
    { id: 'P10', name: 'Trombone 1', clef: 'bass', transposition: 0, concertPitch: 55 },
    { id: 'P11', name: 'Trombone 2', clef: 'bass', transposition: 0, concertPitch: 52 },
    { id: 'P12', name: 'Trombone 3', clef: 'bass', transposition: 0, concertPitch: 48 },
    { id: 'P13', name: 'Bass Trombone', clef: 'bass', transposition: 0, concertPitch: 43 },
    { id: 'P14', name: 'Piano', clef: 'treble', transposition: 0, concertPitch: 60 },
    { id: 'P15', name: 'Bass', clef: 'bass', transposition: 0, concertPitch: 43 },
    { id: 'P16', name: 'Drums', clef: 'percussion', transposition: 0, concertPitch: 0 },
];
function buildAcceptanceScore() {
    const chords = ['Dm7', 'Dm7', 'G7', 'G7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7'];
    const measures = [];
    for (let m = 0; m < 8; m++) {
        const voiceSpecs = INSTRUMENTS.map((inst) => ({
            voice: 1,
            staff: 1,
            part: inst.id,
            events: inst.concertPitch > 0
                ? [{ pitch: inst.concertPitch + inst.transposition, startBeat: 0, duration: 4 }]
                : [{ pitch: 0, startBeat: 0, duration: 4 }],
        }));
        measures.push((0, barComposer_1.composeMeasure)(m, chords[m], voiceSpecs));
    }
    return {
        title: 'Ellington Acceptance',
        measures,
        parts: INSTRUMENTS.map((i) => i.id),
    };
}
function main() {
    fs.mkdirSync(ACCEPTANCE_DIR, { recursive: true });
    const score = buildAcceptanceScore();
    const validation = (0, notationValidation_1.validateEllingtonAcceptance)(score);
    fs.writeFileSync(VALIDATION_PATH, JSON.stringify(validation, null, 2), 'utf-8');
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }
    const partNames = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i.name]));
    const clefs = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i.clef]));
    const transpositions = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i.transposition]));
    const xml = (0, barFirstMusicXMLWriter_1.writeScoreToMusicXML)(score, {
        title: 'Ellington Acceptance',
        partNames,
        clefs,
        transpositions,
    });
    fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8');
    return { success: true, errors: [] };
}
const result = main();
if (!result.success) {
    console.error('Ellington acceptance validation failed:', result.errors);
    process.exit(1);
}
console.log('Ellington acceptance:', OUTPUT_PATH);
