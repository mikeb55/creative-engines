"use strict";
/**
 * Open a directory in the OS file manager (Explorer / Finder / xdg-open).
 * Electron desktop uses shell.openPath in main process; this path is for Node/HTTP.
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
exports.ensureFolderForOpen = ensureFolderForOpen;
exports.openOutputFolder = openOutputFolder;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/** Ensure folder exists and is readable/writable; shared with Electron main. */
function ensureFolderForOpen(outputDir) {
    const dir = path.resolve(outputDir);
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    catch (e) {
        return {
            ok: false,
            message: `Composer OS could not create or access the output folder. Check disk space and permissions. (${String(e)})`,
        };
    }
    if (!fs.existsSync(dir)) {
        return {
            ok: false,
            message: 'The output folder does not exist and could not be created.',
        };
    }
    try {
        fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
    }
    catch {
        return {
            ok: false,
            message: 'The output folder exists but is not writable. Choose another location or fix folder permissions.',
        };
    }
    return { ok: true, path: dir };
}
function openOutputFolder(outputDir) {
    return new Promise((resolve) => {
        const prep = ensureFolderForOpen(outputDir);
        if (!prep.ok) {
            resolve({ success: false, message: prep.message });
            return;
        }
        const dir = prep.path;
        if (process.platform === 'win32') {
            const child = (0, child_process_1.spawn)('explorer.exe', [dir], {
                detached: true,
                stdio: 'ignore',
                windowsHide: true,
            });
            child.once('error', () => resolve({
                success: false,
                message: 'Could not open File Explorer for the output folder.',
            }));
            child.once('spawn', () => {
                child.unref();
                resolve({ success: true, openedPath: dir });
            });
            return;
        }
        if (process.platform === 'darwin') {
            const child = (0, child_process_1.spawn)('open', [dir], { detached: true, stdio: 'ignore' });
            child.once('error', () => resolve({
                success: false,
                message: 'Could not open Finder for the output folder.',
            }));
            child.once('spawn', () => {
                child.unref();
                resolve({ success: true, openedPath: dir });
            });
            return;
        }
        const child = (0, child_process_1.spawn)('xdg-open', [dir], { detached: true, stdio: 'ignore' });
        child.once('error', () => resolve({
            success: false,
            message: 'Could not open the file manager for the output folder.',
        }));
        child.once('spawn', () => {
            child.unref();
            resolve({ success: true, openedPath: dir });
        });
    });
}
