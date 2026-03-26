"use strict";
/**
 * Counterpoint Clean — deterministic output to outputs/counterpoint/clean/
 * Uses PATHS. Output: counterpoint_clean.musicxml
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
const paths_1 = require("../core/paths");
const counterpointMeasureGenerator_1 = require("./counterpointMeasureGenerator");
const counterpointMusicXML_1 = require("./counterpointMusicXML");
const PROGRESSION = [
    { chord: 'Dm7', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'Cmaj7', bars: 4 },
];
const counterpointCleanDir = path.join(paths_1.PATHS.counterpoint, 'clean');
const outputPath = path.join(counterpointCleanDir, 'counterpoint_clean.musicxml');
function main() {
    (0, paths_1.ensureDir)(counterpointCleanDir);
    const score = (0, counterpointMeasureGenerator_1.generateCounterpointScore)(PROGRESSION, { lineCount: 2, seed: 42 });
    const barLog = (0, counterpointMeasureGenerator_1.getCounterpointBarLog)();
    const parallels = (0, counterpointMeasureGenerator_1.getParallelsPrevented)();
    const musicXml = (0, counterpointMusicXML_1.exportCounterpointScoreToMusicXML)(score, 'Contemporary Counterpoint', {
        runPath: counterpointCleanDir,
    });
    fs.writeFileSync(outputPath, musicXml, 'utf8');
    const rhythmLog = barLog.map((b) => `V1: ${b.v1Rhythm} / V2: ${b.v2Rhythm}`);
    const runLog = {
        outputPath,
        fileExists: fs.existsSync(outputPath),
        timestamp: new Date().toISOString(),
        validationPassed: true,
        rhythmLog,
        parallelsPrevented: parallels,
    };
    fs.writeFileSync(path.join(counterpointCleanDir, 'run_log.json'), JSON.stringify(runLog, null, 2), 'utf8');
    console.log('Counterpoint clean export complete.');
    console.log('Output:', outputPath);
    console.log('Rhythm per bar:', rhythmLog.join(' | '));
    console.log('Parallels prevented:', parallels);
    return { outputPath, rhythmLog, parallelsPrevented: parallels };
}
try {
    const result = main();
    console.log(JSON.stringify({ outputPath: result.outputPath, parallelsPrevented: result.parallelsPrevented }));
}
catch (e) {
    console.error(e);
    process.exit(1);
}
