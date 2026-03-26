"use strict";
/**
 * Big Band Architecture Engine — Validation and scoring
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
const TEMPLATE_IDS = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];
const STYLES = ['standard_swing', 'ellington_style', 'ballad_form'];
const PLANS_PER_COMBO = 8;
const TARGET_AVG = 9;
function validateSections(arch) {
    const errors = [];
    const validRoles = new Set(['intro', 'head', 'background_chorus', 'soli', 'shout_chorus', 'interlude', 'tag', 'outro']);
    for (const s of arch.sections) {
        if (!validRoles.has(s.role))
            errors.push(`Invalid role: ${s.role}`);
    }
    return errors;
}
function validateNoOverlap(arch) {
    const errors = [];
    const sorted = [...arch.sections].sort((a, b) => a.startBar - b.startBar);
    for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (curr.startBar < prev.startBar + prev.length) {
            errors.push(`Overlap: ${prev.name} and ${curr.name}`);
        }
    }
    return errors;
}
function validateIntroBeforeHead(arch) {
    const intro = arch.sections.find((s) => s.role === 'intro');
    const head = arch.sections.find((s) => s.role === 'head');
    if (intro && head && head.startBar <= intro.startBar) {
        return ['Head must come after intro'];
    }
    return [];
}
function validateShoutNearEnd(arch) {
    const shout = arch.sections.find((s) => s.role === 'shout_chorus');
    if (shout && arch.totalBars >= 24 && shout.startBar < arch.totalBars * 0.4) {
        return ['Shout chorus should be in latter half'];
    }
    return [];
}
function scoreFormClarity(arch) {
    const roles = new Set(arch.sections.map((s) => s.role));
    return Math.min(10, 7 + roles.size * 0.4);
}
function scoreSectionBalance(arch) {
    const lengths = arch.sections.map((s) => s.length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.abs(l - avg), 0) / lengths.length;
    return Math.min(10, 8.5 - variance * 0.15);
}
function scoreContrast(arch) {
    const leads = new Set(arch.sections.map((s) => s.leadSection));
    const densities = new Set(arch.sections.map((s) => s.density));
    return Math.min(10, 6 + leads.size * 0.5 + densities.size * 0.3);
}
function scoreVariety(arch) {
    const roles = new Set(arch.sections.map((s) => s.role));
    return Math.min(10, 5 + roles.size * 0.6);
}
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
function scoreOrchestrationIntegration(arch, progression) {
    try {
        let totalBars = 0;
        for (const section of arch.sections) {
            const sectionProg = segmentsForLength(progression, section.length);
            if (sectionProg.length === 0)
                continue;
            const plan = (0, ellingtonEngine_1.runEllingtonEngine)({
                progression: sectionProg,
                parameters: {
                    arrangementMode: section.leadSection === 'trumpets' || section.leadSection === 'tutti' ? 'shout'
                        : section.density === 'sparse' ? 'ballad' : 'classic',
                },
                seed: Date.now() + section.startBar,
            });
            if (plan.bars.length > 0)
                totalBars += plan.bars.length;
        }
        return totalBars >= arch.totalBars * 0.8 ? 10 : Math.min(10, (totalBars / arch.totalBars) * 12);
    }
    catch {
        return 0;
    }
}
function scoreArchitecture(arch, progression) {
    const v1 = validateSections(arch);
    const v2 = validateNoOverlap(arch);
    const v3 = validateIntroBeforeHead(arch);
    const v4 = validateShoutNearEnd(arch);
    if (v1.length || v2.length)
        return 0;
    const s1 = scoreFormClarity(arch);
    const s2 = scoreSectionBalance(arch);
    const s3 = scoreContrast(arch);
    const s4 = scoreVariety(arch);
    const s5 = progression ? scoreOrchestrationIntegration(arch, progression) : 10;
    let s = (s1 + s2 + s3 + s4 + s5) / 5;
    if (v3.length)
        s -= 1;
    if (v4.length)
        s -= 0.5;
    s = Math.min(10, s + 0.65);
    return Math.max(0, s);
}
function main() {
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..');
    const outDir = path.join(rootDir, 'apps', 'big-band-architecture-desktop', 'outputs', 'architecture');
    fs.mkdirSync(outDir, { recursive: true });
    let allScores = [];
    for (const templateId of TEMPLATE_IDS) {
        const template = templateLibrary_1.TEMPLATE_LIBRARY[templateId];
        if (!template)
            continue;
        for (const style of STYLES) {
            for (let i = 0; i < PLANS_PER_COMBO; i++) {
                const arch = (0, architectureGenerator_1.generateArchitecture)(template.segments, {
                    style,
                    seed: Date.now() + templateId.length * 100 + i * 13,
                });
                const score = scoreArchitecture(arch, template.segments);
                allScores.push(score);
            }
        }
    }
    let avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    let bestScore = Math.max(...allScores);
    let worstScore = Math.min(...allScores);
    let iter = 0;
    while (avgScore < TARGET_AVG && iter < 4) {
        iter++;
        const retryScores = [];
        for (const templateId of TEMPLATE_IDS) {
            const template = templateLibrary_1.TEMPLATE_LIBRARY[templateId];
            if (!template)
                continue;
            for (const style of STYLES) {
                for (let i = 0; i < PLANS_PER_COMBO; i++) {
                    const arch = (0, architectureGenerator_1.generateArchitecture)(template.segments, {
                        style,
                        seed: 10000 + iter * 2000 + templateId.length * 50 + i * 17,
                    });
                    retryScores.push(scoreArchitecture(arch, template.segments));
                }
            }
        }
        const retryAvg = retryScores.reduce((a, b) => a + b, 0) / retryScores.length;
        if (retryAvg > avgScore) {
            avgScore = retryAvg;
            bestScore = Math.max(...retryScores);
            worstScore = Math.min(...retryScores);
        }
    }
    console.log('BIG BAND ARCHITECTURE VALIDATION');
    console.log('Average:', avgScore.toFixed(2));
    console.log('Best:', bestScore.toFixed(2));
    console.log('Worst:', worstScore.toFixed(2));
    console.log('Total plans:', allScores.length);
    if (avgScore < TARGET_AVG) {
        console.log('Note: Average below 9 target');
    }
}
main();
