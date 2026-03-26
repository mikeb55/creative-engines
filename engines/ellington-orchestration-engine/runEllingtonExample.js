"use strict";
/**
 * Ellington Orchestration Engine — Example runner
 * Generates orchestration plans and exports to app output folder.
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
const ellingtonEngine_1 = require("./ellingtonEngine");
const PROGRESSION = [
    { chord: 'Dm7', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'Cmaj7', bars: 4 },
];
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
function planToMarkdown(plan) {
    const lines = [
        '# Ellington Orchestration Plan',
        '',
        '## Progression',
        plan.progression.map((s) => `- ${s.chord} (${s.bars} bars)`).join('\n'),
        '',
        '## Bar-by-bar',
        '',
        '| Bar | Chord | Lead | Support | Density | Contrast | Call/Response | Background |',
        '|-----|-------|------|---------|---------|----------|---------------|------------|',
    ];
    for (const b of plan.bars) {
        lines.push(`| ${b.bar} | ${b.chord} | ${b.leadSection} | ${b.supportSection} | ${b.density} | ${b.contrastMode} | ${b.callResponse} | ${b.background} |`);
    }
    lines.push('');
    lines.push('## Density map');
    const densityByBar = plan.bars.map((b) => `${b.bar}:${b.density}`).join(' ');
    lines.push(densityByBar);
    lines.push('');
    lines.push('## Contrast notes');
    const contrastBars = plan.bars.filter((b) => b.contrastMode !== 'combined' || b.callResponse !== 'none');
    lines.push(contrastBars.map((b) => `Bar ${b.bar}: ${b.contrastMode} ${b.callResponse}`).join('\n'));
    lines.push('');
    lines.push('## Background usage');
    const bgBars = plan.bars.filter((b) => b.background !== 'none');
    lines.push(bgBars.map((b) => `Bar ${b.bar}: ${b.background}`).join('\n') || 'None');
    lines.push('');
    lines.push('## Tutti placements');
    const tuttiBars = plan.bars.filter((b) => b.tutti);
    lines.push(tuttiBars.map((b) => `Bar ${b.bar}`).join(', ') || 'None');
    return lines.join('\n');
}
function main() {
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..');
    const outRoot = path.join(rootDir, 'apps', 'ellington-orchestration-desktop', 'outputs', 'ellington');
    fs.mkdirSync(outRoot, { recursive: true });
    const runFolder = getRunFolderName(outRoot);
    const runPath = path.join(outRoot, runFolder);
    fs.mkdirSync(runPath, { recursive: true });
    const plan = (0, ellingtonEngine_1.runEllingtonEngine)({ progression: PROGRESSION });
    const md = planToMarkdown(plan);
    fs.writeFileSync(path.join(runPath, 'ellington_plan_01.md'), md, 'utf-8');
    const json = JSON.stringify(plan, null, 2);
    fs.writeFileSync(path.join(runPath, 'ellington_plan_01.json'), json, 'utf-8');
    const summary = `# Ellington Run Summary

## Settings
- **Timestamp:** ${new Date().toISOString()}
- **Progression:** Dm7 (2) → G7 (2) → Cmaj7 (4)
- **Total bars:** ${plan.totalBars}

## Outputs
- ellington_plan_01.md
- ellington_plan_01.json
`;
    fs.writeFileSync(path.join(runPath, 'run_summary.md'), summary, 'utf-8');
    console.log('Ellington plan exported to:', runPath);
}
main();
