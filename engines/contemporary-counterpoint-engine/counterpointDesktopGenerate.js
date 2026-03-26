"use strict";
/**
 * Contemporary Counterpoint Desktop Generator — Run by Electron app
 * Exports JSON plan, markdown summary, and simple MusicXML sketch.
 *
 * argv[2] = progression name (ii_v_i, jazz_cycle) or path to JSON
 * argv[3] = voice count (2–4)
 * argv[4] = density (0–1, optional)
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
const counterpointMeasureGenerator_1 = require("./counterpointMeasureGenerator");
const counterpointMusicXML_1 = require("./counterpointMusicXML");
const PROGRESSIONS = {
    ii_v_i: [
        { chord: 'Dm7', bars: 2 },
        { chord: 'G7', bars: 2 },
        { chord: 'Cmaj7', bars: 4 },
    ],
    jazz_cycle: [
        { chord: 'Dm7', bars: 2 },
        { chord: 'G7', bars: 2 },
        { chord: 'Cmaj7', bars: 2 },
        { chord: 'Am7', bars: 2 },
        { chord: 'D7', bars: 2 },
        { chord: 'Gmaj7', bars: 2 },
    ],
};
function getRunFolderName(outDir) {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5).replace(':', '');
    const prefix = `${date}_${time}_run`;
    let runNum = 1;
    while (fs.existsSync(path.join(outDir, `${prefix}${String(runNum).padStart(2, '0')}`))) {
        runNum++;
    }
    return `${prefix}${String(runNum).padStart(2, '0')}`;
}
function main() {
    const arg2 = process.argv[2] || 'ii_v_i';
    const lineCount = Math.min(4, Math.max(2, parseInt(process.argv[3] || '2', 10) || 2));
    const density = parseFloat(process.argv[4] || '0.5') || 0.5;
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..');
    const outDir = path.join(rootDir, 'outputs', 'counterpoint');
    fs.mkdirSync(outDir, { recursive: true });
    let progression;
    let progressionName;
    const isJsonPath = /\.json$/i.test(arg2) && fs.existsSync(arg2);
    if (isJsonPath) {
        progression = JSON.parse(fs.readFileSync(arg2, 'utf-8'));
        progressionName = path.basename(arg2);
    }
    else {
        progression = PROGRESSIONS[arg2] ?? PROGRESSIONS.ii_v_i;
        progressionName = arg2;
    }
    const score = (0, counterpointMeasureGenerator_1.generateCounterpointScore)(progression, {
        lineCount,
        seed: Date.now(),
    });
    const runFolder = getRunFolderName(outDir);
    const runFolderPath = path.join(outDir, runFolder);
    fs.mkdirSync(runFolderPath, { recursive: true });
    const parts = ['Voice 1', 'Voice 2'];
    const planPath = path.join(runFolderPath, 'counterpoint_plan.json');
    fs.writeFileSync(planPath, JSON.stringify({ measures: score.measures.length, parts }, null, 2), 'utf-8');
    const summary = `# Contemporary Counterpoint Summary

## Settings
- **Timestamp:** ${new Date().toISOString()}
- **Progression:** ${progressionName}
- **Voice count:** ${lineCount}
- **Total bars:** ${score.measures.length}

## Output
- Measures: ${score.measures.length}
- Parts: ${parts.join(', ')}

## Files
- counterpoint_plan.json
- counterpoint_summary.md
- counterpoint_sketch.musicxml
`;
    fs.writeFileSync(path.join(runFolderPath, 'counterpoint_summary.md'), summary, 'utf-8');
    const musicXml = (0, counterpointMusicXML_1.exportCounterpointScoreToMusicXML)(score, `Contemporary Counterpoint (${progressionName})`, { runPath: runFolderPath });
    fs.writeFileSync(path.join(runFolderPath, 'counterpoint_sketch.musicxml'), musicXml, 'utf-8');
    return {
        outputDir: outDir,
        runFolder,
        runFolderPath,
        progressionName,
        lineCount,
        totalBars: score.measures.length,
    };
}
try {
    const result = main();
    console.log(JSON.stringify(result));
}
catch (e) {
    console.log(JSON.stringify({
        outputDir: '',
        runFolder: '',
        runFolderPath: '',
        progressionName: '',
        lineCount: 0,
        totalBars: 0,
        error: String(e),
    }));
    process.exit(1);
}
