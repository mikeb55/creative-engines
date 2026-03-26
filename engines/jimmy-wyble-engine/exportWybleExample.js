"use strict";
/**
 * Wyble Etude — Export driver
 * Generates a single study from a JSON progression and exports to MusicXML.
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
const wybleEngine_1 = require("./wybleEngine");
const wybleMusicXMLExporter_1 = require("./wybleMusicXMLExporter");
function loadProgression(filePath) {
    const json = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(json);
}
function progressionToHarmonicContext(progression) {
    return {
        chords: progression.map(({ chord, bars: b }) => {
            const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7)?/i);
            if (!match)
                return { root: 'C', quality: 'maj', bars: b };
            let q = (match[2] ?? 'maj').toLowerCase();
            if (q === 'm7' || q === 'min7')
                q = 'min';
            if (q === '7' || q === 'dom7')
                q = 'dom';
            if (q === 'maj7')
                q = 'maj';
            return { root: match[1], quality: q, bars: b };
        }),
        key: 'C',
    };
}
function main() {
    const progressionPath = path.join(__dirname, '..', '..', 'progressions', 'ii_v_i.json');
    const progression = loadProgression(progressionPath);
    console.log('PROGRESSION LOADED');
    const phraseLength = progression.reduce((sum, seg) => sum + seg.bars, 0);
    const bars = phraseLength;
    const harmonicContext = progressionToHarmonicContext(progression);
    const output = (0, wybleEngine_1.generateWybleEtude)({
        harmonicContext,
        phraseLength,
        independenceBias: 0.8,
        contraryMotionBias: 0.7,
        dyadDensity: 0.6,
        chromaticismLevel: 0.2,
    });
    console.log('WYBLE ETUDE GENERATED');
    const result = {
        upper_line: output.upper_line,
        lower_line: output.lower_line,
        implied_harmony: output.implied_harmony,
        bars,
    };
    const musicXml = (0, wybleMusicXMLExporter_1.exportToMusicXML)(result, { title: 'Wyble Etude 01' });
    const outDir = path.join(__dirname, '..', '..', 'outputs', 'wyble');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'wyble_etude_01.musicxml');
    fs.writeFileSync(outPath, musicXml, 'utf-8');
    console.log('FILE WRITTEN');
    console.log('  ' + path.resolve(outPath) + '\n');
}
main();
