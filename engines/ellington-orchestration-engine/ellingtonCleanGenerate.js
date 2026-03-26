"use strict";
/**
 * Ellington Clean — deterministic output to outputs/ellington/clean/
 * Uses PATHS. Output: ellington_clean.musicxml
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
const ellingtonMeasureGenerator_1 = require("./ellingtonMeasureGenerator");
const ellingtonScoreExporter_1 = require("./ellingtonScoreExporter");
const validateEllingtonMusicXML_1 = require("../../scripts/validateEllingtonMusicXML");
const PROGRESSION = [
    { chord: 'Dm7', bars: 2 },
    { chord: 'G7', bars: 2 },
    { chord: 'Cmaj7', bars: 4 },
];
const ellingtonCleanDir = path.join(paths_1.PATHS.ellington, 'clean');
const outputPath = path.join(ellingtonCleanDir, 'ellington_clean.musicxml');
function main() {
    (0, paths_1.ensureDir)(ellingtonCleanDir);
    const score = (0, ellingtonMeasureGenerator_1.generateEllingtonScore)(PROGRESSION, { seed: 42, title: 'Ellington Orchestration' });
    const musicXml = (0, ellingtonScoreExporter_1.exportEllingtonScoreToMusicXML)(score, { title: 'Ellington Orchestration', runPath: ellingtonCleanDir });
    const validation = (0, validateEllingtonMusicXML_1.validateEllingtonMusicXML)(musicXml);
    if (!validation.valid) {
        validation.errors.forEach((e) => console.error(`[validateEllingtonMusicXML] ${e}`));
        throw new Error('Ellington MusicXML validation failed');
    }
    fs.writeFileSync(outputPath, musicXml, 'utf8');
    const runLog = {
        outputPath,
        fileExists: fs.existsSync(outputPath),
        timestamp: new Date().toISOString(),
        validationPassed: true,
    };
    fs.writeFileSync(path.join(ellingtonCleanDir, 'run_log.json'), JSON.stringify(runLog, null, 2), 'utf8');
    console.log('Ellington clean export complete.');
    console.log('Output:', outputPath);
    return { outputPath };
}
try {
    const result = main();
    console.log(JSON.stringify(result));
}
catch (e) {
    console.error(e);
    process.exit(1);
}
