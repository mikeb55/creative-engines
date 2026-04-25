/**
 * Start Composer OS App API server from repo root.
 * Uses root tsconfig (CommonJS) so engine imports resolve correctly.
 *
 * `startComposerOsAppApi.js` is kept for `node scripts/startComposerOsAppApi.js`; it registers
 * ts-node and requires `composerOsApiCore.ts` explicitly so no stale `composerOsApiCore.js` is needed.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import {
  getComposerFilesRoot,
  apiGetPresets,
  apiGetStyleModules,
  apiGenerate,
  apiListOutputs,
  apiGetOutputDirectory,
  apiGetDiagnostics,
  apiOpenOutputFolder,
  apiSystemCheck,
} from '../engines/composer-os-v2/app-api/composerOsApiCore';
import type { GenerateRequest } from '../engines/composer-os-v2/app-api/appApiTypes';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use((err: unknown, _req: Request, res: Response, next: (e?: unknown) => void) => {
  const e = err as { status?: number; type?: string };
  if (e?.status === 413 || e?.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      error: 'LeadSheet MusicXML is too large for the current web request limit.',
    });
    return;
  }
  next(err);
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', app: 'composer-os' });
});

const OUTPUT_DIR = getComposerFilesRoot();
process.env.COMPOSER_OS_OUTPUT_DIR = OUTPUT_DIR;

app.get('/api/presets', (_req: Request, res: Response) => {
  try {
    res.json(apiGetPresets());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/style-modules', (_req: Request, res: Response) => {
  try {
    res.json(apiGetStyleModules());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/generate', (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<GenerateRequest>;
    const result = apiGenerate(body, OUTPUT_DIR);
    if ('error' in result && !('validation' in result)) {
      res.status(500).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: String(err),
      detail: process.env.NODE_ENV === 'development' ? String(err) : undefined,
    });
  }
});

app.get('/api/outputs', (_req: Request, res: Response) => {
  try {
    res.json(apiListOutputs(OUTPUT_DIR));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/output-directory', (_req: Request, res: Response) => {
  res.json(apiGetOutputDirectory(OUTPUT_DIR));
});

app.get('/api/diagnostics', (_req: Request, res: Response) => {
  try {
    const port = parseInt(process.env.PORT ?? '3001', 10);
    res.json(apiGetDiagnostics(OUTPUT_DIR, port));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const postOpenOutputFolder = (req: Request, res: Response) => {
  apiOpenOutputFolder(OUTPUT_DIR, req.body as { path?: string })
    .then((r) => {
      if (!r.success) {
        console.error('[Library API] POST /api/open-output-folder → JSON fail:', r.message ?? r);
      }
      res.json(r);
    })
    .catch((err: unknown) => {
      console.error('[Library API] /api/open-output-folder exception:', err);
      res.status(500).json({ success: false, message: err instanceof Error ? err.message : String(err) });
    });
};
app.post('/api/open-output-folder', postOpenOutputFolder);
/** Alias for clients/docs that expect a `/library/`-shaped path; same handler as `open-output-folder`. */
app.post('/api/library/open-folder', postOpenOutputFolder);

app.post('/api/system-check', async (_req: Request, res: Response) => {
  try {
    const r = await apiSystemCheck();
    if ('blocked' in r && r.blocked) {
      res.status(403).json(r);
      return;
    }
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const staticPath = process.env.COMPOSER_OS_STATIC_DIR ?? path.join(path.resolve(__dirname, '..'), 'apps', 'composer-os-app', 'dist');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

const PORT = parseInt(process.env.PORT ?? '3001', 10);

/**
 * Bind 0.0.0.0 in dev: on Windows, `localhost` in the Vite proxy / Node can resolve to IPv6 (::1)
 * first while this server previously listened on IPv4 only (127.0.0.1) — intermittent ECONNREFUSED
 * on `/api` and confusing “web broken / curl works” reports. CORS is already open for dev.
 * Override: COMPOSER_OS_API_BIND=127.0.0.1 to lock to loopback v4 only.
 */
const listenHost = (process.env.COMPOSER_OS_API_BIND ?? '0.0.0.0').trim() || '0.0.0.0';
const server = app.listen(PORT, listenHost, () => {
  console.log(
    `Composer OS API on http://127.0.0.1:${PORT} (bind host=${listenHost})`
  );
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use (EADDRINUSE). Set PORT to a free port.`);
  } else {
    console.error(err);
  }
});
