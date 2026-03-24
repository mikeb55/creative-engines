"use strict";
/**
 * Composer OS V2 — App API: list outputs under Mike Composer Files (preset subfolders)
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
exports.listOutputs = listOutputs;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const composerOsOutputPaths_1 = require("./composerOsOutputPaths");
function readManifest(xmlFilepath) {
    const candidates = [
        (0, composerOsOutputPaths_1.manifestPathForMusicXml)(xmlFilepath),
        (0, composerOsOutputPaths_1.legacyManifestPathForMusicXml)(xmlFilepath),
    ];
    for (const manifestPath of candidates) {
        try {
            if (!fs.existsSync(manifestPath))
                continue;
            const raw = fs.readFileSync(manifestPath, 'utf-8');
            return JSON.parse(raw);
        }
        catch {
            continue;
        }
    }
    return null;
}
/** List all .musicxml outputs under composer root (each preset has its own subfolder). */
function listOutputs(composerRoot) {
    if (!fs.existsSync(composerRoot))
        return [];
    const entries = [];
    const top = fs.readdirSync(composerRoot, { withFileTypes: true });
    for (const d of top) {
        if (d.isDirectory()) {
            const subDir = path.join(composerRoot, d.name);
            collectMusicXmlInDir(subDir, d.name, entries);
        }
        else if (d.isFile() && d.name.toLowerCase().endsWith('.musicxml')) {
            // Legacy flat file at root
            pushEntry(path.join(composerRoot, d.name), '', entries);
        }
    }
    entries.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    return entries;
}
function collectMusicXmlInDir(dir, folderLabel, entries) {
    let dirents;
    try {
        dirents = fs.readdirSync(dir, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const d of dirents) {
        if (!d.isFile())
            continue;
        if (!d.name.toLowerCase().endsWith('.musicxml'))
            continue;
        pushEntry(path.join(dir, d.name), folderLabel, entries);
    }
}
function pushEntry(filepath, presetFolderLabel, entries) {
    const stat = fs.statSync(filepath);
    const manifest = readManifest(filepath);
    const filename = path.basename(filepath);
    entries.push({
        filename,
        filepath,
        presetFolderLabel,
        timestamp: manifest?.timestamp ?? stat.mtime?.toISOString() ?? '',
        presetId: manifest?.presetId ?? 'guitar_bass_duo',
        styleStack: manifest?.styleStack ?? ['barry_harris'],
        seed: manifest?.seed ?? 0,
        validation: manifest?.validation ?? {
            scoreIntegrity: false,
            exportIntegrity: false,
            behaviourGates: false,
            mxValid: false,
            strictBarMath: false,
            exportRoundTrip: false,
            instrumentMetadata: false,
            sibeliusSafe: false,
            readinessRelease: 0,
            readinessMx: 0,
            shareable: false,
            errors: [],
        },
    });
}
