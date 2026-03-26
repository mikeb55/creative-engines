"use strict";
/**
 * Wyble Batch Etude Generator
 * Loads corpus presets, generates 20 studies, exports only those scoring ≥ 9.0
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
const wybleAutoTest_1 = require("./wybleAutoTest");
const GCE_THRESHOLD = 9.0;
const BATCH_SIZE = 20;
function loadCorpusPreset(filePath) {
    const json = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(json);
}
function progressionToHarmonicContext(progression) {
    return {
        chords: progression.map(({ chord, bars }) => {
            const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|m7b5|dom7)?/i);
            if (!match)
                return { root: 'C', quality: 'maj', bars };
            let q = (match[2] ?? 'maj').toLowerCase();
            if (q === 'm7' || q === 'min7' || q === 'm7b5')
                q = 'min';
            if (q === '7' || q === 'dom7')
                q = 'dom';
            if (q === 'maj7')
                q = 'maj';
            return { root: match[1], quality: q, bars };
        }),
        key: 'C',
    };
}
function main() {
    const corpusDir = path.join(__dirname, 'corpus');
    const presetPath = path.join(corpusDir, 'ii_v_i_cycle.json');
    const preset = loadCorpusPreset(presetPath);
    const harmonicContext = progressionToHarmonicContext(preset.progression);
    const bars = preset.progression.reduce((sum, seg) => sum + seg.bars, 0);
    const params = {
        harmonicContext,
        phraseLength: bars,
        independenceBias: 0.85,
        contraryMotionBias: 0.75,
        dyadDensity: 0.55,
        chromaticismLevel: 0.15,
    };
    const results = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
        const output = (0, wybleEngine_1.generateWybleEtude)(params);
        const score = (0, wybleAutoTest_1.evaluateWybleStudy)(output);
        results.push({ output, score });
    }
    const passing = results.filter(r => r.score >= GCE_THRESHOLD);
    const outDir = path.join(__dirname, '..', '..', 'outputs', 'wyble', 'etudes');
    fs.mkdirSync(outDir, { recursive: true });
    passing.forEach((r, idx) => {
        const result = {
            upper_line: r.output.upper_line,
            lower_line: r.output.lower_line,
            implied_harmony: r.output.implied_harmony,
            bars,
        };
        const filename = `wyble_etude_${String(idx + 1).padStart(2, '0')}.musicxml`;
        const outPath = path.join(outDir, filename);
        const musicXml = (0, wybleMusicXMLExporter_1.exportToMusicXML)(result, {
            title: `Wyble Etude ${idx + 1} (GCE ${r.score.toFixed(1)})`,
        });
        fs.writeFileSync(outPath, musicXml, 'utf-8');
    });
    console.log('\nWYBLE BATCH GENERATION COMPLETE\n');
    console.log('Corpus preset: ' + preset.name);
    console.log('Studies generated: ' + BATCH_SIZE);
    console.log('Studies exported (≥' + GCE_THRESHOLD + '): ' + passing.length);
    console.log('Output directory: outputs/wyble/etudes\n');
}
main();
