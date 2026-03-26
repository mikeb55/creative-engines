"use strict";
/**
 * Big Band Score Skeleton — Export validation
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
const architectureGenerator_1 = require("../architectureGenerator");
const ellingtonEngine_1 = require("../../ellington-orchestration-engine/ellingtonEngine");
const templateLibrary_1 = require("../../ellington-orchestration-engine/templates/templateLibrary");
const scoreSkeletonExporter_1 = require("./scoreSkeletonExporter");
const TEMPLATE_IDS = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];
const STYLES = ['standard_swing', 'ellington_style', 'ballad_form'];
const MIN_TESTS = 50;
const STAFF_COUNT = 17;
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
function validateMusicXML(xml) {
    const errors = [];
    if (!xml.includes('<score-partwise'))
        errors.push('Missing score-partwise');
    if (!xml.includes('<part-list>'))
        errors.push('Missing part-list');
    if (!xml.includes('</part-list>'))
        errors.push('Missing part-list close');
    const partCount = (xml.match(/<part id="/g) || []).length;
    if (partCount !== STAFF_COUNT)
        errors.push(`Expected ${STAFF_COUNT} parts, got ${partCount}`);
    const measureMatch = xml.match(/<measure number="(\d+)">/g);
    const measureCount = measureMatch ? measureMatch.length : 0;
    if (measureCount === 0)
        errors.push('No measures');
    const rehearsalMatch = xml.match(/<rehearsal>/g);
    if (!rehearsalMatch || rehearsalMatch.length === 0)
        errors.push('No rehearsal marks');
    const harmonyMatch = xml.match(/<harmony>/g);
    if (!harmonyMatch || harmonyMatch.length === 0)
        errors.push('No chord symbols');
    return { pass: errors.length === 0, errors };
}
function runOneExport(templateId, style, seed) {
    const template = templateLibrary_1.TEMPLATE_LIBRARY[templateId];
    if (!template)
        return 0;
    const progression = template.segments;
    const architecture = (0, architectureGenerator_1.generateArchitecture)(progression, { style: style, seed, progressionTemplate: templateId });
    const mergedBars = [];
    for (const section of architecture.sections) {
        const sectionProg = segmentsForLength(progression, section.length);
        const plan = (0, ellingtonEngine_1.runEllingtonEngine)({
            progression: sectionProg,
            parameters: {
                arrangementMode: section.leadSection === 'trumpets' || section.leadSection === 'tutti' ? 'shout'
                    : section.density === 'sparse' ? 'ballad' : 'classic',
            },
            seed: seed + section.startBar,
        });
        const offset = section.startBar - 1;
        for (const b of plan.bars)
            mergedBars.push({ ...b, bar: b.bar + offset });
    }
    const arrangementPlan = {
        bars: mergedBars.sort((a, b) => a.bar - b.bar),
        totalBars: architecture.totalBars,
        progression,
    };
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..', '..', '..');
    const outDir = path.join(rootDir, 'apps', 'big-band-architecture-desktop', 'outputs', 'score');
    fs.mkdirSync(outDir, { recursive: true });
    const testDir = path.join(outDir, `_validation_${templateId}_${style}_${seed}`);
    fs.mkdirSync(testDir, { recursive: true });
    (0, scoreSkeletonExporter_1.exportScoreSkeleton)(architecture, arrangementPlan, testDir);
    const xmlPath = path.join(testDir, 'score_skeleton.musicxml');
    const xml = fs.readFileSync(xmlPath, 'utf-8');
    const { pass, errors } = validateMusicXML(xml);
    const structurePath = path.join(testDir, 'score_structure.json');
    const structure = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));
    const sectionCount = structure.sections?.length ?? 0;
    if (sectionCount !== architecture.sections.length)
        errors.push('Section count mismatch');
    try {
        fs.rmSync(testDir, { recursive: true });
    }
    catch (_) { }
    const baseScore = pass ? 10 : 0;
    const sectionScore = Math.min(2, (sectionCount / Math.max(1, architecture.sections.length)) * 2);
    return Math.min(10, baseScore * 0.8 + sectionScore);
}
function main() {
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..', '..', '..');
    const outDir = path.join(rootDir, 'apps', 'big-band-architecture-desktop', 'outputs', 'score');
    fs.mkdirSync(outDir, { recursive: true });
    const scores = [];
    let testCount = 0;
    for (const templateId of TEMPLATE_IDS) {
        for (const style of STYLES) {
            for (let i = 0; i < 4; i++) {
                const seed = Date.now() + templateId.length * 100 + i * 17 + style.length;
                scores.push(runOneExport(templateId, style, seed));
                testCount++;
                if (testCount >= MIN_TESTS)
                    break;
            }
            if (testCount >= MIN_TESTS)
                break;
        }
        if (testCount >= MIN_TESTS)
            break;
    }
    while (testCount < MIN_TESTS) {
        const templateId = TEMPLATE_IDS[testCount % TEMPLATE_IDS.length];
        const style = STYLES[Math.floor(testCount / TEMPLATE_IDS.length) % STYLES.length];
        scores.push(runOneExport(templateId, style, Date.now() + testCount * 31));
        testCount++;
    }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const best = Math.max(...scores);
    const worst = Math.min(...scores);
    console.log('SCORE EXPORT VALIDATION');
    console.log('Average:', avg.toFixed(2));
    console.log('Best:', best.toFixed(2));
    console.log('Worst:', worst.toFixed(2));
    console.log('Tests:', scores.length);
}
main();
