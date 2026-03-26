"use strict";
/**
 * Central path system — single source of truth for all engine outputs.
 * Eliminates scattered paths, last_export.txt, and path guessing.
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
exports.PATHS = exports.ROOT = void 0;
exports.ensureDir = ensureDir;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
exports.ROOT = path.resolve(__dirname, '..', '..');
exports.PATHS = {
    outputs: path.join(exports.ROOT, 'outputs'),
    baseline: path.join(exports.ROOT, 'outputs', 'baseline'),
    wyble: path.join(exports.ROOT, 'outputs', 'wyble'),
    counterpoint: path.join(exports.ROOT, 'outputs', 'counterpoint'),
    ellington: path.join(exports.ROOT, 'outputs', 'ellington'),
};
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
