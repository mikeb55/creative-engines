"use strict";
/**
 * Conductor Engine — Self validation
 * Generates 50 compositions, scores each, target average ≥ 9.0
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
exports.runValidation = runValidation;
exports.scoreGeneration = scoreGeneration;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const conductorGenerator_1 = require("./conductorGenerator");
const VALIDATION_COUNT = 50;
const TARGET_AVERAGE = 9.0;
const STYLES = ['chamber_jazz', 'big_band', 'guitar_duo'];
const FORMS = ['AABA', 'blues', 'rhythm_changes'];
const TEMPLATES = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];
function scoreGeneration(result) {
    let score = 0;
    const arch = result.architecture;
    if (arch.formStructure && arch.formStructure.sections.length > 0)
        score += 2;
    if (arch.progression && arch.progression.length > 0)
        score += 2;
    const orchCall = arch.engineCalls.find((c) => c.engine === 'ellington' || c.engine === 'big_band_architecture');
    if (orchCall?.success)
        score += 2;
    if (arch.architecturePlan && arch.architecturePlan.sections.length > 0)
        score += 2;
    if (result.compositionPlanPath || result.architectureJsonPath || result.scoreMusicPath)
        score += 2;
    return Math.min(10, score);
}
function runValidation() {
    const engineDir = __dirname;
    const outRoot = path.join(engineDir, '..', '..', 'outputs', 'conductor-validation');
    const runDir = path.join(outRoot, `run_${Date.now()}`);
    fs.mkdirSync(runDir, { recursive: true });
    const scores = [];
    const failures = [];
    for (let i = 0; i < VALIDATION_COUNT; i++) {
        const style = STYLES[i % STYLES.length];
        const form = FORMS[i % FORMS.length];
        const template = TEMPLATES[i % TEMPLATES.length];
        const outputDir = path.join(runDir, `comp_${i + 1}`);
        const request = {
            style,
            form,
            progressionTemplate: template,
            counterpointMode: style === 'guitar_duo' ? 'wyble' : 'contemporary',
            orchestrationMode: style === 'big_band' ? 'ellington' : 'chamber',
            seed: Date.now() + i,
        };
        try {
            const result = (0, conductorGenerator_1.generateComposition)(request, outputDir);
            const s = scoreGeneration(result);
            scores.push(s);
            if (s < 9)
                failures.push(`Comp ${i + 1}: score ${s}`);
        }
        catch (e) {
            scores.push(0);
            failures.push(`Comp ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const passed = avg >= TARGET_AVERAGE && failures.length === 0;
    const report = [
        `Conductor Validation Report`,
        `Generated: ${new Date().toISOString()}`,
        `Compositions: ${VALIDATION_COUNT}`,
        `Average score: ${avg.toFixed(2)}`,
        `Target: ${TARGET_AVERAGE}`,
        `Passed: ${passed ? 'YES' : 'NO'}`,
        failures.length > 0 ? `Failures: ${failures.join('; ')}` : '',
    ].filter(Boolean).join('\n');
    fs.writeFileSync(path.join(runDir, 'validation_report.txt'), report, 'utf-8');
    console.log(report);
    return passed;
}
if (require.main === module) {
    const passed = runValidation();
    process.exit(passed ? 0 : 1);
}
