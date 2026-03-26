"use strict";
/**
 * Conductor Engine — Real world test
 * Generates compositions using ii-V-I, jazz blues, rhythm changes, Beatrice, Orbit
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
exports.runRealWorldTest = runRealWorldTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const conductorGenerator_1 = require("./conductorGenerator");
const TEMPLATES = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];
function runRealWorldTest() {
    const engineDir = __dirname;
    const outRoot = path.join(engineDir, '..', '..', 'outputs', 'conductor-realworld');
    const runDir = path.join(outRoot, `run_${Date.now()}`);
    fs.mkdirSync(runDir, { recursive: true });
    let allOk = true;
    for (const template of TEMPLATES) {
        const outputDir = path.join(runDir, template);
        fs.mkdirSync(outputDir, { recursive: true });
        const request = {
            style: 'chamber_jazz',
            form: 'AABA',
            progressionTemplate: template,
            counterpointMode: 'contemporary',
            orchestrationMode: 'chamber',
            seed: Date.now(),
        };
        try {
            const result = (0, conductorGenerator_1.generateComposition)(request, outputDir);
            if (!result.success) {
                console.error(`FAIL ${template}: ${result.error}`);
                allOk = false;
            }
            else {
                const hasExports = !!result.compositionPlanPath &&
                    !!result.architectureJsonPath &&
                    !!result.scoreMusicPath;
                if (!hasExports) {
                    console.error(`FAIL ${template}: missing exports`);
                    allOk = false;
                }
                else {
                    console.log(`OK ${template}`);
                }
            }
        }
        catch (e) {
            console.error(`FAIL ${template}: ${e instanceof Error ? e.message : String(e)}`);
            allOk = false;
        }
    }
    const report = `Real World Test: ${allOk ? 'PASSED' : 'FAILED'}\nRun: ${runDir}`;
    fs.writeFileSync(path.join(runDir, 'report.txt'), report, 'utf-8');
    console.log(report);
    return allOk;
}
if (require.main === module) {
    const passed = runRealWorldTest();
    process.exit(passed ? 0 : 1);
}
