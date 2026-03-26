"use strict";
/**
 * Big Band Score Skeleton Desktop Generator — Architecture + Ellington + MusicXML export
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
const architectureGenerator_1 = require("./architectureGenerator");
const ellingtonEngine_1 = require("../ellington-orchestration-engine/ellingtonEngine");
const templateLibrary_1 = require("../ellington-orchestration-engine/templates/templateLibrary");
const scoreSkeletonExporter_1 = require("./export/scoreSkeletonExporter");
const STYLES = ['standard_swing', 'ellington_style', 'ballad_form'];
function segmentsForLength(progression, targetBars) {
    if (progression.length === 0)
        return [];
    const out = [];
    let bars = 0;
    let i = 0;
    while (bars < targetBars) {
        const seg = progression[i % progression.length];
        const take = Math.min(seg.bars, targetBars - bars);
        if (take > 0)
            out.push({ chord: seg.chord, bars: take });
        bars += take;
        i++;
    }
    return out;
}
function main() {
    const arg = process.argv[2] || 'ii_V_I_major';
    const styleArg = (process.argv[3] || 'standard_swing');
    const style = STYLES.includes(styleArg) ? styleArg : 'standard_swing';
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..');
    const outDir = path.join(rootDir, 'apps', 'big-band-architecture-desktop', 'outputs', 'score');
    fs.mkdirSync(outDir, { recursive: true });
    const template = templateLibrary_1.TEMPLATE_LIBRARY[arg] || templateLibrary_1.TEMPLATE_LIBRARY.ii_V_I_major;
    const progression = template.segments;
    const architecture = (0, architectureGenerator_1.generateArchitecture)(progression, {
        style,
        seed: Date.now(),
        progressionTemplate: arg,
    });
    const mergedBars = [];
    for (const section of architecture.sections) {
        const sectionProg = segmentsForLength(progression, section.length);
        const plan = (0, ellingtonEngine_1.runEllingtonEngine)({
            progression: sectionProg,
            parameters: {
                arrangementMode: section.leadSection === 'trumpets' || section.leadSection === 'tutti' ? 'shout'
                    : section.density === 'sparse' ? 'ballad' : 'classic',
            },
            seed: Date.now() + section.startBar,
        });
        const offset = section.startBar - 1;
        for (const b of plan.bars) {
            mergedBars.push({ ...b, bar: b.bar + offset });
        }
    }
    const arrangementPlan = {
        bars: mergedBars.sort((a, b) => a.bar - b.bar),
        totalBars: architecture.totalBars,
        progression,
    };
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5).replace(':', '');
    let runNum = 1;
    let runFolder = `${date}_${time}_run${String(runNum).padStart(2, '0')}`;
    while (fs.existsSync(path.join(outDir, runFolder))) {
        runNum++;
        runFolder = `${date}_${time}_run${String(runNum).padStart(2, '0')}`;
    }
    const runPath = path.join(outDir, runFolder);
    fs.mkdirSync(runPath, { recursive: true });
    const { musicXmlPath, structurePath, jsonPath } = (0, scoreSkeletonExporter_1.exportScoreSkeleton)(architecture, arrangementPlan, runPath);
    const runSummary = `# Run Summary

**Generated:** ${now.toISOString()}
**Template:** ${arg}
**Style:** ${style}
**Architecture:** ${architecture.name}

## Sections: ${architecture.sections.length}
## Total Bars: ${architecture.totalBars}
## Staves: 17

Outputs: score_skeleton.musicxml, score_structure.md, score_structure.json
`;
    fs.writeFileSync(path.join(runPath, 'run_summary.md'), runSummary, 'utf-8');
    return { runFolderPath: runPath, architecture };
}
try {
    const result = main();
    console.log(JSON.stringify(result));
}
catch (e) {
    console.log(JSON.stringify({ runFolderPath: '', architecture: null, error: String(e) }));
    process.exit(1);
}
