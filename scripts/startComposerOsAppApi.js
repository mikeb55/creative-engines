"use strict";
/**
 * Start Composer OS App API server from repo root.
 * Uses root tsconfig (CommonJS) so engine imports resolve correctly.
 *
 * Plain `node` cannot resolve `composerOsApiCore.ts` without ts-node; there is no
 * duplicate `composerOsApiCore.js` (avoids stale JS shadowing the TS source).
 */
require("ts-node/register");
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const composerOsApiCore_1 = require("../engines/composer-os-v2/app-api/composerOsApiCore.ts");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: 'composer-os' });
});
const OUTPUT_DIR = (0, composerOsApiCore_1.getComposerFilesRoot)();
process.env.COMPOSER_OS_OUTPUT_DIR = OUTPUT_DIR;
app.get('/api/presets', (_req, res) => {
    try {
        res.json((0, composerOsApiCore_1.apiGetPresets)());
    }
    catch (err) {
        res.status(500).json({ error: String(err) });
    }
});
app.get('/api/style-modules', (_req, res) => {
    try {
        res.json((0, composerOsApiCore_1.apiGetStyleModules)());
    }
    catch (err) {
        res.status(500).json({ error: String(err) });
    }
});
app.post('/api/generate', (req, res) => {
    try {
        const body = req.body;
        const result = (0, composerOsApiCore_1.apiGenerate)(body, OUTPUT_DIR);
        if ('error' in result && !('validation' in result)) {
            res.status(500).json(result);
            return;
        }
        res.json(result);
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: String(err),
            detail: process.env.NODE_ENV === 'development' ? String(err) : undefined,
        });
    }
});
app.get('/api/outputs', (_req, res) => {
    try {
        res.json((0, composerOsApiCore_1.apiListOutputs)(OUTPUT_DIR));
    }
    catch (err) {
        res.status(500).json({ error: String(err) });
    }
});
app.get('/api/output-directory', (_req, res) => {
    res.json((0, composerOsApiCore_1.apiGetOutputDirectory)(OUTPUT_DIR));
});
app.get('/api/diagnostics', (_req, res) => {
    try {
        const port = parseInt(process.env.PORT ?? '3001', 10);
        res.json((0, composerOsApiCore_1.apiGetDiagnostics)(OUTPUT_DIR, port));
    }
    catch (err) {
        res.status(500).json({ error: String(err) });
    }
});
app.post('/api/open-output-folder', (req, res) => {
    (0, composerOsApiCore_1.apiOpenOutputFolder)(OUTPUT_DIR, req.body).then((r) => {
        res.json(r);
    });
});
const staticPath = process.env.COMPOSER_OS_STATIC_DIR ?? path.join(path.resolve(__dirname, '..'), 'apps', 'composer-os-app', 'dist');
if (fs.existsSync(staticPath)) {
    app.use(express_1.default.static(staticPath));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(staticPath, 'index.html'));
    });
}
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`Composer OS API on http://localhost:${PORT}`);
});
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} already in use (EADDRINUSE). Set PORT to a free port.`);
    }
    else {
        console.error(err);
    }
});
