"use strict";
/**
 * Run all three acceptance generators.
 * Exit 1 if any fails.
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
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const ROOT = path.resolve(__dirname, '..');
const ENGINES = [
    { name: 'wyble', script: 'wybleAcceptanceGenerate.ts', cwd: path.join(ROOT, 'engines/jimmy-wyble-engine') },
    { name: 'counterpoint', script: 'counterpointAcceptanceGenerate.ts', cwd: path.join(ROOT, 'engines/contemporary-counterpoint-engine') },
    { name: 'ellington', script: 'ellingtonAcceptanceGenerate.ts', cwd: path.join(ROOT, 'engines/ellington-orchestration-engine') },
];
const nodeExe = process.execPath;
const tsNodeBin = path.join(ROOT, 'node_modules/ts-node/dist/bin.js');
const tsconfig = path.join(ROOT, 'tsconfig.json');
let allOk = true;
for (const eng of ENGINES) {
    const scriptPath = path.join(eng.cwd, eng.script);
    console.log(`Running ${eng.name} acceptance...`);
    const r = (0, child_process_1.spawnSync)(nodeExe, [tsNodeBin, '--project', tsconfig, scriptPath], {
        cwd: eng.cwd,
        stdio: 'inherit',
    });
    if (r.status !== 0) {
        allOk = false;
        console.error(`${eng.name} acceptance FAILED`);
    }
}
process.exit(allOk ? 0 : 1);
