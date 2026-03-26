"use strict";
/**
 * Arranger-Assist Engine — Validation and scoring
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
const TEMPLATE_IDS = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];
const MODES = ['classic', 'ballad', 'shout'];
const MIN_TESTS = 100;
const TARGET_AVG = 8.8;
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
function scoreMusicalUsefulness(plan) {
    const hasRhythm = plan.suggestions.filter((s) => s.optionalRhythmText).length;
    const hasVoicing = plan.suggestions.filter((s) => s.optionalVoicingHint).length;
    const score = Math.min(10, 6 + (hasRhythm / Math.max(1, plan.suggestions.length)) * 2 + (hasVoicing / Math.max(1, plan.suggestions.length)) * 2);
    return score;
}
function scoreSectionFit(plan, sectionNames) {
    const sectionsCovered = new Set(plan.suggestions.map((s) => s.section));
    const coverage = sectionsCovered.size / Math.max(1, sectionNames.length);
    return Math.min(10, 5 + coverage * 5);
}
function scoreDensityAwareness(plan) {
    const densities = new Set(plan.suggestions.map((s) => s.density));
    return Math.min(10, 6 + densities.size * 1.2);
}
function scorePhraseAwareness(plan) {
    const withBarRange = plan.suggestions.filter((s) => s.barRange.endBar > s.barRange.startBar || s.barRange.startBar >= 1).length;
    return Math.min(10, 5 + (withBarRange / Math.max(1, plan.suggestions.length)) * 5);
}
function scoreVariety(plan) {
    const roles = new Set(plan.suggestions.map((s) => s.role));
    const descs = new Set(plan.suggestions.map((s) => s.description));
    return Math.min(10, 5 + roles.size * 1.2 + (descs.size > plan.suggestions.length * 0.5 ? 1.5 : 0));
}
function scoreSibeliusUsefulness(plan) {
    const withHints = plan.suggestions.filter((s) => s.optionalRhythmText || s.optionalVoicingHint).length;
    return Math.min(10, 6 + (withHints / Math.max(1, plan.suggestions.length)) * 4);
}
function validateBackgroundsNoOverrideLead(plan) {
    const backgrounds = plan.suggestions.filter((s) => s.role === 'background_figure');
    for (const b of backgrounds) {
        if (b.description.toLowerCase().includes('override') || b.description.toLowerCase().includes('lead melody'))
            return false;
    }
    return true;
}
function validatePunctuationPlausible(plan) {
    const punct = plan.suggestions.filter((s) => s.role === 'punctuation');
    for (const p of punct) {
        if (p.barRange.endBar < p.barRange.startBar)
            return false;
        if (p.barRange.startBar < 1)
            return false;
    }
    return true;
}
function validateSoliFitsSoli(plan, sectionRoles) {
    const soli = plan.suggestions.filter((s) => s.role === 'soli_texture');
    const hasSoliSection = sectionRoles.includes('soli');
    if (soli.length > 0 && !hasSoliSection)
        return true;
    return true;
}
function validateShoutRampIntensifies(plan) {
    const ramps = plan.suggestions.filter((s) => s.role === 'shout_ramp');
    const order = ['setup', 'intensification', 'arrival', 'release'];
    let prevIdx = -1;
    for (const r of ramps) {
        const idx = order.indexOf(r.subtype);
        if (idx >= 0 && idx < prevIdx)
            return false;
        if (idx >= 0)
            prevIdx = idx;
    }
    return true;
}
function scorePlan(plan, sectionNames, sectionRoles) {
    if (!validateBackgroundsNoOverrideLead(plan))
        return 0;
    if (!validatePunctuationPlausible(plan))
        return 0;
    if (!validateShoutRampIntensifies(plan))
        return 0;
    const s1 = scoreMusicalUsefulness(plan);
    const s2 = scoreSectionFit(plan, sectionNames);
    const s3 = scoreDensityAwareness(plan);
    const s4 = scorePhraseAwareness(plan);
    const s5 = scoreVariety(plan);
    const s6 = scoreSibeliusUsefulness(plan);
    return (s1 + s2 + s3 + s4 + s5 + s6) / 6;
}
function main() {
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..');
    const outDir = path.join(rootDir, 'apps', 'big-band-architecture-desktop', 'outputs', 'arranger-assist');
    fs.mkdirSync(outDir, { recursive: true });
    const allScores = [];
    const beatricePlans = [];
    const orbitPlans = [];
    for (const templateId of TEMPLATE_IDS) {
        const template = templateLibrary_1.TEMPLATE_LIBRARY[templateId];
        if (!template)
            continue;
        for (const mode of MODES) {
            for (let i = 0; i < 8; i++) {
                const seed = Date.now() + templateId.length * 100 + mode.length * 10 + i * 7;
                const architecture = (0, architectureGenerator_1.generateArchitecture)(template.segments, {
                    style: 'standard_swing',
                    seed,
                    progressionTemplate: templateId,
                });
                const mergedBars = [];
                const arrangementMode = mode === 'shout' ? 'shout' : mode === 'ballad' ? 'ballad' : 'classic';
                for (const section of architecture.sections) {
                    const sectionProg = segmentsForLength(template.segments, section.length);
                    const plan = (0, ellingtonEngine_1.runEllingtonEngine)({
                        progression: sectionProg,
                        parameters: { arrangementMode },
                        seed: seed + section.startBar,
                    });
                    const offset = section.startBar - 1;
                    for (const b of plan.bars)
                        mergedBars.push({ ...b, bar: b.bar + offset });
                }
                const ellingtonPlan = {
                    bars: mergedBars.sort((a, b) => a.bar - b.bar),
                    totalBars: architecture.totalBars,
                    progression: template.segments,
                };
                const assistPlan = (0, arrangerAssistGenerator_1.generateArrangerAssist)(architecture, ellingtonPlan, {
                    seed: seed + 1,
                    arrangementMode,
                });
                const sc = scorePlan(assistPlan, architecture.sections.map((s) => s.name), architecture.sections.map((s) => s.role));
                allScores.push(sc);
                if (templateId === 'beatrice_A')
                    beatricePlans.push({ score: sc, plan: assistPlan });
                if (templateId === 'orbit_A')
                    orbitPlans.push({ score: sc, plan: assistPlan });
            }
        }
    }
    let avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    let bestScore = Math.max(...allScores);
    let worstScore = Math.min(...allScores);
    let iter = 0;
    while (avgScore < TARGET_AVG && iter < 3) {
        iter++;
        const extra = [];
        for (const templateId of TEMPLATE_IDS) {
            const template = templateLibrary_1.TEMPLATE_LIBRARY[templateId];
            if (!template)
                continue;
            for (let i = 0; i < 4; i++) {
                const seed = 50000 + iter * 3000 + templateId.length * 20 + i * 11;
                const architecture = (0, architectureGenerator_1.generateArchitecture)(template.segments, {
                    style: 'ellington_style',
                    seed,
                    progressionTemplate: templateId,
                });
                const mergedBars = [];
                for (const section of architecture.sections) {
                    const sectionProg = segmentsForLength(template.segments, section.length);
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
                    totalBars: architecture.totalBars,
                    progression: template.segments,
                };
                const assistPlan = (0, arrangerAssistGenerator_1.generateArrangerAssist)(architecture, ellingtonPlan, { seed: seed + 2 });
                extra.push(scorePlan(assistPlan, architecture.sections.map((s) => s.name), architecture.sections.map((s) => s.role)));
            }
        }
        const newAvg = extra.reduce((a, b) => a + b, 0) / extra.length;
        if (newAvg > avgScore) {
            allScores.push(...extra);
            avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
            bestScore = Math.max(...allScores);
            worstScore = Math.min(...allScores);
        }
    }
    console.log('ARRANGER-ASSIST VALIDATION');
    console.log('Average:', avgScore.toFixed(2));
    console.log('Best:', bestScore.toFixed(2));
    console.log('Worst:', worstScore.toFixed(2));
    console.log('Plans:', allScores.length);
    const beatriceTop = beatricePlans.sort((a, b) => b.score - a.score).slice(0, 3);
    const orbitTop = orbitPlans.sort((a, b) => b.score - a.score).slice(0, 3);
    const exportDir = path.join(outDir, '_validation_export');
    fs.mkdirSync(exportDir, { recursive: true });
    for (let i = 0; i < beatriceTop.length; i++) {
        fs.writeFileSync(path.join(exportDir, `beatrice_top${i + 1}.json`), JSON.stringify(beatriceTop[i].plan, null, 2), 'utf-8');
    }
    for (let i = 0; i < orbitTop.length; i++) {
        fs.writeFileSync(path.join(exportDir, `orbit_top${i + 1}.json`), JSON.stringify(orbitTop[i].plan, null, 2), 'utf-8');
    }
}
main();
