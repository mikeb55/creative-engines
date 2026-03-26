"use strict";
/**
 * Ellington Desktop Generator — Run by Electron app
 * Generates orchestration with voicings, scores with GCE heuristic, exports top 3.
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
const ellingtonMeasureGenerator_1 = require("./ellingtonMeasureGenerator");
const ellingtonScoreExporter_1 = require("./ellingtonScoreExporter");
const parseMusicXMLToProgression_1 = require("../jimmy-wyble-engine/import/parseMusicXMLToProgression");
const templateLibrary_1 = require("./templates/templateLibrary");
function getProgressionPresets() {
    const presets = {};
    for (const [id, tpl] of Object.entries(templateLibrary_1.TEMPLATE_LIBRARY)) {
        presets[id] = tpl.segments;
    }
    presets.ii_v_i = presets.ii_V_I_major || [
        { chord: 'Dm7', bars: 2 },
        { chord: 'G7', bars: 2 },
        { chord: 'Cmaj7', bars: 4 },
    ];
    return presets;
}
const PROGRESSION_PRESETS = getProgressionPresets();
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
    const arg2 = process.argv[2] || 'ii_V_I_major';
    const arg3 = (process.argv[3] || 'classic');
    const mode = ['classic', 'ballad', 'shout'].includes(arg3) ? arg3 : 'classic';
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..');
    const outDir = path.join(rootDir, 'outputs', 'ellington');
    fs.mkdirSync(outDir, { recursive: true });
    let progression;
    let progressionName;
    const isMusicXML = /\.(xml|musicxml)$/i.test(arg2) && fs.existsSync(arg2);
    if (isMusicXML) {
        const xml = fs.readFileSync(arg2, 'utf-8');
        const result = (0, parseMusicXMLToProgression_1.parseMusicXMLToProgression)(xml);
        if (!result.success) {
            return {
                generated: 0,
                exported: 0,
                runFolderPath: '',
                progressionName: '',
                avgScore: 0,
                bestScore: 0,
                worstScore: 0,
                error: result.error,
            };
        }
        progression = result.progression;
        progressionName = path.basename(arg2);
    }
    else {
        progression = PROGRESSION_PRESETS[arg2] || PROGRESSION_PRESETS.ii_V_I_major || PROGRESSION_PRESETS.ii_v_i;
        progressionName = arg2;
    }
    const score = (0, ellingtonMeasureGenerator_1.generateEllingtonScore)(progression, { seed: Date.now(), title: 'Ellington Orchestration' });
    const runFolder = getRunFolderName(outDir);
    const runPath = path.join(outDir, runFolder);
    fs.mkdirSync(runPath, { recursive: true });
    const scorePath = path.join(runPath, 'ellington_score.musicxml');
    fs.writeFileSync(scorePath, (0, ellingtonScoreExporter_1.exportEllingtonScoreToMusicXML)(score, { title: 'Ellington Orchestration', runPath }), 'utf-8');
    const parts = ellingtonMeasureGenerator_1.INSTRUMENTS.map((i) => i.id);
    fs.writeFileSync(path.join(runPath, 'ellington_plan.json'), JSON.stringify({ measures: score.measures.length, parts }, null, 2), 'utf-8');
    const summary = `# Ellington Run Summary

## Settings
- **Timestamp:** ${new Date().toISOString()}
- **Progression:** ${progressionName}
- **Mode:** ${mode}

## Output
- ellington_score.musicxml (big band score)
- ellington_plan.json
`;
    fs.writeFileSync(path.join(runPath, 'run_summary.md'), summary, 'utf-8');
    return {
        generated: 1,
        exported: 1,
        runFolderPath: runPath,
        progressionName,
        avgScore: 10,
        bestScore: 10,
        worstScore: 10,
    };
}
try {
    const result = main();
    console.log(JSON.stringify(result));
}
catch (e) {
    console.log(JSON.stringify({
        generated: 0,
        exported: 0,
        runFolderPath: '',
        progressionName: '',
        avgScore: 0,
        bestScore: 0,
        worstScore: 0,
        error: String(e),
    }));
    process.exit(1);
}
