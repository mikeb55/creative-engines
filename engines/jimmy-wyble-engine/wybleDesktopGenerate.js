"use strict";
/**
 * Wyble Desktop Generator — Run by Electron app
 * Generates a pool of candidates, scores them, exports top-ranked only.
 * Creates timestamped run folders with run_summary.md.
 *
 * Accepts: argv[2] = preset name OR path to MusicXML file
 *          argv[3] = practice mode
 *          argv[4] = candidate count (default 40)
 *          argv[5] = export count (default 3)
 *          argv[6] = min GCE target (default 9.0)
 * Outputs JSON result to stdout for IPC.
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
const wybleMeasureGenerator_1 = require("./wybleMeasureGenerator");
const wybleScoreEvaluator_1 = require("./wybleScoreEvaluator");
const wybleMusicXMLExporter_1 = require("./wybleMusicXMLExporter");
const parseMusicXMLToProgression_1 = require("./import/parseMusicXMLToProgression");
const templateLibrary_1 = require("./templates/templateLibrary");
const PROGRESSION_FILES = {
    ii_v_i: 'ii_v_i.json',
    jazz_cycle: 'jazz_cycle.json',
    blues_basic: 'blues_basic.json',
};
const CANDIDATE_COUNT = 40;
const EXPORT_COUNT = 3;
const MIN_GCE_TARGET = 9.0;
function loadProgression(filePath) {
    const json = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(json);
}
function getRunFolderName(desktopOutDir) {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5).replace(':', '');
    const prefix = `${date}_${time}_run`;
    let runNum = 1;
    while (fs.existsSync(path.join(desktopOutDir, `${prefix}${String(runNum).padStart(2, '0')}`))) {
        runNum++;
    }
    return `${prefix}${String(runNum).padStart(2, '0')}`;
}
function main() {
    const arg2 = process.argv[2] || 'ii_v_i';
    const practiceMode = (process.argv[3] || 'etude');
    const candidateCount = parseInt(process.argv[4] || String(CANDIDATE_COUNT), 10) || CANDIDATE_COUNT;
    const exportCount = Math.max(1, parseInt(process.argv[5] || String(EXPORT_COUNT), 10) || EXPORT_COUNT);
    const minGce = parseFloat(process.argv[6] || String(MIN_GCE_TARGET)) || MIN_GCE_TARGET;
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..');
    const desktopOutDir = path.join(rootDir, 'outputs', 'wyble');
    fs.mkdirSync(desktopOutDir, { recursive: true });
    let progression;
    let bars;
    let progressionName;
    const isMusicXML = /\.(xml|musicxml)$/i.test(arg2) && fs.existsSync(arg2);
    if (isMusicXML) {
        const xml = fs.readFileSync(arg2, 'utf-8');
        const parseResult = (0, parseMusicXMLToProgression_1.parseMusicXMLToProgression)(xml);
        if (!parseResult.success) {
            return {
                generated: 0, exported: 0, outputDir: desktopOutDir, runFolder: '', runFolderPath: '',
                progressionName: '', practiceMode, scores: [], exportedScores: [], avgScore: 0, bestScore: 0, worstScore: 0, gceThresholdMet: false,
                error: parseResult.error,
            };
        }
        progression = parseResult.progression;
        bars = parseResult.totalBars;
        progressionName = path.basename(arg2);
    }
    else {
        const template = (0, templateLibrary_1.getTemplate)(arg2);
        if (template) {
            progression = template.progression;
            bars = progression.reduce((sum, seg) => sum + seg.bars, 0);
            progressionName = arg2;
        }
        else {
            const progressionFile = PROGRESSION_FILES[arg2] || 'ii_v_i.json';
            const progressionPath = path.join(rootDir, 'progressions', progressionFile);
            progression = loadProgression(progressionPath);
            bars = progression.reduce((sum, seg) => sum + seg.bars, 0);
            progressionName = arg2;
        }
    }
    const candidates = [];
    for (let i = 0; i < candidateCount; i++) {
        const score = (0, wybleMeasureGenerator_1.generateWybleScore)(progression, { seed: Date.now() + i * 13 });
        const gceScore = (0, wybleScoreEvaluator_1.scoreWybleMeasureFirst)(score);
        candidates.push({ score, gceScore });
    }
    const scores = candidates.map((c) => c.gceScore);
    const sorted = [...candidates].sort((a, b) => b.gceScore - a.gceScore);
    const toExport = sorted.slice(0, exportCount);
    const runFolder = getRunFolderName(desktopOutDir);
    const runFolderPath = path.join(desktopOutDir, runFolder);
    fs.mkdirSync(runFolderPath, { recursive: true });
    const exportedScores = [];
    for (let i = 0; i < toExport.length; i++) {
        const r = toExport[i];
        const scoreStr = r.gceScore.toFixed(2);
        const rankStr = String(i + 1).padStart(2, '0');
        const filename = `wyble_etude_GCE${scoreStr}_rank${rankStr}.musicxml`;
        const musicXml = (0, wybleMusicXMLExporter_1.exportScoreToMusicXML)(r.score, { title: `Wyble Etude rank ${i + 1} (GCE ${scoreStr})`, runPath: runFolderPath });
        fs.writeFileSync(path.join(runFolderPath, filename), musicXml, 'utf-8');
        exportedScores.push(r.gceScore);
    }
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);
    const gceThresholdMet = scores.filter((s) => s >= minGce).length >= exportCount;
    const summary = `# Wyble Desktop Generation Run Summary

## Settings
- **Timestamp:** ${new Date().toISOString()}
- **Progression:** ${progressionName}
- **Practice mode:** ${practiceMode}
- **Candidates generated:** ${candidateCount}
- **Export count:** ${exportCount}
- **Min GCE target:** ${minGce}

## Candidate Scores
- **Average:** ${avgScore.toFixed(2)}
- **Best:** ${bestScore.toFixed(2)}
- **Worst:** ${worstScore.toFixed(2)}
- **GCE ≥ ${minGce} threshold met:** ${gceThresholdMet ? 'YES' : 'NO'}

## Exported Files
${toExport.map((r, i) => `- wyble_etude_GCE${r.gceScore.toFixed(2)}_rank${String(i + 1).padStart(2, '0')}.musicxml (score: ${r.gceScore.toFixed(2)})`).join('\n')}
`;
    fs.writeFileSync(path.join(runFolderPath, 'run_summary.md'), summary, 'utf-8');
    return {
        generated: candidateCount,
        exported: toExport.length,
        outputDir: desktopOutDir,
        runFolder,
        runFolderPath,
        progressionName,
        practiceMode,
        scores,
        exportedScores,
        avgScore,
        bestScore,
        worstScore,
        gceThresholdMet,
    };
}
try {
    const result = main();
    console.log(JSON.stringify(result));
}
catch (e) {
    console.log(JSON.stringify({
        generated: 0, exported: 0, outputDir: '', runFolder: '', runFolderPath: '',
        progressionName: '', practiceMode: '', scores: [], exportedScores: [],
        avgScore: 0, bestScore: 0, worstScore: 0, gceThresholdMet: false,
        error: String(e),
    }));
    process.exit(1);
}
