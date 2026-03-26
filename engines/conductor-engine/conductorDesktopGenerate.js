"use strict";
/**
 * Conductor Desktop Generator — Run by Electron app
 * Generates composition, exports plan, architecture, MusicXML.
 * Outputs JSON result to stdout for IPC.
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
const conductorGenerator_1 = require("./conductorGenerator");
const STYLES = ['chamber_jazz', 'big_band', 'guitar_duo'];
const TEMPLATES = ['ii_V_I_major', 'jazz_blues', 'rhythm_changes_A', 'beatrice_A', 'orbit_A'];
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
function main() {
    const styleArg = (process.argv[2] || 'chamber_jazz');
    const templateArg = process.argv[3] || 'ii_V_I_major';
    const style = STYLES.includes(styleArg) ? styleArg : 'chamber_jazz';
    const template = TEMPLATES.includes(templateArg) ? templateArg : 'ii_V_I_major';
    const engineDir = __dirname;
    const rootDir = path.join(engineDir, '..', '..');
    const outDir = path.join(rootDir, 'apps', 'conductor-composer-desktop', 'outputs');
    fs.mkdirSync(outDir, { recursive: true });
    const runFolder = getRunFolderName(outDir);
    const runFolderPath = path.join(outDir, runFolder);
    const outputDir = path.join(runFolderPath, 'composition');
    fs.mkdirSync(outputDir, { recursive: true });
    const request = {
        style,
        form: 'AABA',
        progressionTemplate: template,
        counterpointMode: style === 'guitar_duo' ? 'wyble' : 'contemporary',
        orchestrationMode: style === 'big_band' ? 'ellington' : 'chamber',
        seed: Date.now(),
    };
    try {
        const result = (0, conductorGenerator_1.generateComposition)(request, outputDir);
        return {
            outputDir,
            runFolder,
            runFolderPath,
            style,
            template,
            success: result.success,
            error: result.error,
        };
    }
    catch (e) {
        return {
            outputDir,
            runFolder,
            runFolderPath,
            style,
            template,
            success: false,
            error: e instanceof Error ? e.message : String(e),
        };
    }
}
const result = main();
console.log(JSON.stringify(result));
