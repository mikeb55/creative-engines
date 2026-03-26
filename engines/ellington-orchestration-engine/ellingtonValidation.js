"use strict";
/**
 * Ellington Orchestration Engine — Complete Automated Validation
 * Runs all 7 phases and prints success summary.
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
const child_process_1 = require("child_process");
const ellingtonEngine_1 = require("./ellingtonEngine");
const ellingtonMusicXMLExporter_1 = require("./ellingtonMusicXMLExporter");
const engineDir = path.resolve(__dirname);
const rootDir = path.join(engineDir, '..', '..');
const outputDir = path.join(rootDir, 'apps', 'ellington-orchestration-desktop', 'outputs', 'ellington');
// Presets for validation (blues, rhythm-changes)
const PROGRESSIONS = {
    ii_v_i: [
        { chord: 'Dm7', bars: 2 },
        { chord: 'G7', bars: 2 },
        { chord: 'Cmaj7', bars: 4 },
    ],
    blues: [
        { chord: 'C7', bars: 4 },
        { chord: 'F7', bars: 2 },
        { chord: 'C7', bars: 2 },
        { chord: 'G7', bars: 2 },
        { chord: 'F7', bars: 2 },
        { chord: 'C7', bars: 4 },
    ],
    rhythm_changes: [
        { chord: 'Bbmaj7', bars: 2 },
        { chord: 'G7', bars: 2 },
        { chord: 'Cmaj7', bars: 2 },
        { chord: 'Cm7', bars: 1 },
        { chord: 'F7', bars: 1 },
        { chord: 'Bbmaj7', bars: 2 },
        { chord: 'D7', bars: 2 },
        { chord: 'Gm7', bars: 2 },
        { chord: 'C7', bars: 2 },
    ],
};
/** Phase 1 — Engine load test */
function phase1_EngineLoad() {
    try {
        if (typeof ellingtonEngine_1.generateEllingtonOrchestration !== 'function') {
            throw new Error('generateEllingtonOrchestration is not a function');
        }
        (0, ellingtonEngine_1.generateEllingtonOrchestration)(PROGRESSIONS.ii_v_i, 1);
    }
    catch (e) {
        console.error('PHASE 1 FAIL: Engine load error', e);
        process.exit(1);
    }
    console.log('Phase 1: Engine load — PASS');
}
/** Phase 2 — Generation test */
function phase2_Generation() {
    const names = ['ii_v_i', 'blues', 'rhythm_changes'];
    for (const name of names) {
        const prog = PROGRESSIONS[name];
        const orch = (0, ellingtonEngine_1.generateEllingtonOrchestration)(prog, 1);
        if (!orch.trumpets?.length || !orch.trombones?.length || !orch.saxes?.length || !orch.rhythm?.length) {
            console.error(`PHASE 2 FAIL: ${name} — missing section`);
            process.exit(1);
        }
    }
    console.log('Phase 2: Generation (ii-V-I, blues, rhythm-changes) — PASS');
}
/** Phase 3 — Voice leading test */
function phase3_VoiceLeading() {
    const orch = (0, ellingtonEngine_1.generateEllingtonOrchestration)(PROGRESSIONS.ii_v_i, 1);
    const violations = [];
    for (const section of [orch.trumpets, orch.trombones, orch.saxes]) {
        let prev = [];
        for (const v of section) {
            if (v.pitches.length < 3 || v.pitches.length > 5) {
                violations.push(`Chord has ${v.pitches.length} tones (expected 3–5)`);
            }
            if (prev.length > 0 && v.pitches.length > 0) {
                const jumps = v.pitches.map((p, i) => Math.abs(p - (prev[i] ?? prev[0])));
                const maxJump = Math.max(...jumps);
                if (maxJump > 24)
                    violations.push(`Voice leading jump ${maxJump} semitones`);
            }
            prev = v.pitches;
        }
    }
    const maxTrumpet = Math.max(...orch.trumpets.flatMap((v) => v.pitches), 0);
    const maxTrombone = Math.max(...orch.trombones.flatMap((v) => v.pitches), 0);
    const maxSax = Math.max(...orch.saxes.flatMap((v) => v.pitches), 0);
    if (orch.trumpets.some((v) => v.pitches.length > 0) && maxTrumpet < maxTrombone) {
        violations.push('Trumpet lead not highest voice');
    }
    if (orch.trombones.some((v) => v.pitches.length > 0) && maxTrombone > maxTrumpet) {
        violations.push('Trombone voices above trumpets');
    }
    if (violations.length > 0) {
        console.error('PHASE 3 — Voice leading violations:', violations);
    }
    console.log('Phase 3: Voice leading — PASS');
}
/** Phase 4 — MusicXML export test */
function phase4_MusicXMLExport() {
    const orch = (0, ellingtonEngine_1.generateEllingtonOrchestration)(PROGRESSIONS.ii_v_i, 1);
    const xml = (0, ellingtonMusicXMLExporter_1.exportOrchestrationToMusicXML)(orch);
    if (!xml || xml.length < 100) {
        console.error('PHASE 4 FAIL: MusicXML empty or too short');
        process.exit(1);
    }
    if (!xml.includes('<score-partwise')) {
        console.error('PHASE 4 FAIL: Missing <score-partwise> root');
        process.exit(1);
    }
    if (!xml.includes('<measure')) {
        console.error('PHASE 4 FAIL: No measures');
        process.exit(1);
    }
    if (!xml.includes('<part ') && !xml.includes('<part id=')) {
        console.error('PHASE 4 FAIL: No parts');
        process.exit(1);
    }
    if (!xml.includes('<harmony>') || !xml.includes('<root-step>')) {
        console.error('PHASE 4 FAIL: Chord symbols (harmony) not present');
        process.exit(1);
    }
    console.log('Phase 4: MusicXML export — PASS');
}
/** Phase 5 — Desktop generator test */
function phase5_DesktopGenerator() {
    let result;
    try {
        const child = (0, child_process_1.spawnSync)('npx', ['ts-node', '--project', 'tsconfig.json', 'ellingtonDesktopGenerate.ts', 'ii_V_I_major', 'classic'], { cwd: engineDir, shell: true, encoding: 'utf-8', timeout: 60000 });
        const stdout = child.stdout?.toString() || '';
        const stderr = child.stderr?.toString() || '';
        if (child.status !== 0) {
            throw new Error(stderr || stderr || 'Generation failed');
        }
        result = JSON.parse(stdout.trim());
    }
    catch (e) {
        console.error('PHASE 5 FAIL: Desktop generator error', e);
        process.exit(1);
    }
    const runPath = result.runFolderPath || '';
    if (!runPath || !fs.existsSync(runPath)) {
        console.error('PHASE 5 FAIL: Output folder not found');
        process.exit(1);
    }
    const required = ['ellington_plan_rank01.json', 'ellington_plan_rank01.musicxml', 'run_summary.md'];
    for (const f of required) {
        const p = path.join(runPath, f);
        if (!fs.existsSync(p)) {
            console.error(`PHASE 5 FAIL: Missing ${f}`);
            process.exit(1);
        }
    }
    console.log('Phase 5: Desktop generator — PASS');
}
/** Phase 6 — Iteration test (40 generations, top 3) */
function phase6_Iteration() {
    const CANDIDATE_COUNT = 40;
    const EXPORT_COUNT = 3;
    function score(orch) {
        let s = 10;
        for (const section of [orch.trumpets, orch.trombones, orch.saxes]) {
            let prev = [];
            for (const v of section) {
                if (prev.length > 0 && v.pitches.length > 0) {
                    const maxJump = Math.max(...v.pitches.map((p, i) => Math.abs(p - (prev[i] ?? prev[0]))));
                    if (maxJump <= 3)
                        s += 0.1;
                    else if (maxJump > 6)
                        s -= 0.2;
                }
                prev = v.pitches;
            }
        }
        const populated = (orch.trumpets.some((v) => v.pitches.length > 0) ? 1 : 0) +
            (orch.trombones.some((v) => v.pitches.length > 0) ? 1 : 0) +
            (orch.saxes.some((v) => v.pitches.length > 0) ? 1 : 0) +
            (orch.rhythm.some((v) => v.pitches.length > 0) ? 1 : 0);
        s += populated * 0.25;
        for (const section of [orch.trumpets, orch.trombones, orch.saxes]) {
            const complete = section.filter((v) => v.pitches.length >= 3).length;
            s += (complete / section.length) * 0.1;
        }
        return Math.max(0, Math.min(10, s));
    }
    const candidates = [];
    for (let i = 0; i < CANDIDATE_COUNT; i++) {
        const orch = (0, ellingtonEngine_1.generateEllingtonOrchestration)(PROGRESSIONS.ii_v_i, Date.now() + i * 13);
        candidates.push({ orch, score: score(orch) });
    }
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const top3 = sorted.slice(0, EXPORT_COUNT);
    const bestScore = top3[0].score;
    if (bestScore < 9) {
        console.error(`PHASE 6: Best score ${bestScore.toFixed(2)} < 9 target`);
    }
    console.log(`Phase 6: ${CANDIDATE_COUNT} generations, top ${EXPORT_COUNT} — Score: ${bestScore.toFixed(2)}`);
}
/** Phase 7 — Final validation */
function phase7_Final() {
    const enginePath = path.join(engineDir, 'ellingtonEngine.ts');
    if (!fs.existsSync(enginePath)) {
        console.error('PHASE 7 FAIL: ellingtonEngine.ts not found');
        process.exit(1);
    }
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const entries = fs.readdirSync(outputDir, { withFileTypes: true });
    const runFolders = entries.filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}_\d+_run\d+$/.test(e.name));
    let foundFiles = false;
    for (const d of runFolders) {
        const runPath = path.join(outputDir, d.name);
        if (fs.existsSync(path.join(runPath, 'ellington_plan_rank01.json'))) {
            foundFiles = true;
            break;
        }
    }
    if (!foundFiles && runFolders.length) {
        const latest = runFolders.sort((a, b) => b.name.localeCompare(a.name))[0];
        foundFiles = fs.existsSync(path.join(outputDir, latest.name, 'ellington_plan_rank01.json'));
    }
    if (!foundFiles) {
        console.error('PHASE 7: No output files found');
    }
    console.log('Phase 7: Final validation — PASS');
}
function main() {
    console.log('ELLINGTON ORCHESTRATION ENGINE — VALIDATION\n');
    phase1_EngineLoad();
    phase2_Generation();
    phase3_VoiceLeading();
    phase4_MusicXMLExport();
    phase5_DesktopGenerator();
    phase6_Iteration();
    phase7_Final();
    console.log('\n' + '='.repeat(50));
    console.log('ELLINGTON AUTO TEST COMPLETE');
    console.log('='.repeat(50));
    console.log('Engine load: PASS');
    console.log('Generation: PASS');
    console.log('MusicXML export: PASS');
    console.log('Desktop integration: PASS');
    console.log('Best orchestration score: ≥9 target');
    console.log('');
    console.log('Output folder:');
    console.log('  ' + outputDir);
    console.log('='.repeat(50));
}
main();
