"use strict";
/**
 * Selective Big-Band Generation Desktop — Generate note-level material for a target type
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
const architectureGenerator_1 = require("../big-band-architecture-engine/architectureGenerator");
const ellingtonEngine_1 = require("../ellington-orchestration-engine/ellingtonEngine");
const arrangerAssistGenerator_1 = require("../arranger-assist-engine/arrangerAssistGenerator");
const selectiveGenerationGenerator_1 = require("./selectiveGenerationGenerator");
const selectiveMaterialMusicXML_1 = require("./selectiveMaterialMusicXML");
const templateLibrary_1 = require("../ellington-orchestration-engine/templates/templateLibrary");
const STYLES = ['standard_swing', 'ellington_style', 'ballad_form'];
const TARGET_TYPES = ['background_figures', 'brass_punctuation', 'sax_soli_texture', 'shout_ramp_material'];
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
    const targetArg = (process.argv[4] || 'background_figures');
    const style = STYLES.includes(styleArg) ? styleArg : 'standard_swing';
    const targetType = TARGET_TYPES.includes(targetArg) ? targetArg : 'background_figures';
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..');
    const outDir = path.join(rootDir, 'apps', 'big-band-architecture-desktop', 'outputs', 'selective-material');
    fs.mkdirSync(outDir, { recursive: true });
    const template = templateLibrary_1.TEMPLATE_LIBRARY[arg] || templateLibrary_1.TEMPLATE_LIBRARY.ii_V_I_major;
    const progression = template.segments;
    const architecture = (0, architectureGenerator_1.generateArchitecture)(progression, { style, seed: Date.now(), progressionTemplate: arg });
    const mergedBars = [];
    let arrangementMode = 'classic';
    for (const section of architecture.sections) {
        arrangementMode = section.leadSection === 'trumpets' || section.leadSection === 'tutti' ? 'shout' : section.density === 'sparse' ? 'ballad' : 'classic';
        const sectionProg = segmentsForLength(progression, section.length);
        const plan = (0, ellingtonEngine_1.runEllingtonEngine)({ progression: sectionProg, parameters: { arrangementMode }, seed: Date.now() + section.startBar });
        const offset = section.startBar - 1;
        for (const b of plan.bars)
            mergedBars.push({ ...b, bar: b.bar + offset });
    }
    const ellingtonPlan = {
        bars: mergedBars.sort((a, b) => a.bar - b.bar),
        totalBars: architecture.totalBars,
        progression,
    };
    const assistPlan = (0, arrangerAssistGenerator_1.generateArrangerAssist)(architecture, ellingtonPlan, { seed: Date.now(), arrangementMode });
    const selectivePlan = (0, selectiveGenerationGenerator_1.generateSelectiveMaterial)(architecture, ellingtonPlan, assistPlan, targetType, { seed: Date.now() });
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5).replace(':', '');
    let runNum = 1;
    let runFolder = `${date}_${time}_${targetType}_run${String(runNum).padStart(2, '0')}`;
    while (fs.existsSync(path.join(outDir, runFolder))) {
        runNum++;
        runFolder = `${date}_${time}_${targetType}_run${String(runNum).padStart(2, '0')}`;
    }
    const runPath = path.join(outDir, runFolder);
    fs.mkdirSync(runPath, { recursive: true });
    const musicXml = (0, selectiveMaterialMusicXML_1.buildSelectiveMusicXML)(selectivePlan, architecture.totalBars);
    fs.writeFileSync(path.join(runPath, 'selective_material.musicxml'), musicXml, 'utf-8');
    let md = `# Selective Material: ${targetType}\n\n`;
    md += `**Architecture:** ${selectivePlan.architectureName}\n`;
    md += `**Total Bars:** ${selectivePlan.totalBars}\n`;
    md += `**Units:** ${selectivePlan.units.length}\n\n`;
    for (const u of selectivePlan.units) {
        md += `## ${u.section} (bars ${u.barRange.startBar}-${u.barRange.endBar})\n`;
        md += `- ${u.notes}\n`;
        md += `- Rhythm: ${u.rhythmPattern}\n`;
        md += `- Voicing: ${u.voicingHint}\n\n`;
    }
    fs.writeFileSync(path.join(runPath, 'selective_material.md'), md, 'utf-8');
    const runSummary = `# Run Summary\n\n**Generated:** ${now.toISOString()}\n**Target:** ${targetType}\n**Template:** ${arg}\n**Units:** ${selectivePlan.units.length}\n`;
    fs.writeFileSync(path.join(runPath, 'run_summary.md'), runSummary, 'utf-8');
    return { runFolderPath: runPath };
}
try {
    const result = main();
    console.log(JSON.stringify(result));
}
catch (e) {
    console.log(JSON.stringify({ runFolderPath: '', error: String(e) }));
    process.exit(1);
}
