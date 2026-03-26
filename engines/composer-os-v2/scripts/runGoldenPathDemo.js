"use strict";
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
/**
 * Run golden path demo
 */
const runGoldenPath_1 = require("../core/goldenPath/runGoldenPath");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const result = (0, runGoldenPath_1.runGoldenPath)(42);
console.log('Success:', result.success);
console.log('Integrity passed:', result.integrityPassed);
console.log('Behaviour gates passed:', result.behaviourGatesPassed);
console.log('MX validation passed:', result.mxValidationPassed);
console.log('Sibelius safe:', result.sibeliusSafe);
console.log('Errors:', result.errors);
if (result.xml) {
    console.log('XML length:', result.xml.length);
    const outDir = path.join(__dirname, '..', '..', '..', 'outputs', 'composer-os-v2');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'golden_path_demo.musicxml');
    fs.writeFileSync(outPath, result.xml, 'utf-8');
    console.log('Written:', outPath);
}
