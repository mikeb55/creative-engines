"use strict";
/**
 * Wyble Imported Progression Export
 * Generates 120+ studies from presets + MusicXML fixtures, exports top 5 to outputs/wyble/imported/
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
const wybleAutoTest_1 = require("./wybleAutoTest");
const wybleMusicXMLExporter_1 = require("./wybleMusicXMLExporter");
const parseMusicXMLToProgression_1 = require("./import/parseMusicXMLToProgression");
const TARGET_AVG = 9.0;
const TOTAL_STUDIES = 120;
const TOP_EXPORT = 5;
function progressionToHarmonicContext(progression) {
    const chords = progression.map(({ chord, bars }) => {
        const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7|m7b5)?/i);
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
    });
    return { chords, key: 'C' };
}
function main() {
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..');
    const fixturesDir = path.join(engineDir, 'import', 'fixtures');
    const progressionsDir = path.join(rootDir, 'progressions');
    const sources = [];
    const presetFiles = ['ii_v_i.json', 'blues_basic.json'];
    for (const f of presetFiles) {
        const p = path.join(progressionsDir, f);
        if (fs.existsSync(p)) {
            const prog = JSON.parse(fs.readFileSync(p, 'utf-8'));
            sources.push({ name: f, progression: prog, bars: prog.reduce((s, x) => s + x.bars, 0) });
        }
    }
    const xmlFixtures = ['ii_v_i_simple.xml', 'blues_simple.xml'];
    for (const f of xmlFixtures) {
        const p = path.join(fixturesDir, f);
        if (fs.existsSync(p)) {
            const xml = fs.readFileSync(p, 'utf-8');
            const result = (0, parseMusicXMLToProgression_1.parseMusicXMLToProgression)(xml);
            if (result.success) {
                sources.push({ name: f, progression: result.progression, bars: result.totalBars });
            }
        }
    }
    const allOutputs = [];
    let params = {
        harmonicContext: { chords: [{ root: 'C', quality: 'maj', bars: 1 }], key: 'C' },
        phraseLength: 8,
        independenceBias: 0.85,
        contraryMotionBias: 0.75,
        dyadDensity: 0.55,
        chromaticismLevel: 0.15,
    };
    const runsPerSource = Math.ceil(TOTAL_STUDIES / Math.max(1, sources.length));
    for (const src of sources) {
        const harmonicContext = progressionToHarmonicContext(src.progression);
        for (let i = 0; i < runsPerSource; i++) {
            const p = { ...params, harmonicContext, phraseLength: src.bars };
            const output = (0, wybleEngine_1.generateWybleEtude)(p);
            const score = (0, wybleAutoTest_1.evaluateWybleStudy)(output);
            allOutputs.push({ output, score, source: src.name });
        }
    }
    const sorted = [...allOutputs].sort((a, b) => b.score - a.score);
    const scores = sorted.map((x) => x.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);
    let iteration = 0;
    let currentParams = { ...params };
    let lastAvg = avgScore;
    while (lastAvg < TARGET_AVG && iteration < 15) {
        iteration++;
        currentParams.chromaticismLevel = Math.max(0.05, (currentParams.chromaticismLevel ?? 0.2) - 0.02);
        currentParams.dyadDensity = Math.min(0.7, (currentParams.dyadDensity ?? 0.6) + 0.02);
        currentParams.contraryMotionBias = Math.min(0.9, (currentParams.contraryMotionBias ?? 0.7) + 0.02);
        params = currentParams;
        const newOutputs = [];
        for (const src of sources) {
            const harmonicContext = progressionToHarmonicContext(src.progression);
            for (let i = 0; i < runsPerSource; i++) {
                const p = { ...params, harmonicContext, phraseLength: src.bars };
                const output = (0, wybleEngine_1.generateWybleEtude)(p);
                const score = (0, wybleAutoTest_1.evaluateWybleStudy)(output);
                newOutputs.push({ output, score, source: src.name });
            }
        }
        const newScores = newOutputs.map((x) => x.score);
        const newAvg = newScores.reduce((a, b) => a + b, 0) / newScores.length;
        if (newAvg >= lastAvg) {
            newOutputs.sort((a, b) => b.score - a.score);
            sorted.length = 0;
            sorted.push(...newOutputs);
            lastAvg = newAvg;
        }
        if (newAvg >= TARGET_AVG)
            break;
    }
    const outDir = path.join(rootDir, 'outputs', 'wyble', 'imported');
    fs.mkdirSync(outDir, { recursive: true });
    const importedSources = sorted.filter((x) => x.source.endsWith('.xml'));
    const toExport = importedSources.length >= TOP_EXPORT ? importedSources.slice(0, TOP_EXPORT) : sorted.slice(0, TOP_EXPORT);
    for (let i = 0; i < toExport.length; i++) {
        const r = toExport[i];
        const src = sources.find((s) => s.name === r.source);
        const bars = src ? src.bars : 8;
        const result = {
            upper_line: r.output.upper_line,
            lower_line: r.output.lower_line,
            implied_harmony: r.output.implied_harmony,
            bars,
        };
        const filename = `wyble_imported_${String(i + 1).padStart(2, '0')}.musicxml`;
        fs.writeFileSync(path.join(outDir, filename), (0, wybleMusicXMLExporter_1.exportToMusicXML)(result, { title: `Wyble Imported ${i + 1} (GCE ${r.score.toFixed(1)})` }), 'utf-8');
    }
    const finalScores = sorted.map((x) => x.score);
    const finalAvg = finalScores.reduce((a, b) => a + b, 0) / finalScores.length;
    console.log('\nWYBLE IMPORTED EXPORT COMPLETE\n');
    console.log('Sources:', sources.map((s) => s.name).join(', '));
    console.log('Studies generated:', TOTAL_STUDIES);
    console.log('Average score:', finalAvg.toFixed(2));
    console.log('Best score:', Math.max(...finalScores).toFixed(2));
    console.log('Worst score:', Math.min(...finalScores).toFixed(2));
    console.log('GCE ≥9 reached:', finalAvg >= TARGET_AVG ? 'YES' : 'NO');
    console.log('Exported: outputs/wyble/imported/\n');
}
main();
