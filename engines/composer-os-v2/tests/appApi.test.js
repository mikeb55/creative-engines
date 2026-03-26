"use strict";
/**
 * Composer OS V2 — App API tests
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
exports.runAppApiTests = runAppApiTests;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const getPresets_1 = require("../app-api/getPresets");
const getStyleModules_1 = require("../app-api/getStyleModules");
const generateComposition_1 = require("../app-api/generateComposition");
const listOutputs_1 = require("../app-api/listOutputs");
const buildDiagnostics_1 = require("../app-api/buildDiagnostics");
const apiErrorMessages_1 = require("../app-api/apiErrorMessages");
const composerOsOutputPaths_1 = require("../app-api/composerOsOutputPaths");
const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEST_OUTPUT_DIR = path.join(REPO_ROOT, 'outputs', 'composer-os-v2-test');
function runAppApiTests() {
    const results = [];
    const pass = (name) => results.push({ name, ok: true });
    const fail = (name) => results.push({ name, ok: false });
    const prevEnv = process.env.COMPOSER_OS_OUTPUT_DIR;
    process.env.COMPOSER_OS_OUTPUT_DIR = TEST_OUTPUT_DIR;
    const TEST_GBD_DIR = (0, composerOsOutputPaths_1.getOutputDirectoryForPreset)('guitar_bass_duo');
    try {
        const presets = (0, getPresets_1.getPresets)();
        if (presets.length < 1)
            fail('Preset loading: non-empty list');
        else if (!presets.some((p) => p.id === 'guitar_bass_duo'))
            fail('Preset loading: guitar_bass_duo exists');
        else if (!presets.some((p) => p.supported))
            fail('Preset loading: at least one supported');
        else
            pass('Preset loading');
    }
    catch (e) {
        fail(`Preset loading: ${e}`);
    }
    try {
        const modules = (0, getStyleModules_1.getStyleModules)();
        if (modules.length < 4)
            fail('Style module loading: four modules from registry');
        else if (!modules.every((m) => m.enabled))
            fail('Style module loading: enabled');
        else if (!['barry_harris', 'metheny', 'triad_pairs', 'bacharach'].every((id) => modules.some((m) => m.id === id)))
            fail('Style module loading: barry_harris, metheny, triad_pairs, bacharach');
        else
            pass('Style module loading');
    }
    catch (e) {
        fail(`Style module loading: ${e}`);
    }
    try {
        if ((0, composerOsOutputPaths_1.expectedPresetFolderName)('guitar_bass_duo') !== 'Guitar-Bass Duos')
            fail('Preset folder mapping');
        else
            pass('Preset folder mapping');
    }
    catch (e) {
        fail(`Preset folder mapping: ${e}`);
    }
    try {
        fs.mkdirSync(TEST_GBD_DIR, { recursive: true });
        const result = (0, generateComposition_1.generateComposition)({
            presetId: 'guitar_bass_duo',
            styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
            seed: 999,
        }, TEST_GBD_DIR);
        if (!result.success)
            fail('Generation request: success');
        else if (!result.validation)
            fail('Generation request: validation present');
        else if (!result.manifestPath?.endsWith('.manifest.json'))
            fail('Generation request: manifest path');
        else if (!result.manifestPath?.includes('_meta'))
            fail('Generation request: manifest under _meta');
        else if (result.manifestPath !== (0, composerOsOutputPaths_1.manifestPathForMusicXml)(result.filepath))
            fail('Generation request: manifest path helper');
        else if (!fs.existsSync(result.manifestPath))
            fail('Generation request: manifest on disk');
        else if (!result.filepath?.includes('Guitar-Bass Duos'))
            fail('Generation request: file under preset folder');
        else
            pass('Generation request');
    }
    catch (e) {
        fail(`Generation request: ${e}`);
    }
    try {
        const outputs = (0, listOutputs_1.listOutputs)(TEST_OUTPUT_DIR);
        if (outputs.length < 1)
            fail('Output listing: at least one output');
        else if (!outputs[0].filename?.endsWith('.musicxml'))
            fail('Output listing: musicxml suffix');
        else if (!outputs[0].presetFolderLabel)
            fail('Output listing: preset folder label');
        else if (outputs.some((o) => o.filepath.includes('_meta')))
            fail('Output listing: no paths inside _meta');
        else
            pass('Output listing');
    }
    catch (e) {
        fail(`Output listing: ${e}`);
    }
    try {
        const result = (0, generateComposition_1.generateComposition)({
            presetId: 'guitar_bass_duo',
            styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
            seed: 888,
        }, TEST_GBD_DIR);
        const v = result.validation;
        if (!v)
            fail('Validation summary: present');
        else if (typeof v.readiness?.release !== 'number')
            fail('Validation summary: readiness.release');
        else
            pass('Validation summary');
    }
    catch (e) {
        fail(`Validation summary: ${e}`);
    }
    try {
        const result = (0, generateComposition_1.generateComposition)({
            presetId: 'guitar_bass_duo',
            styleStack: { primary: 'metheny', weights: { primary: 1 } },
            seed: 5555,
        }, TEST_GBD_DIR);
        const am = result.runManifest?.activeModules ?? [];
        if (am[0] !== 'metheny' || am.length !== 1)
            fail('Generation: requested primary in manifest');
        else
            pass('Generation: style stack from request');
    }
    catch (e) {
        fail(`Generation: style stack from request: ${e}`);
    }
    try {
        const diagDir = path.join(REPO_ROOT, 'outputs', 'composer-os-v2-test-diag');
        fs.mkdirSync(diagDir, { recursive: true });
        const d = (0, buildDiagnostics_1.buildDiagnostics)(diagDir, 3001);
        if (d.appName !== 'Composer OS')
            fail('Diagnostics payload: app name');
        else if (d.activePort !== 3001)
            fail('Diagnostics payload: port');
        else if (!path.isAbsolute(d.outputDirectory))
            fail('Diagnostics payload: canonical output');
        else if (!d.styleModules?.length || d.styleModules.length < 3)
            fail('Diagnostics payload: styleModules');
        else
            pass('Diagnostics payload');
        fs.rmSync(diagDir, { recursive: true, force: true });
    }
    catch (e) {
        fail(`Diagnostics payload: ${e}`);
    }
    try {
        fs.mkdirSync(TEST_GBD_DIR, { recursive: true });
        const runs = 5;
        for (let i = 0; i < runs; i++) {
            const result = (0, generateComposition_1.generateComposition)({
                presetId: 'guitar_bass_duo',
                styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
                seed: 7000 + i,
            }, TEST_GBD_DIR);
            if (!result.success)
                fail(`Multi-run smoke: success run ${i}`);
            else if (!result.filepath)
                fail(`Multi-run smoke: filepath run ${i}`);
            else if (typeof result.validation?.readiness?.release !== 'number')
                fail(`Multi-run smoke: readiness run ${i}`);
            else {
                const manifestPath = result.manifestPath ?? (0, composerOsOutputPaths_1.manifestPathForMusicXml)(result.filepath);
                if (!fs.existsSync(manifestPath))
                    fail(`Multi-run smoke: manifest run ${i}`);
            }
        }
        pass('Multi-run smoke (5)');
    }
    catch (e) {
        fail(`Multi-run smoke: ${e}`);
    }
    try {
        fs.mkdirSync(TEST_GBD_DIR, { recursive: true });
        const a = (0, generateComposition_1.generateComposition)({
            presetId: 'guitar_bass_duo',
            styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
            seed: 111111111,
        }, TEST_GBD_DIR);
        const b = (0, generateComposition_1.generateComposition)({
            presetId: 'guitar_bass_duo',
            styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
            seed: 222222222,
        }, TEST_GBD_DIR);
        if (!a.filepath || !b.filepath)
            fail('Try Another filenames: paths present');
        else if (a.filepath === b.filepath)
            fail('Try Another filenames: different seed → different file');
        else if (!b.filename?.includes('222222222'))
            fail('Try Another filenames: seed in filename');
        else
            pass('Try Another filenames: distinct paths per seed');
    }
    catch (e) {
        fail(`Try Another filenames: ${e}`);
    }
    try {
        const msg = (0, apiErrorMessages_1.friendlyGenerateError)(new Error('EACCES: permission denied'));
        if (msg.length < 10 || !msg.toLowerCase().includes('folder'))
            fail('Friendly error: message');
        else
            pass('Friendly error messages');
    }
    catch (e) {
        fail(`Friendly error messages: ${e}`);
    }
    // Cleanup test outputs
    try {
        if (fs.existsSync(TEST_OUTPUT_DIR)) {
            fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
        }
    }
    catch {
        // ignore
    }
    if (prevEnv !== undefined)
        process.env.COMPOSER_OS_OUTPUT_DIR = prevEnv;
    else
        delete process.env.COMPOSER_OS_OUTPUT_DIR;
    return results;
}
