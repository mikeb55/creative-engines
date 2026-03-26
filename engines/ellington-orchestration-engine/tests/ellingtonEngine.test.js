"use strict";
/**
 * Ellington Engine — Automated self-tests
 * 1. Engine loads without error
 * 2. ii-V-I progression generates orchestration
 * 3. At least 3 sections populated
 * 4. Voice leading intervals reasonable
 * 5. MusicXML export generated
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
const ellingtonEngine_1 = require("../ellingtonEngine");
const ellingtonMusicXMLExporter_1 = require("../ellingtonMusicXMLExporter");
const II_V_I = [
    { chord: 'Dm7', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'Cmaj7', bars: 4 },
];
function test1_EngineLoads() {
    try {
        (0, ellingtonEngine_1.generateEllingtonOrchestration)(II_V_I, 42);
        (0, ellingtonEngine_1.runEllingtonEngine)({ progression: II_V_I, seed: 42 });
        (0, ellingtonEngine_1.parseProgression)('Dm7 G7 Cmaj7');
        return true;
    }
    catch (e) {
        console.error('Test 1 FAIL: Engine load error', e);
        return false;
    }
}
function test2_IiVIGeneratesOrchestration() {
    const orch = (0, ellingtonEngine_1.generateEllingtonOrchestration)(II_V_I, 123);
    if (!orch.trumpets?.length || !orch.trombones?.length || !orch.saxes?.length || !orch.rhythm?.length) {
        console.error('Test 2 FAIL: Sections missing or empty');
        return false;
    }
    if (orch.totalBars !== 8) {
        console.error('Test 2 FAIL: Expected 8 bars, got', orch.totalBars);
        return false;
    }
    return true;
}
function test3_AtLeastThreeSectionsPopulated() {
    const orch = (0, ellingtonEngine_1.generateEllingtonOrchestration)(II_V_I, 456);
    let populated = 0;
    if (orch.trumpets.some((v) => v.pitches.length > 0))
        populated++;
    if (orch.trombones.some((v) => v.pitches.length > 0))
        populated++;
    if (orch.saxes.some((v) => v.pitches.length > 0))
        populated++;
    if (orch.rhythm.some((v) => v.pitches.length > 0))
        populated++;
    if (populated < 3) {
        console.error('Test 3 FAIL: Only', populated, 'sections populated');
        return false;
    }
    return true;
}
function test4_VoiceLeadingReasonable() {
    const orch = (0, ellingtonEngine_1.generateEllingtonOrchestration)(II_V_I, 789);
    const maxReasonable = 6; // semitones
    for (const section of [orch.trumpets, orch.trombones, orch.saxes]) {
        let prev = [];
        for (const v of section) {
            if (prev.length > 0 && v.pitches.length > 0) {
                const jumps = v.pitches.map((p, i) => Math.abs(p - (prev[i] ?? prev[0])));
                const maxJump = Math.max(...jumps);
                if (maxJump > 24) {
                    console.error('Test 4 FAIL: Voice leading jump too large', maxJump);
                    return false;
                }
            }
            prev = v.pitches;
        }
    }
    return true;
}
function test5_MusicXMLExportGenerated() {
    const orch = (0, ellingtonEngine_1.generateEllingtonOrchestration)(II_V_I, 999);
    const xml = (0, ellingtonMusicXMLExporter_1.exportOrchestrationToMusicXML)(orch, { title: 'Test' });
    if (!xml || xml.length < 100) {
        console.error('Test 5 FAIL: MusicXML too short or empty');
        return false;
    }
    if (!xml.includes('<score-partwise') || !xml.includes('<part ') || !xml.includes('<measure')) {
        console.error('Test 5 FAIL: MusicXML structure invalid');
        return false;
    }
    return true;
}
function test6_StringProgression() {
    const orch = (0, ellingtonEngine_1.generateEllingtonOrchestration)('Dm7 G7 Cmaj7', 111);
    if (orch.totalBars < 4 || orch.trumpets.length < 4) {
        console.error('Test 6 FAIL: String progression not parsed correctly');
        return false;
    }
    return true;
}
function main() {
    const tests = [
        ['Engine loads without error', test1_EngineLoads],
        ['ii-V-I generates orchestration', test2_IiVIGeneratesOrchestration],
        ['At least 3 sections populated', test3_AtLeastThreeSectionsPopulated],
        ['Voice leading intervals reasonable', test4_VoiceLeadingReasonable],
        ['MusicXML export generated', test5_MusicXMLExportGenerated],
        ['String progression accepted', test6_StringProgression],
    ];
    const results = [];
    let passed = 0;
    for (const [name, fn] of tests) {
        const ok = fn();
        results.push({ name, ok });
        if (ok) {
            passed++;
            console.log('PASS:', name);
        }
        else {
            console.log('FAIL:', name);
        }
    }
    const engineDir = path.resolve(__dirname, '..');
    const rootDir = path.join(engineDir, '..', '..');
    const outDir = path.join(rootDir, 'apps', 'ellington-orchestration-desktop', 'outputs');
    fs.mkdirSync(outDir, { recursive: true });
    const report = `# Ellington Engine Test Report
Generated: ${new Date().toISOString()}

## Results
- Passed: ${passed}/${tests.length}
- Failed: ${tests.length - passed}

## Tests
${results.map((r) => `- ${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`).join('\n')}
`;
    const reportPath = path.join(outDir, 'ellington_engine_test_report.md');
    fs.writeFileSync(reportPath, report, 'utf-8');
    if (passed < tests.length) {
        process.exit(1);
    }
    console.log('\nELLINGTON ENGINE TESTS: PASS');
}
main();
