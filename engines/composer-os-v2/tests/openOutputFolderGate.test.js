"use strict";
/**
 * Open output folder: path must stay under composer library root (sync checks only).
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
exports.runOpenOutputFolderGateTests = runOpenOutputFolderGateTests;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const composerOsOutputPaths_1 = require("../app-api/composerOsOutputPaths");
function testInsideSubfolderIsAllowed() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-root-'));
    const inside = path.join(root, 'Guitar-Bass Duos');
    fs.mkdirSync(inside, { recursive: true });
    return (0, composerOsOutputPaths_1.isPathUnderComposerRoot)(root, inside);
}
function testOutsideTreeRejected() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-root-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'other-'));
    return !(0, composerOsOutputPaths_1.isPathUnderComposerRoot)(root, outside);
}
function testRootEqualsComposerRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-root-'));
    return (0, composerOsOutputPaths_1.isPathUnderComposerRoot)(root, root);
}
function testOpenFolderTargetUnwrapsMeta() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coos-root-'));
    const duos = path.join(root, 'Guitar-Bass Duos');
    const meta = path.join(duos, '_meta');
    fs.mkdirSync(meta, { recursive: true });
    const r = (0, composerOsOutputPaths_1.resolveOpenFolderTarget)(root, { path: meta });
    if (!r.ok)
        return false;
    return path.resolve(r.target) === path.resolve(duos);
}
function runOpenOutputFolderGateTests() {
    const results = [];
    const t = (name, fn) => results.push({ name, ok: fn() });
    t('Open folder gate: preset subfolder under root', testInsideSubfolderIsAllowed);
    t('Open folder gate: path outside library rejected', testOutsideTreeRejected);
    t('Open folder gate: composer root equals target', testRootEqualsComposerRoot);
    t('Open folder gate: _meta unwraps to preset folder', testOpenFolderTargetUnwrapsMeta);
    return results;
}
