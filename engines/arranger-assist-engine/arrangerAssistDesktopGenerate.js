"use strict";
/**
 * Arranger-Assist Desktop Generator — Architecture + Ellington + Arranger-Assist export
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
const templateLibrary_1 = require("../ellington-orchestration-engine/templates/templateLibrary");
const arrangerAssistGenerator_1 = require("./arrangerAssistGenerator");
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
    const outDir = path.join(rootDir, 'apps', 'big-band-architecture-desktop', 'outputs', 'arranger-assist');
    fs.mkdirSync(outDir, { recursive: true });
    const template = templateLibrary_1.TEMPLATE_LIBRARY[arg] || templateLibrary_1.TEMPLATE_LIBRARY.ii_V_I_major;
    const progression = template.segments;
    const architecture = (0, architectureGenerator_1.generateArchitecture)(progression, {
        style,
        seed: Date.now(),
        progressionTemplate: arg,
    });
    const mergedBars = [];
    let arrangementMode = 'classic';
    for (const section of architecture.sections) {
        arrangementMode =
            section.leadSection === 'trumpets' || section.leadSection === 'tutti' ? 'shout'
                : section.density === 'sparse' ? 'ballad' : 'classic';
        const sectionProg = segmentsForLength(progression, section.length);
        const plan = (0, ellingtonEngine_1.runEllingtonEngine)({
            progression: sectionProg,
            parameters: { arrangementMode },
            seed: Date.now() + section.startBar,
        });
        const offset = section.startBar - 1;
        for (const b of plan.bars)
            mergedBars.push({ ...b, bar: b.bar + offset });
    }
    const ellingtonPlan = {
        bars: mergedBars.sort((a, b) => a.bar - b.bar),
        totalBars: architecture.totalBars,
        progression,
    };
    const assistPlan = (0, arrangerAssistGenerator_1.generateArrangerAssist)(architecture, ellingtonPlan, {
        seed: Date.now(),
        arrangementMode,
    });
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
    fs.writeFileSync(path.join(runPath, 'arranger_assist_plan.json'), JSON.stringify(assistPlan, null, 2), 'utf-8');
    const bySection = new Map();
    for (const s of assistPlan.suggestions) {
        const list = bySection.get(s.section) ?? [];
        list.push(s);
        bySection.set(s.section, list);
    }
    let md = `# Arranger-Assist Plan

**Architecture:** ${assistPlan.architectureName}
**Progression:** ${assistPlan.progressionTemplate}
**Total Bars:** ${assistPlan.totalBars}
**Suggestions:** ${assistPlan.suggestions.length}

---

`;
    for (const section of architecture.sections) {
        const sugs = bySection.get(section.name) ?? [];
        const bg = sugs.filter((s) => s.role === 'background_figure');
        const punct = sugs.filter((s) => s.role === 'punctuation');
        const soli = sugs.filter((s) => s.role === 'soli_texture');
        const ramp = sugs.filter((s) => s.role === 'shout_ramp');
        const swap = sugs.filter((s) => s.role === 'section_swap');
        md += `## ${section.name} (bars ${section.startBar}-${section.startBar + section.length - 1})\n\n`;
        if (bg.length > 0) {
            md += `### Suggested background figures\n`;
            for (const s of bg) {
                md += `- **${s.barRange.startBar}-${s.barRange.endBar}** ${s.description}\n`;
                if (s.optionalRhythmText)
                    md += `  - Rhythm: ${s.optionalRhythmText}\n`;
                if (s.optionalVoicingHint)
                    md += `  - Voicing: ${s.optionalVoicingHint}\n`;
            }
            md += '\n';
        }
        if (punct.length > 0) {
            md += `### Suggested section answers / punctuation\n`;
            for (const s of punct) {
                md += `- **${s.barRange.startBar}-${s.barRange.endBar}** ${s.description}\n`;
                if (s.optionalRhythmText)
                    md += `  - ${s.optionalRhythmText}\n`;
            }
            md += '\n';
        }
        if (soli.length > 0) {
            md += `### Suggested support texture\n`;
            for (const s of soli) {
                md += `- **${s.barRange.startBar}-${s.barRange.endBar}** ${s.description}\n`;
                if (s.optionalVoicingHint)
                    md += `  - ${s.optionalVoicingHint}\n`;
            }
            md += '\n';
        }
        if (ramp.length > 0) {
            md += `### Suggested ramp + brass punctuation\n`;
            for (const s of ramp) {
                md += `- **${s.barRange.startBar}-${s.barRange.endBar}** [${s.subtype}] ${s.description}\n`;
            }
            md += '\n';
        }
        if (swap.length > 0) {
            md += `### Optional section swaps\n`;
            for (const s of swap)
                md += `- ${s.description}\n`;
            md += '\n';
        }
    }
    fs.writeFileSync(path.join(runPath, 'arranger_assist_plan.md'), md, 'utf-8');
    const runSummary = `# Run Summary

**Generated:** ${now.toISOString()}
**Template:** ${arg}
**Style:** ${style}
**Architecture:** ${assistPlan.architectureName}

## Suggestions: ${assistPlan.suggestions.length}
## Total Bars: ${assistPlan.totalBars}

Outputs: arranger_assist_plan.md, arranger_assist_plan.json
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
