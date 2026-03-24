"use strict";
/**
 * Composer OS V2 — App API: generate composition
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
exports.generateComposition = generateComposition;
const writeOutputManifest_1 = require("./writeOutputManifest");
const runGoldenPath_1 = require("../core/goldenPath/runGoldenPath");
const mapStyleStack_1 = require("./mapStyleStack");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function generateComposition(req, outputDir) {
    const result = (0, runGoldenPath_1.runGoldenPath)(req.seed, {
        styleStack: (0, mapStyleStack_1.mapAppStyleStackToEngine)(req.styleStack),
        presetId: req.presetId,
    });
    const validation = {
        integrityPassed: result.integrityPassed,
        behaviourGatesPassed: result.behaviourGatesPassed,
        mxValidationPassed: result.mxValidationPassed,
        sibeliusSafe: result.sibeliusSafe,
        readiness: result.readiness,
        errors: result.errors,
    };
    let filename;
    let filepath;
    if (result.xml) {
        const ts = new Date().toISOString();
        const tsSafe = ts.replace(/[:.]/g, '-').slice(0, 19);
        filename = `composer_os_${req.presetId}_${tsSafe}.musicxml`;
        fs.mkdirSync(outputDir, { recursive: true });
        filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, result.xml, 'utf-8');
        (0, writeOutputManifest_1.writeOutputManifest)(filepath, {
            presetId: req.presetId,
            styleStack: result.runManifest?.activeModules ?? [],
            seed: req.seed,
            timestamp: ts,
            validation: {
                scoreIntegrity: result.integrityPassed,
                exportIntegrity: result.behaviourGatesPassed,
                behaviourGates: result.behaviourGatesPassed,
                mxValid: result.mxValidationPassed,
                sibeliusSafe: result.sibeliusSafe,
                readinessRelease: result.readiness.release,
                readinessMx: result.readiness.mx,
                shareable: result.readiness.shareable,
                errors: result.errors,
            },
        });
    }
    return {
        success: result.success,
        xml: result.xml,
        filename,
        filepath,
        manifestPath: filepath ? filepath.replace(/\.musicxml$/i, '.manifest.json') : undefined,
        validation,
        runManifest: result.runManifest
            ? {
                seed: result.runManifest.seed,
                presetId: result.runManifest.presetId,
                activeModules: result.runManifest.activeModules,
                timestamp: result.runManifest.timestamp,
            }
            : undefined,
    };
}
