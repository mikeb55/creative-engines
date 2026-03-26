"use strict";
/**
 * Shared Desktop Runner — Invokes requested engine and generates one demo output.
 *
 * Usage: npx ts-node scripts/run_engine_desktop.ts <engine_name>
 *
 * Engine names: jimmy_wyble, ellington_orchestration, big_band_architecture, contemporary_counterpoint
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
const ENGINE_REGISTRY = {
    jimmy_wyble: {
        script: 'wybleCleanGenerate.ts',
        cwd: path.join(ROOT, 'engines/jimmy-wyble-engine'),
        outputPath: path.join(ROOT, 'outputs/wyble/clean/wyble_clean.musicxml'),
    },
    ellington_orchestration: {
        script: 'ellingtonCleanGenerate.ts',
        cwd: path.join(ROOT, 'engines/ellington-orchestration-engine'),
        outputPath: path.join(ROOT, 'outputs/ellington/clean/ellington_clean.musicxml'),
    },
    big_band_architecture: {
        script: 'architectureDesktopGenerate.ts',
        cwd: path.join(ROOT, 'engines/big-band-architecture-engine'),
        outputPath: path.join(ROOT, 'outputs/architecture'),
    },
    contemporary_counterpoint: {
        script: 'counterpointCleanGenerate.ts',
        cwd: path.join(ROOT, 'engines/contemporary-counterpoint-engine'),
        outputPath: path.join(ROOT, 'outputs/counterpoint/clean/counterpoint_clean.musicxml'),
    },
};
function run_engine(engine_name) {
    const entry = ENGINE_REGISTRY[engine_name];
    if (!entry) {
        console.error(`Unknown engine: ${engine_name}`);
        console.error(`Available: ${Object.keys(ENGINE_REGISTRY).join(', ')}`);
        process.exit(1);
    }
    const scriptPath = path.join(entry.cwd, entry.script);
    console.log(`Running ${engine_name}...`);
    console.log(`  Script: ${scriptPath}`);
    const nodeExe = process.execPath;
    const tsNodeBin = path.join(ROOT, 'node_modules', 'ts-node', 'dist', 'bin.js');
    const tsconfigPath = path.join(entry.cwd, 'tsconfig.json');
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(nodeExe, [tsNodeBin, '--project', tsconfigPath, entry.script], {
            cwd: entry.cwd,
            stdio: 'inherit',
        });
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\n${engine_name}: SUCCESS`);
                resolve();
            }
            else {
                console.error(`\n${engine_name}: FAILED (exit ${code})`);
                reject(new Error(`Engine ${engine_name} exited with code ${code}`));
            }
        });
        child.on('error', (err) => {
            console.error(`\n${engine_name}: ERROR`, err.message);
            reject(err);
        });
    });
}
const engineArg = process.argv[2] || '';
const engineName = engineArg.toLowerCase().replace(/-/g, '_');
if (!engineName) {
    console.error('Usage: npx ts-node scripts/run_engine_desktop.ts <engine_name>');
    console.error('Engines: jimmy_wyble, ellington_orchestration, big_band_architecture, contemporary_counterpoint');
    process.exit(1);
}
run_engine(engineName).catch(() => process.exit(1));
