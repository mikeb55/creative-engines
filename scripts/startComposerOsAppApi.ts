/**
 * Start Composer OS App API server from repo root.
 * Uses root tsconfig (CommonJS) so engine imports resolve correctly.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { getPresets } from '../engines/composer-os-v2/app-api/getPresets';
import { getStyleModules } from '../engines/composer-os-v2/app-api/getStyleModules';
import { generateComposition } from '../engines/composer-os-v2/app-api/generateComposition';
import { listOutputs } from '../engines/composer-os-v2/app-api/listOutputs';
import { openOutputFolder } from '../engines/composer-os-v2/app-api/openOutputFolder';
import { buildDiagnostics } from '../engines/composer-os-v2/app-api/buildDiagnostics';
import { friendlyGenerateError, friendlyOutputDirError } from '../engines/composer-os-v2/app-api/apiErrorMessages';
import type { GenerateRequest } from '../engines/composer-os-v2/app-api/appApiTypes';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', app: 'composer-os' });
});

const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(process.env.COMPOSER_OS_OUTPUT_DIR ?? path.join(REPO_ROOT, 'outputs', 'composer-os-v2'));

function displayPath(p: string): string {
  const n = path.normalize(p);
  if (process.platform === 'win32') return n.replace(/\//g, '\\');
  return n;
}

app.get('/api/presets', (_req: Request, res: Response) => {
  try {
    const presets = getPresets();
    res.json({ presets });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/style-modules', (_req: Request, res: Response) => {
  try {
    const modules = getStyleModules();
    res.json({ modules });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/generate', (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<GenerateRequest>;
    const req_: GenerateRequest = {
      presetId: body.presetId ?? 'guitar_bass_duo',
      styleStack: body.styleStack ?? { primary: 'barry_harris', weights: { primary: 1 } },
      seed: typeof body.seed === 'number' ? body.seed : Math.floor(Math.random() * 1e9),
      locks: body.locks,
    };
    const result = generateComposition(req_, OUTPUT_DIR);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: friendlyGenerateError(err),
      detail: process.env.NODE_ENV === 'development' ? String(err) : undefined,
    });
  }
});

app.get('/api/outputs', (_req: Request, res: Response) => {
  try {
    const outputs = listOutputs(OUTPUT_DIR);
    res.json({ outputs });
  } catch (err) {
    res.status(500).json({ error: friendlyOutputDirError(err) });
  }
});

app.get('/api/output-directory', (_req: Request, res: Response) => {
  res.json({ path: OUTPUT_DIR, displayPath: displayPath(OUTPUT_DIR) });
});

app.get('/api/diagnostics', (_req: Request, res: Response) => {
  try {
    const port = parseInt(process.env.PORT ?? '3001', 10);
    const payload = buildDiagnostics(OUTPUT_DIR, port);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/open-output-folder', (_req: Request, res: Response) => {
  openOutputFolder(OUTPUT_DIR).then((r) => {
    res.json(r);
  });
});

const staticPath = process.env.COMPOSER_OS_STATIC_DIR ?? path.join(REPO_ROOT, 'apps', 'composer-os-app', 'dist');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Composer OS API on http://localhost:${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use (EADDRINUSE). Set PORT to a free port.`);
  } else {
    console.error(err);
  }
});
