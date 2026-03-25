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
exports.PRESET_OUTPUT_SUBFOLDER = exports.MIKE_COMPOSER_FILES_ROOT = void 0;
exports.getUserDocumentsPath = getUserDocumentsPath;
exports.getComposerFilesRoot = getComposerFilesRoot;
exports.getPresetOutputSubfolder = getPresetOutputSubfolder;
exports.expectedPresetFolderName = expectedPresetFolderName;
exports.getOutputDirectoryForPreset = getOutputDirectoryForPreset;
exports.ensureOutputDirectoryForPreset = ensureOutputDirectoryForPreset;
exports.isPathUnderComposerRoot = isPathUnderComposerRoot;
exports.resolveOpenFolderTarget = resolveOpenFolderTarget;
/**
 * Single source of truth for Composer OS user output locations.
 * Default: <Documents>/Mike Composer Files/<preset folder>
 * Override: set COMPOSER_OS_OUTPUT_DIR to replace "Mike Composer Files" root (preset subfolders still apply).
 */
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
exports.MIKE_COMPOSER_FILES_ROOT = 'Mike Composer Files';
/** Preset id → subfolder under the composer files root (exact names requested). */
exports.PRESET_OUTPUT_SUBFOLDER = {
    guitar_bass_duo: 'Guitar-Bass Duos',
    big_band: 'Big-Band Compositions',
    ecm_chamber: 'ECM Chamber Compositions',
    string_quartet: 'String Quartet Compositions',
    song_mode: 'Song Mode Compositions',
};
function getUserDocumentsPath() {
    const home = os.homedir();
    if (process.platform === 'win32') {
        return path.join(home, 'Documents');
    }
    if (process.platform === 'darwin') {
        return path.join(home, 'Documents');
    }
    return path.join(home, 'Documents');
}
/**
 * Root folder (Mike Composer Files). COMPOSER_OS_OUTPUT_DIR replaces this entire root when set.
 */
function getComposerFilesRoot() {
    const env = process.env.COMPOSER_OS_OUTPUT_DIR?.trim();
    if (env) {
        return path.resolve(env);
    }
    return path.join(getUserDocumentsPath(), exports.MIKE_COMPOSER_FILES_ROOT);
}
function getPresetOutputSubfolder(presetId) {
    return exports.PRESET_OUTPUT_SUBFOLDER[presetId] ?? exports.PRESET_OUTPUT_SUBFOLDER.guitar_bass_duo;
}
/** For tests / UI: folder name for a preset id. */
function expectedPresetFolderName(presetId) {
    return getPresetOutputSubfolder(presetId);
}
/** Canonical directory where MusicXML is written (manifests go under `_meta`). */
function getOutputDirectoryForPreset(presetId) {
    const root = getComposerFilesRoot();
    const sub = getPresetOutputSubfolder(presetId);
    return path.join(root, sub);
}
function ensureOutputDirectoryForPreset(presetId) {
    const dir = getOutputDirectoryForPreset(presetId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}
exports.OUTPUT_META_FOLDER = '_meta';
function manifestPathForMusicXml(xmlFilepath) {
    const dir = path.dirname(xmlFilepath);
    const base = path.basename(xmlFilepath).replace(/\.musicxml$/i, '');
    return path.join(dir, exports.OUTPUT_META_FOLDER, `${base}.manifest.json`);
}
function legacyManifestPathForMusicXml(xmlFilepath) {
    return xmlFilepath.replace(/\.musicxml$/i, '.manifest.json');
}
function normalizeLibraryFolderOpenTarget(pathOrFile) {
    let r = path.resolve(pathOrFile);
    try {
        if (fs.existsSync(r) && fs.statSync(r).isFile()) {
            r = path.dirname(r);
        }
    }
    catch {
        /* ignore */
    }
    while (path.basename(r) === exports.OUTPUT_META_FOLDER) {
        const parent = path.dirname(r);
        if (parent === r)
            break;
        r = parent;
    }
    return r;
}
exports.manifestPathForMusicXml = manifestPathForMusicXml;
exports.legacyManifestPathForMusicXml = legacyManifestPathForMusicXml;
exports.normalizeLibraryFolderOpenTarget = normalizeLibraryFolderOpenTarget;
/** Whether `candidate` is the composer root or any preset subfolder under it. */
function isPathUnderComposerRoot(composerRoot, candidate) {
    const r = path.resolve(composerRoot);
    const c = path.resolve(candidate);
    if (c === r)
        return true;
    const prefix = r.endsWith(path.sep) ? r : r + path.sep;
    return c.startsWith(prefix);
}
/**
 * Canonical folder to open for "library" or "this file's folder" (desktop + API).
 * Same rules for IPC, HTTP, and Electron main process.
 */
function resolveOpenFolderTarget(composerRoot, body) {
    let target = path.resolve(composerRoot);
    if (body?.path && typeof body.path === 'string' && body.path.trim()) {
        const resolved = path.resolve(body.path.trim());
        if (!isPathUnderComposerRoot(composerRoot, resolved)) {
            return {
                ok: false,
                message: 'That folder is not part of your Composer OS output library.',
            };
        }
        target = normalizeLibraryFolderOpenTarget(resolved);
        if (!isPathUnderComposerRoot(composerRoot, target)) {
            return {
                ok: false,
                message: 'That folder is not part of your Composer OS output library.',
            };
        }
    }
    return { ok: true, target };
}
