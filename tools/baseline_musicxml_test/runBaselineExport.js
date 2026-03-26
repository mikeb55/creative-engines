"use strict";
/**
 * Run baseline export and validation.
 * Uses PATHS. Output: outputs/baseline/baseline_test.musicxml
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
const paths_1 = require("../../engines/core/paths");
const baselineMusicXMLWriter_1 = require("./baselineMusicXMLWriter");
const XML_PATH = path.join(paths_1.PATHS.baseline, 'baseline_test.musicxml');
const REPORT_PATH = path.join(paths_1.PATHS.baseline, 'validation_report.json');
function validate() {
    const errors = [];
    let fileExists = false;
    let fileSize = 0;
    let xmlWellFormed = false;
    let measureCount = 0;
    let measuresValid = false;
    const expectedDivisions = 16;
    if (!fs.existsSync(XML_PATH)) {
        errors.push('File does not exist');
        return {
            fileExists: false,
            fileSize: 0,
            xmlWellFormed: false,
            measureCount: 0,
            measuresValid: false,
            divisionsPerMeasure: 0,
            expectedDivisions,
            errors,
            passed: false,
        };
    }
    fileExists = true;
    const stat = fs.statSync(XML_PATH);
    fileSize = stat.size;
    if (fileSize <= 0) {
        errors.push('File size is 0');
    }
    const text = fs.readFileSync(XML_PATH, 'utf8');
    const measureMatches = text.match(/<measure/g);
    measureCount = measureMatches ? measureMatches.length : 0;
    if (measureCount !== 8) {
        errors.push(`Expected 8 measures, found ${measureCount}`);
    }
    const divisionsMatch = text.match(/<divisions>(\d+)<\/divisions>/);
    const divisions = divisionsMatch ? parseInt(divisionsMatch[1], 10) : 0;
    const divisionsPerMeasure = divisions * 4;
    measuresValid = divisions === 4 && divisionsPerMeasure === expectedDivisions;
    if (!measuresValid && divisions > 0) {
        errors.push(`Expected ${expectedDivisions} divisions/measure (divisions=4), got ${divisionsPerMeasure}`);
    }
    const noteCount = (text.match(/<note>/g) || []).length;
    if (noteCount !== 32) {
        errors.push(`Expected 32 notes, found ${noteCount}`);
    }
    if (!text.includes('</score-partwise>')) {
        errors.push('Missing closing score-partwise tag');
    }
    if (!text.includes('<part id="P1">')) {
        errors.push('Missing part P1');
    }
    xmlWellFormed = errors.length === 0 || (fileExists && measureCount === 8 && noteCount === 32);
    return {
        fileExists,
        fileSize,
        xmlWellFormed: measureCount === 8 && noteCount === 32 && text.includes('</score-partwise>'),
        measureCount,
        measuresValid: divisions === 4 && measureCount === 8,
        divisionsPerMeasure: divisions * 4,
        expectedDivisions,
        errors,
        passed: fileExists && fileSize > 0 && measureCount === 8 && divisions === 4 && noteCount === 32 && errors.length === 0,
    };
}
function main() {
    (0, paths_1.ensureDir)(paths_1.PATHS.baseline);
    const xml = (0, baselineMusicXMLWriter_1.writeBaselineMusicXML)();
    fs.writeFileSync(XML_PATH, xml, 'utf8');
    const report = validate();
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    const runLog = {
        outputPath: XML_PATH,
        fileExists: fs.existsSync(XML_PATH),
        timestamp: new Date().toISOString(),
        validationPassed: report.passed,
    };
    fs.writeFileSync(path.join(paths_1.PATHS.baseline, 'run_log.json'), JSON.stringify(runLog, null, 2), 'utf8');
    console.log('Baseline export complete.');
    console.log('Output:', XML_PATH);
    console.log('Validation:', report.passed ? 'PASSED' : 'FAILED');
    console.log('Report:', REPORT_PATH);
    if (!report.passed) {
        console.error('Errors:', report.errors);
        process.exit(1);
    }
}
main();
