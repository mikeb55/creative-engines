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
exports.PRESET_OUTPUT_SUBFOLDER = exports.getComposerFilesRoot = void 0;
exports.getConfiguredOutputDir = getConfiguredOutputDir;
exports.displayPathForApi = displayPathForApi;
exports.apiGetPresets = apiGetPresets;
exports.apiGetStyleModules = apiGetStyleModules;
exports.apiGenerate = apiGenerate;
exports.apiListOutputs = apiListOutputs;
exports.apiGetOutputDirectory = apiGetOutputDirectory;
exports.apiGetDiagnostics = apiGetDiagnostics;
exports.apiOpenOutputFolder = apiOpenOutputFolder;
/**
 * Shared Composer OS app API logic (HTTP routes + Electron IPC). Single source for engine calls.
 */
const path = __importStar(require("path"));
const getPresets_1 = require("./getPresets");
const getStyleModules_1 = require("./getStyleModules");
const generateComposition_1 = require("./generateComposition");
const listOutputs_1 = require("./listOutputs");
const openOutputFolder_1 = require("./openOutputFolder");
const buildDiagnostics_1 = require("./buildDiagnostics");
const apiErrorMessages_1 = require("./apiErrorMessages");
const composerOsOutputPaths_1 = require("./composerOsOutputPaths");
var composerOsOutputPaths_2 = require("./composerOsOutputPaths");
Object.defineProperty(exports, "getComposerFilesRoot", { enumerable: true, get: function () { return composerOsOutputPaths_2.getComposerFilesRoot; } });
Object.defineProperty(exports, "PRESET_OUTPUT_SUBFOLDER", { enumerable: true, get: function () { return composerOsOutputPaths_2.PRESET_OUTPUT_SUBFOLDER; } });
/** @deprecated use getComposerFilesRoot */
function getConfiguredOutputDir() {
    return (0, composerOsOutputPaths_1.getComposerFilesRoot)();
}
function displayPathForApi(p) {
    const n = path.normalize(p);
    if (process.platform === 'win32')
        return n.replace(/\//g, '\\');
    return n;
}
function apiGetPresets() {
    return { presets: (0, getPresets_1.getPresets)() };
}
function apiGetStyleModules() {
    return { modules: (0, getStyleModules_1.getStyleModules)() };
}
function apiGenerate(body, _composerRoot) {
    try {
        const req_ = {
            presetId: body.presetId ?? 'guitar_bass_duo',
            styleStack: body.styleStack ?? {
                primary: 'barry_harris',
                styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
            },
            seed: typeof body.seed === 'number' ? body.seed : Math.floor(Math.random() * 1e9),
            locks: body.locks,
            title: typeof body.title === 'string' ? body.title : undefined,
            chordProgressionText: typeof body.chordProgressionText === 'string' ? body.chordProgressionText : undefined,
        };
        const presetDir = (0, composerOsOutputPaths_1.ensureOutputDirectoryForPreset)(req_.presetId);
        return (0, generateComposition_1.generateComposition)(req_, presetDir);
    }
    catch (err) {
        return {
            success: false,
            error: (0, apiErrorMessages_1.friendlyGenerateError)(err),
            detail: process.env.NODE_ENV === 'development' ? String(err) : undefined,
        };
    }
}
function apiListOutputs(composerRoot) {
    try {
        return { outputs: (0, listOutputs_1.listOutputs)(composerRoot) };
    }
    catch (err) {
        throw new Error((0, apiErrorMessages_1.friendlyOutputDirError)(err));
    }
}
function apiGetOutputDirectory(composerRoot) {
    const root = (0, composerOsOutputPaths_1.getComposerFilesRoot)();
    return {
        path: root,
        displayPath: displayPathForApi(root),
        presetFolders: { ...composerOsOutputPaths_1.PRESET_OUTPUT_SUBFOLDER },
    };
}
function apiGetDiagnostics(outputDir, activePort) {
    return (0, buildDiagnostics_1.buildDiagnostics)(outputDir, activePort, {
        desktopTransport: activePort === 0 ? 'ipc' : 'http',
    });
}
async function apiOpenOutputFolder(composerRoot, body) {
    const resolved = (0, composerOsOutputPaths_1.resolveOpenFolderTarget)(composerRoot, body);
    if (!resolved.ok) {
        return { success: false, message: resolved.message };
    }
    return (0, openOutputFolder_1.openOutputFolder)(resolved.target);
}
