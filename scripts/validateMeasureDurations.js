"use strict";
/**
 * Validates that MusicXML measures sum to expected duration (4/4 = 16 divisions).
 * Exits 0 if valid, 1 if invalid.
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
const DIVISIONS = 4;
const MEASURE_DURATION = 4 * DIVISIONS;
function parseMeasures(xml) {
    const measureDurations = new Map();
    const measureRegex = /<measure\s+number="(\d+)">([\s\S]*?)<\/measure>/g;
    let m;
    while ((m = measureRegex.exec(xml)) !== null) {
        const measureNum = parseInt(m[1], 10);
        const content = m[2];
        let total = 0;
        const noteDurations = [...content.matchAll(/<note>[\s\S]*?<duration>(\d+)<\/duration>/g)].map((m) => parseInt(m[1], 10));
        const backupDurations = [...content.matchAll(/<backup>[\s\S]*?<duration>(\d+)<\/duration>/g)].map((m) => parseInt(m[1], 10));
        const forwardDurations = [...content.matchAll(/<forward>[\s\S]*?<duration>(\d+)<\/duration>/g)].map((m) => parseInt(m[1], 10));
        total = noteDurations.reduce((a, b) => a + b, 0) - backupDurations.reduce((a, b) => a + b, 0) + forwardDurations.reduce((a, b) => a + b, 0);
        measureDurations.set(measureNum, total);
    }
    return measureDurations;
}
function main() {
    const filePath = process.argv[2];
    if (!filePath || !fs.existsSync(filePath)) {
        return { valid: false, errors: ['File not found'] };
    }
    const xml = fs.readFileSync(filePath, 'utf-8');
    const measures = parseMeasures(xml);
    const errors = [];
    for (const [num, total] of measures) {
        if (total !== MEASURE_DURATION) {
            errors.push(`Measure ${num}: duration sum ${total} != expected ${MEASURE_DURATION}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
const result = main();
if (!result.valid) {
    result.errors.forEach((e) => console.error(`[validateMeasureDurations] ${e}`));
    process.exit(1);
}
process.exit(0);
