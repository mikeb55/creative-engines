"use strict";
/**
 * Full-Stack Validation — Tests complete big-band pipeline
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
const architectureGenerator_1 = require("../../engines/big-band-architecture-engine/architectureGenerator");
const ellingtonEngine_1 = require("../../engines/ellington-orchestration-engine/ellingtonEngine");
const arrangerAssistGenerator_1 = require("../../engines/arranger-assist-engine/arrangerAssistGenerator");
const selectiveGenerationGenerator_1 = require("../../engines/selective-big-band-generation-engine/selectiveGenerationGenerator");
const selectiveMaterialMusicXML_1 = require("../../engines/selective-big-band-generation-engine/selectiveMaterialMusicXML");
const scoreSkeletonExporter_1 = require("../../engines/big-band-architecture-engine/export/scoreSkeletonExporter");
const musicXMLScoreBuilder_1 = require("../../engines/big-band-architecture-engine/export/musicXMLScoreBuilder");
const templateLibrary_1 = require("../../engines/ellington-orchestration-engine/templates/templateLibrary");
const TARGET_IDS = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];
const TARGET_AVG = 8.8;
const RUN_COUNT = 100;
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
function runPipeline(progressionId, seed) {
    const timings = { architecture: 0, ellington: 0, arrangerAssist: 0, selective: 0, musicXml: 0 };
    const scores = {
        architectureQuality: 0,
        orchestrationPlausibility: 0,
        arrangerUsefulness: 0,
        noteGenerationPlausibility: 0,
        musicXmlValidity: 0,
    };
    try {
        const template = templateLibrary_1.TEMPLATE_LIBRARY[progressionId] || templateLibrary_1.TEMPLATE_LIBRARY.ii_V_I_major;
        const progression = template.segments;
        let t0 = Date.now();
        const architecture = (0, architectureGenerator_1.generateArchitecture)(progression, {
            style: 'standard_swing',
            seed,
            progressionTemplate: progressionId,
        });
        timings.architecture = Date.now() - t0;
        if (!architecture.sections || architecture.sections.length === 0) {
            return { progressionId, seed, success: false, error: 'No sections', scores, timings };
        }
        const totalBars = architecture.totalBars;
        if (totalBars <= 0) {
            return { progressionId, seed, success: false, error: 'Invalid bar count', scores, timings };
        }
        scores.architectureQuality = Math.min(10, 6 + architecture.sections.length * 0.5);
        const mergedBars = [];
        t0 = Date.now();
        for (const section of architecture.sections) {
            const sectionProg = segmentsForLength(progression, section.length);
            const plan = (0, ellingtonEngine_1.runEllingtonEngine)({
                progression: sectionProg,
                parameters: { arrangementMode: 'classic' },
                seed: seed + section.startBar,
            });
            const offset = section.startBar - 1;
            for (const b of plan.bars)
                mergedBars.push({ ...b, bar: b.bar + offset });
        }
        const ellingtonPlan = {
            bars: mergedBars.sort((a, b) => a.bar - b.bar),
            totalBars,
            progression,
        };
        timings.ellington = Date.now() - t0;
        const densities = new Set(ellingtonPlan.bars.map((b) => b.density));
        scores.orchestrationPlausibility = Math.min(10, 6 + densities.size * 1.2);
        t0 = Date.now();
        const arrangerAssistPlan = (0, arrangerAssistGenerator_1.generateArrangerAssist)(architecture, ellingtonPlan, { seed: seed + 1 });
        timings.arrangerAssist = Date.now() - t0;
        const suggestionsMatch = arrangerAssistPlan.suggestions.filter((s) => architecture.sections.some((sec) => sec.name === s.section)).length;
        scores.arrangerUsefulness = Math.min(10, 5 + (suggestionsMatch / Math.max(1, arrangerAssistPlan.suggestions.length)) * 5);
        t0 = Date.now();
        const selectivePlan = (0, selectiveGenerationGenerator_1.generateSelectiveMaterial)(architecture, ellingtonPlan, arrangerAssistPlan, 'background_figures', { seed: seed + 2 });
        timings.selective = Date.now() - t0;
        const unitsWithNotes = selectivePlan.units.filter((u) => (u.noteEvents?.length ?? 0) > 0).length;
        scores.noteGenerationPlausibility = Math.min(10, 5 + (unitsWithNotes / Math.max(1, selectivePlan.units.length)) * 5);
        t0 = Date.now();
        const skeleton = (0, scoreSkeletonExporter_1.architectureToSkeleton)(architecture, ellingtonPlan);
        const scoreXml = (0, musicXMLScoreBuilder_1.buildMusicXML)(skeleton);
        const selectiveXml = (0, selectiveMaterialMusicXML_1.buildSelectiveMusicXML)(selectivePlan, totalBars);
        timings.musicXml = Date.now() - t0;
        const xmlValid = scoreXml.includes('<score-partwise') && scoreXml.includes('<part-list>') && selectiveXml.includes('<score-partwise');
        scores.musicXmlValidity = xmlValid ? 10 : 0;
        return {
            progressionId,
            seed,
            success: true,
            architecture,
            ellingtonPlan,
            arrangerAssistPlan,
            selectivePlan,
            musicXml: selectiveXml,
            scores,
            timings,
        };
    }
    catch (e) {
        return {
            progressionId,
            seed,
            success: false,
            error: String(e),
            scores,
            timings,
        };
    }
}
function main() {
    const results = [];
    let count = 0;
    for (let i = 0; i < RUN_COUNT; i++) {
        const progressionId = TARGET_IDS[i % TARGET_IDS.length];
        const seed = Date.now() + i * 31 + progressionId.length * 7;
        results.push(runPipeline(progressionId, seed));
        count++;
    }
    const successful = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success).length;
    const allScores = successful.map((r) => {
        const s = r.scores;
        return (s.architectureQuality + s.orchestrationPlausibility + s.arrangerUsefulness + s.noteGenerationPlausibility + s.musicXmlValidity) / 5;
    });
    const averageScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    const bestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
    const worstScore = allScores.length > 0 ? Math.min(...allScores) : 0;
    const avgTimings = {
        architecture: results.reduce((a, r) => a + r.timings.architecture, 0) / results.length,
        ellington: results.reduce((a, r) => a + r.timings.ellington, 0) / results.length,
        arrangerAssist: results.reduce((a, r) => a + r.timings.arrangerAssist, 0) / results.length,
        selective: results.reduce((a, r) => a + r.timings.selective, 0) / results.length,
        musicXml: results.reduce((a, r) => a + r.timings.musicXml, 0) / results.length,
    };
    const report = {
        runs: count,
        failures,
        averageScore,
        bestScore,
        worstScore,
        engineTimings: avgTimings,
        results,
        generatedAt: new Date().toISOString(),
    };
    const reportDir = path.join(__dirname, '..', 'reports');
    fs.mkdirSync(reportDir, { recursive: true });
    const md = `# Full-Stack Validation Report

**Generated:** ${report.generatedAt}

## Summary

| Metric | Value |
|--------|-------|
| Runs | ${report.runs} |
| Failures | ${report.failures} |
| Average Score | ${report.averageScore.toFixed(2)} |
| Best Score | ${report.bestScore.toFixed(2)} |
| Worst Score | ${report.worstScore.toFixed(2)} |

## Engine Timings (ms)

| Engine | Average |
|--------|---------|
| Architecture | ${report.engineTimings.architecture.toFixed(0)} |
| Ellington | ${report.engineTimings.ellington.toFixed(0)} |
| Arranger Assist | ${report.engineTimings.arrangerAssist.toFixed(0)} |
| Selective | ${report.engineTimings.selective.toFixed(0)} |
| MusicXML | ${report.engineTimings.musicXml.toFixed(0)} |

## Target

Average ≥ ${TARGET_AVG}: ${report.averageScore >= TARGET_AVG ? 'PASS' : 'FAIL'}
`;
    fs.writeFileSync(path.join(reportDir, 'full_stack_validation_report.md'), md, 'utf-8');
    const jsonReport = { ...report, results: report.results.map((r) => ({ ...r, architecture: undefined, ellingtonPlan: undefined, arrangerAssistPlan: undefined, selectivePlan: undefined, musicXml: r.musicXml ? '[truncated]' : undefined })) };
    fs.writeFileSync(path.join(reportDir, 'full_stack_validation_report.json'), JSON.stringify(jsonReport, null, 2), 'utf-8');
    console.log('FULL STACK VALIDATION');
    console.log('Runs:', report.runs);
    console.log('Failures:', report.failures);
    console.log('Average score:', report.averageScore.toFixed(2));
    console.log('Best score:', report.bestScore.toFixed(2));
    console.log('Worst score:', report.worstScore.toFixed(2));
    console.log('Report: validation/reports/full_stack_validation_report.md');
}
main();
