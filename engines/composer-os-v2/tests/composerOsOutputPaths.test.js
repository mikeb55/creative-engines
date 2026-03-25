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
exports.runComposerOsOutputPathsTests = runComposerOsOutputPathsTests;
/**
 * Composer OS — output path layout (Mike Composer Files)
 */
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const composerOsOutputPaths_1 = require("../app-api/composerOsOutputPaths");
function runComposerOsOutputPathsTests() {
    const results = [];
    const pass = (name) => results.push({ name, ok: true });
    const fail = (name) => results.push({ name, ok: false });
    const prevEnv = process.env.COMPOSER_OS_OUTPUT_DIR;
    try {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-mike-files-'));
        process.env.COMPOSER_OS_OUTPUT_DIR = tmp;
        const root = (0, composerOsOutputPaths_1.getComposerFilesRoot)();
        if (path.resolve(root) !== path.resolve(tmp))
            fail('getComposerFilesRoot respects env');
        else
            pass('getComposerFilesRoot respects env');
        const gbd = (0, composerOsOutputPaths_1.getOutputDirectoryForPreset)('guitar_bass_duo');
        if (!gbd.endsWith(composerOsOutputPaths_1.PRESET_OUTPUT_SUBFOLDER.guitar_bass_duo))
            fail('guitar_bass_duo subfolder');
        else
            pass('guitar_bass_duo subfolder');
        const bb = (0, composerOsOutputPaths_1.getOutputDirectoryForPreset)('big_band');
        if (!bb.endsWith(composerOsOutputPaths_1.PRESET_OUTPUT_SUBFOLDER.big_band))
            fail('big_band subfolder');
        else
            pass('big_band subfolder');
        const sq = (0, composerOsOutputPaths_1.getOutputDirectoryForPreset)('string_quartet');
        if (!sq.endsWith(composerOsOutputPaths_1.PRESET_OUTPUT_SUBFOLDER.string_quartet))
            fail('string_quartet subfolder');
        else
            pass('string_quartet subfolder');
        const sm = (0, composerOsOutputPaths_1.getOutputDirectoryForPreset)('song_mode');
        if (!sm.endsWith(composerOsOutputPaths_1.PRESET_OUTPUT_SUBFOLDER.song_mode))
            fail('song_mode subfolder');
        else
            pass('song_mode subfolder');
        (0, composerOsOutputPaths_1.ensureOutputDirectoryForPreset)('guitar_bass_duo');
        if (!fs.existsSync(gbd))
            fail('ensureOutputDirectoryForPreset');
        else
            pass('ensureOutputDirectoryForPreset creates folder');
        const xml = path.join(gbd, 'composer_os_test.musicxml');
        const mp = (0, composerOsOutputPaths_1.manifestPathForMusicXml)(xml);
        if (!mp.includes('_meta') || !mp.endsWith('composer_os_test.manifest.json'))
            fail('manifestPathForMusicXml layout');
        else
            pass('manifestPathForMusicXml layout');
        const metaDir = path.join(gbd, '_meta');
        fs.mkdirSync(metaDir, { recursive: true });
        const mf = path.join(metaDir, 'x.manifest.json');
        fs.writeFileSync(mf, '{}', 'utf-8');
        const opened = (0, composerOsOutputPaths_1.normalizeLibraryFolderOpenTarget)(mf);
        if (path.resolve(opened) !== path.resolve(gbd))
            fail('normalizeLibraryFolderOpenTarget strips _meta');
        else
            pass('normalizeLibraryFolderOpenTarget strips _meta');
    }
    catch (e) {
        fail(`composerOsOutputPaths: ${e}`);
    }
    if (prevEnv !== undefined)
        process.env.COMPOSER_OS_OUTPUT_DIR = prevEnv;
    else
        delete process.env.COMPOSER_OS_OUTPUT_DIR;
    return results;
}
